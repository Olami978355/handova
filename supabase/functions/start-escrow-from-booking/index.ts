import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Authentication failed');

    const { bookingId } = await req.json();

    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('Booking not found');

    if (booking.landlord_id !== user.id && booking.agent_id !== user.id) {
      throw new Error('You are not authorized to start escrow for this booking.');
    }

    const toKobo = (naira: number) => Math.round(naira * 100);
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    // Advisory lock to prevent race conditions on this property
    const propertyIdInt = parseInt(booking.property_id.replace(/-/g, '').substring(0, 8), 16);
    const { error: lockError } = await supabase.rpc('execute_sql', {
      sql: `SELECT pg_advisory_xact_lock(${propertyIdInt});`
    });
    if (lockError) throw lockError;

    // Active-deal check: status-based, not a has_active_deal column (doesn't
    // exist on properties). Any deal on this property that isn't
    // funds_released counts as still active and blocks a new one.
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('status')
      .eq('id', booking.property_id)
      .single();
    if (propError) throw propError;

    const { data: existingDeals, error: existingError } = await supabase
      .from('deals')
      .select('id')
      .eq('property_id', booking.property_id)
      .neq('status', 'funds_released');
    if (existingError) throw existingError;

    if ((existingDeals && existingDeals.length > 0) || property.status !== 'active') {
      throw new Error('This property already has an active deal or is no longer available.');
    }

    // Refund all other interested tenants 100%
    const { data: otherBookings, error: othersError } = await supabase
      .from('inspection_bookings')
      .select('*')
      .eq('property_id', booking.property_id)
      .eq('status', 'tenant_interested')
      .neq('id', bookingId);
    if (othersError) throw othersError;

    for (const other of otherBookings) {
      try {
        const refundAmountKobo = toKobo(other.inspection_fee);
        const refundResponse = await fetch('https://api.paystack.co/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${paystackSecret}`,
          },
          body: JSON.stringify({
            transaction: other.paystack_reference,
            amount: refundAmountKobo,
          }),
        });
        const refundData = await refundResponse.json();
        if (refundResponse.ok) {
          await supabase
            .from('inspection_bookings')
            .update({
              status: 'refunded',
              refund_percentage: 100,
              refund_amount: other.inspection_fee,
              paystack_refund_reference: refundData.data.reference,
              notes: 'Refunded because property has active deal with another tenant.',
              updated_at: new Date().toISOString()
            })
            .eq('id', other.id);

          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              user_ids: [other.tenant_id],
              title: 'Property Unavailable',
              body: `The property ${booking.properties.title} has been taken by another tenant. You have been issued a 100% refund.`,
              link: `/dashboard/bookings`,
              type: 'info',
            }),
          });
        }
      } catch (err) {
        console.error(`Failed to refund booking ${other.id}:`, err);
      }
    }

    const { error: updateError } = await supabase
      .from('inspection_bookings')
      .update({
        status: 'escrow_started',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);
    if (updateError) throw updateError;

    // Deal creation — platform_fee, agent_fee, landlord_payout are all
    // NOT NULL columns, must be computed here, same pattern used in
    // respond-to-deal-offer.
    const isAgent = !!booking.agent_id;
    // Agent commission only applies when the agent is managing on behalf of
    // a genuinely separate landlord — if the agent IS the landlord on this
    // booking (self-listed property, no distinct owner), there's nobody to
    // pay that 10% to, so it must not be deducted from their own payout.
    const hasDistinctLandlord = isAgent && !!booking.landlord_id && booking.landlord_id !== booking.agent_id;
    const amount = booking.properties.price;
    const platformFee = Math.round(amount * 0.02);
    const agentFee = hasDistinctLandlord ? Math.round(amount * 0.10) : 0;
    const landlordPayout = amount - platformFee - agentFee;

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        property_id: booking.property_id,
        tenant_id: booking.tenant_id,
        landlord_id: booking.landlord_id,
        agent_id: booking.agent_id,
        amount,
        listed_amount: amount,
        platform_fee: platformFee,
        agent_fee: agentFee,
        agent_commission_rate: isAgent ? 10 : 0,
        landlord_payout: landlordPayout,
        deal_type: booking.properties.transaction_type === 'sell'
          ? (booking.properties.listing_type === 'land' ? 'land_sale' : 'house_sale')
          : (booking.properties.listing_type === 'land' ? 'land_rent' : 'house_rent'),
        is_custom_deal: false,
        status: 'agreement_draft',
      })
      .select()
      .single();

    if (dealError) throw dealError;

    const parties = [booking.tenant_id, booking.landlord_id];
    if (booking.agent_id) parties.push(booking.agent_id);

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        user_ids: parties,
        title: 'Escrow Started',
        body: `An escrow deal has started for ${booking.properties.title}. Please review the agreement.`,
        link: `/deals/${deal.id}`,
        type: 'deal_state_change',
      }),
    });

    return new Response(JSON.stringify({ success: true, dealId: deal.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Start escrow error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
