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
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    const now = new Date().toISOString();
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('lawyer_review_bookings')
      .select('*')
      .eq('status', 'paid')
      .lt('response_deadline', now);

    if (fetchError) throw fetchError;

    const results = [];

    for (const booking of expiredBookings || []) {
      try {
        // Re-check status right before acting, in case a verdict was
        // submitted in the gap between the query above and now
        const { data: current } = await supabase
          .from('lawyer_review_bookings')
          .select('status')
          .eq('id', booking.id)
          .single();

        if (current?.status !== 'paid') continue;

        // Only the lawyer's fee is refunded. The platform_fee is kept
        // regardless of outcome, per product decision - Handova
        // delivered its part (booking, escrow, matching) whether or
        // not the lawyer delivered theirs.
        const refundAmountKobo = toKobo(booking.lawyer_fee);

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
          console.error(`Refund failed for booking ${booking.id}:`, refundData);
          continue;
        }

        await supabase
          .from('lawyer_review_bookings')
          .update({
            status: 'expired',
            paystack_refund_reference: refundData.data?.reference ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        await supabase.from('notifications').insert([
          {
            user_id: booking.requested_by,
            title: 'Lawyer Review Refunded',
            body: 'The lawyer did not respond in time. Their review fee has been refunded to you.',
            type: 'lawyer_review_expired',
            link: `/deals/${booking.deal_id}`,
          },
          {
            user_id: booking.lawyer_id,
            title: 'Missed Review Deadline',
            body: 'A lawyer review request expired because no verdict was submitted in time. The fee was refunded to the requester.',
            type: 'lawyer_review_expired',
            link: `/deals/${booking.deal_id}`,
          },
        ]);

        results.push({ id: booking.id, status: 'refunded' });
      } catch (err) {
        console.error(`Failed to expire lawyer review booking ${booking.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Refund expired lawyer bookings error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
