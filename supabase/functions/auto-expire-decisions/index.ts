import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const toKobo = (naira: number) => Math.round(naira * 100);
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    // Find all expired decisions
    const now = new Date().toISOString();
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*)')
      .eq('status', 'inspection_done')
      .lt('tenant_decision_deadline', now);

    if (fetchError) throw fetchError;

    const results = [];

    for (const booking of expiredBookings || []) {
      try {
        // BUG FIX 7: Atomic update and refund
        // Use a lock on the booking ID
        const bookingIdInt = parseInt(booking.id.replace(/-/g, '').substring(0, 8), 16);
        await supabase.rpc('execute_sql', {
          sql: `SELECT pg_advisory_xact_lock(${bookingIdInt});`
        });

        // Re-check status
        const { data: currentBooking } = await supabase
          .from('inspection_bookings')
          .select('status')
          .eq('id', booking.id)
          .single();

        if (currentBooking?.status !== 'inspection_done') continue;

        // Trigger 70% refund
        const refundPercentage = 70;
        const refundAmount = booking.inspection_fee * (refundPercentage / 100);
        const refundAmountKobo = toKobo(refundAmount);

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
        if (refundResponse.ok) {
          await supabase
            .from('inspection_bookings')
            .update({ 
              status: 'tenant_declined',
              refund_percentage: refundPercentage,
              refund_amount: refundAmount,
              paystack_refund_reference: refundData.data.reference,
              notes: 'Auto-declined due to deadline expiration.',
              updated_at: new Date().toISOString() 
            })
            .eq('id', booking.id);
          
          // Notify parties
          const parties = [booking.tenant_id, booking.landlord_id];
          if (booking.agent_id) parties.push(booking.agent_id);

          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getServiceRoleKey()}`,
            },
            body: JSON.stringify({
              user_ids: parties,
              title: 'Decision Deadline Expired',
              body: `The decision deadline for ${booking.properties.title} has expired. The tenant has been auto-declined and issued a 70% refund.`,
              link: `/dashboard/bookings`,
              type: 'info',
            }),
          });

          results.push({ id: booking.id, status: 'expired' });
        }
      } catch (err) {
        console.error(`Failed to expire booking ${booking.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Auto-expire error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
