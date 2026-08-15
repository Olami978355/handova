import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders, sendEmail } from '../_shared/utils.ts';

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      throw new Error('You are not authorized to resolve disputes.');
    }

    // refundTenant: does the tenant get their money back, independent of fault.
    // atFaultPartyId: 'landlord' | 'agent' | null. null means no strike issued —
    // covers genuine misunderstandings where a refund may still be warranted
    // without blaming anyone.
    const { bookingId, resolution, refundTenant, atFaultPartyId } = await req.json();

    if (typeof refundTenant !== 'boolean') {
      throw new Error('refundTenant (boolean) is required.');
    }
    if (atFaultPartyId !== null && atFaultPartyId !== 'landlord' && atFaultPartyId !== 'agent') {
      throw new Error("atFaultPartyId must be 'landlord', 'agent', or null.");
    }

    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*), tenant:profiles!tenant_id(full_name, email), landlord:profiles!landlord_id(full_name, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('Booking not found');

    if (atFaultPartyId === 'agent' && !booking.agent_id) {
      throw new Error('This booking has no agent — cannot assign fault to an agent that does not exist on it.');
    }

    const toKobo = (naira: number) => Math.round(naira * 100);
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    // 1. Issue a strike independently of the refund decision.
    if (atFaultPartyId) {
      const struckUserId = atFaultPartyId === 'agent' ? booking.agent_id : booking.landlord_id;
      const { error: strikeError } = await supabase.rpc('add_strike_and_check', {
        p_user_id: struckUserId,
        p_reason: `Dispute on booking ${bookingId}: ${resolution}`,
        p_related_type: 'inspection_booking',
        p_related_id: bookingId,
      });
      if (strikeError) throw strikeError;
    }

    // 2. Process the refund independently, if requested.
    let refundAmount = 0;
    let refundReference: string | null = null;
    if (refundTenant) {
      const refundAmountKobo = toKobo(booking.inspection_fee);
      const refundResponse = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paystackSecret}`,
        },
        body: JSON.stringify({
          transaction: booking.paystack_reference,
          amount: refundAmountKobo,
        }),
      });
      const refundData = await refundResponse.json();
      if (!refundResponse.ok) {
        throw new Error(`Paystack refund failed: ${refundData.message}`);
      }
      refundAmount = booking.inspection_fee;
      refundReference = refundData.data.reference;
    }

    const faultLabel = atFaultPartyId ? `${atFaultPartyId} at fault` : 'no fault assigned';
    const { error: updateError } = await supabase
      .from('inspection_bookings')
      .update({
        status: 'dispute_resolved',
        refund_percentage: refundTenant ? 100 : 0,
        refund_amount: refundAmount,
        paystack_refund_reference: refundReference,
        notes: `Dispute resolved. ${faultLabel}. Refund issued: ${refundTenant}. ${resolution}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    const parties = [booking.tenant_id, booking.landlord_id];
    if (booking.agent_id) parties.push(booking.agent_id);

    const summaryMessage = `The dispute for ${booking.properties.title} has been resolved. ${refundTenant ? 'A refund was issued.' : 'No refund was issued.'} Resolution: ${resolution}`;

    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getServiceRoleKey()}`,
      },
      body: JSON.stringify({
        user_ids: parties,
        title: 'Dispute Resolved',
        body: summaryMessage,
        link: `/dashboard/bookings`,
        type: 'info',
      }),
    });

    if (booking.tenant?.email) {
      await sendEmail(
        booking.tenant.email,
        'Dispute Resolved - Handova',
        'dispute',
        {
          name: booking.tenant.full_name,
          propertyTitle: booking.properties.title,
          status: 'Resolved',
          message: summaryMessage,
          link: `https://handova.ng/dashboard`,
        }
      );
    }
    if (booking.landlord?.email) {
      await sendEmail(
        booking.landlord.email,
        'Dispute Resolved - Handova',
        'dispute',
        {
          name: booking.landlord.full_name,
          propertyTitle: booking.properties.title,
          status: 'Resolved',
          message: summaryMessage,
          link: `https://handova.ng/dashboard`,
        }
      );
    }

    return new Response(JSON.stringify({ success: true, refundAmount, atFaultPartyId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
