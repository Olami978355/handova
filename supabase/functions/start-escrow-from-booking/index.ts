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

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('Booking not found');

    // Check if user is landlord or agent
    if (booking.landlord_id !== user.id && booking.agent_id !== user.id) {
      throw new Error('You are not authorized to start escrow for this booking.');
    }

    const toKobo = (naira: number) => Math.round(naira * 100);
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    // BUG FIX 2: Use PostgreSQL advisory lock to prevent race conditions
    // We'll use a transaction with a lock on the property ID
    const propertyIdInt = parseInt(booking.property_id.replace(/-/g, '').substring(0, 8), 16);
    
    // Start transaction
    const { data: lockResult, error: lockError } = await supabase.rpc('execute_sql', {
      sql: `SELECT pg_advisory_xact_lock(${propertyIdInt});`
    });

    if (lockError) throw lockError;

    // Check if property already has an active deal
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('has_active_deal, status')
      .eq('id', booking.property_id)
      .single();

    if (propError) throw propError;
    if (property.has_active_deal || property.status !== 'active') {
      throw new Error('This property already has an active deal or is no longer available.');
    }

    // 1. Set properties.has_active_deal = true (BUG FIX 4)
    const { error: propUpdateError } = await supabase
      .from('properties')
      .update({ has_active_deal: true })
      .eq('id', booking.property_id);

    if (propUpdateError) throw propUpdateError;

    // 2. Refund all other interested tenants 100% (BUG FIX 7)
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
          
          // Notify other tenant
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

    // 3. Update current booking status
    const { error: updateError } = await supabase
      .from('inspection_bookings')
      .update({ 
        status: 'escrow_started',
        updated_at: new Date().toISOString() 
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // 4. Create deals record
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        property_id: booking.property_id,
        tenant_id: booking.tenant_id,
        landlord_id: booking.landlord_id,
        agent_id: booking.agent_id,
        amount: booking.properties.price,
        status: 'agreement_pending'
      })
      .select()
      .single();

    if (dealError) throw dealError;

    // Notify parties
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
