import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders, logAdminAction } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { bookingId, verdict, verdictNotes } = await req.json();

    if (!['fine', 'concerns'].includes(verdict)) {
      throw new Error('verdict must be "fine" or "concerns"');
    }
    if (!verdictNotes || !verdictNotes.trim()) {
      throw new Error('verdictNotes is required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: booking, error: bookingError } = await adminSupabase
      .from('lawyer_review_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('Booking not found');

    if (booking.lawyer_id !== user.id) {
      throw new Error('Only the assigned lawyer can submit a verdict for this booking');
    }

    if (booking.status !== 'paid') {
      throw new Error(`This booking is not awaiting a verdict (status: ${booking.status})`);
    }

    // Update the booking with the verdict first, independent of payout
    // success - a failed transfer shouldn't block the requester from
    // seeing the verdict they paid for.
    const { error: updateError } = await adminSupabase
      .from('lawyer_review_bookings')
      .update({
        status: 'verdict_submitted',
        verdict,
        verdict_notes: verdictNotes.trim(),
        verdict_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    if (updateError) throw updateError;

    // Pay the lawyer their full lawyer_fee (platform_fee is Handova's
    // cut, kept separately - not part of this transfer at all).
    let transferWarning: string | null = null;
    const { data: lawyerProfile } = await adminSupabase
      .from('profiles')
      .select('paystack_recipient_code')
      .eq('id', booking.lawyer_id)
      .single();

    if (!lawyerProfile?.paystack_recipient_code) {
      await adminSupabase
        .from('lawyer_review_bookings')
        .update({ transfer_status: 'failed' })
        .eq('id', bookingId);
      await logAdminAction(adminSupabase, user.id, 'lawyer_fee_transfer_failed', bookingId, 'lawyer_review_booking', {
        reason: 'Lawyer has no bank details on file',
      });
      transferWarning = 'Verdict submitted, but you have no bank details on file so your fee could not be transferred. Add your bank details in settings and contact support.';
    } else {
      const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

      const transferReference = `LAWFEE_${bookingId}_${Date.now()}`;
      const transferRes = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(Number(booking.lawyer_fee) * 100),
          recipient: lawyerProfile.paystack_recipient_code,
          reference: transferReference,
          reason: `Handova lawyer review fee for booking ${bookingId}`,
        }),
      });
      const transferData = await transferRes.json();

      if (!transferData.status) {
        await adminSupabase
          .from('lawyer_review_bookings')
          .update({ transfer_status: 'failed' })
          .eq('id', bookingId);
        await logAdminAction(adminSupabase, user.id, 'lawyer_fee_transfer_failed', bookingId, 'lawyer_review_booking', {
          reason: transferData.message || 'Unknown Paystack transfer error',
        });
        transferWarning = `Verdict submitted, but the fee transfer failed: ${transferData.message}`;
      } else {
        await adminSupabase
          .from('lawyer_review_bookings')
          .update({
            transfer_status: 'pending',
            paystack_transfer_reference: transferReference,
            paystack_transfer_code: transferData.data.transfer_code,
          })
          .eq('id', bookingId);
        await logAdminAction(adminSupabase, user.id, 'lawyer_fee_transfer_initiated', bookingId, 'lawyer_review_booking', {
          amount: booking.lawyer_fee,
        });
      }
    }

    await adminSupabase.from('notifications').insert({
      user_id: booking.requested_by,
      title: 'Lawyer Review Complete',
      body: verdict === 'fine'
        ? "The lawyer reviewed your agreement and found no issues."
        : "The lawyer reviewed your agreement and flagged some concerns. Check the deal page for details.",
      type: 'lawyer_review_submitted',
      link: `/deals/${booking.deal_id}`,
    });

    return new Response(JSON.stringify({ success: true, warning: transferWarning }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Submit lawyer verdict error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
