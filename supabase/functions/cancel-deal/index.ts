import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders, logAdminAction, sendDealStatusEmails } from '../_shared/utils.ts';
import {
  REFUNDABLE_CAUSES,
  computeCancellationAmounts,
  getPaidAmountNaira,
  requestPaystackRefund,
  type CancellationCause,
} from '../_shared/refund.ts';

// Admin cancellation. `cause` says why the deal is being cancelled:
//   tenant_voluntary -> 5% cancellation fee applies
//   landlord | agent | handova | invalid_listing | handover_failure -> full refund, no fee
// When no cause is sent, an admin-initiated cancellation counts as a Handova cancellation.
// Calling this again on a cancelled deal whose refund failed retries that refund.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, reason, cause: requestedCause } = await req.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    // Only admins can cancel a deal
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      throw new Error('Permission denied. Only admins can cancel a deal.');
    }

    // Retry a failed refund on an already-cancelled deal.
    if (deal.status === 'cancelled' && deal.refund_status === 'failed') {
      const { data: claim, error: claimError } = await adminSupabase.rpc('claim_deal_refund_retry', { p_deal_id: dealId });
      if (claimError) throw claimError;
      if (!claim?.claimed) throw new Error('A refund retry is already in progress.');
      const retry = await requestPaystackRefund(adminSupabase, deal, Number(claim.refund_amount), user.id);
      await logAdminAction(adminSupabase, user.id, 'deal_refund_retried', dealId, 'deal', { ok: retry.ok, reason: retry.reason });
      return new Response(JSON.stringify({ success: true, refundRetried: true, refundStatus: retry.ok ? 'pending' : 'failed', refundWarning: retry.reason }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Cannot cancel a deal once the tenant has moved in or funds are already released
    if (['move_in_confirmed', 'funds_released', 'disputed', 'cancelled', 'refunded'].includes(deal.status)) {
      throw new Error(`Cannot cancel a deal in ${deal.status} status.`);
    }

    const isPrePayment = !deal.paystack_reference;
    const cause: CancellationCause = (requestedCause ?? 'handova') as CancellationCause;
    if (!isPrePayment && !REFUNDABLE_CAUSES.includes(cause)) {
      throw new Error('Choose a valid cancellation cause. Refund terms for mutual or other cancellations are not defined yet.');
    }

    let feeAmount = 0;
    let refundAmount = 0;
    if (!isPrePayment) {
      const paid = await getPaidAmountNaira(deal.paystack_reference);
      ({ fee: feeAmount, refund: refundAmount } = computeCancellationAmounts(cause, Number(deal.amount), paid));
    }

    const reasonText = reason || 'Cancelled by admin.';
    const { data: began, error: beginError } = await adminSupabase.rpc('begin_deal_cancellation', {
      p_deal_id: dealId,
      p_actor: user.id,
      p_cause: isPrePayment && !requestedCause ? 'handova' : cause,
      p_reason: reasonText,
      p_fee: feeAmount,
      p_refund: refundAmount,
    });
    if (beginError) throw beginError;
    if (!began?.cancelled) throw new Error('This deal can no longer be cancelled.');

    let refundStatus: 'none' | 'pending' | 'failed' = refundAmount > 0 ? 'pending' : 'none';
    let refundWarning: string | undefined;
    if (refundAmount > 0) {
      const refundResult = await requestPaystackRefund(adminSupabase, deal, refundAmount, user.id);
      if (!refundResult.ok) {
        refundStatus = 'failed';
        refundWarning = refundResult.reason;
      }
    }

    // Make sure the listing is not shown as rented. (This no longer forces the listing
    // status to 'active', which could re-publish a listing an admin had suspended.)
    await adminSupabase
      .from('properties')
      .update({ is_rented: false, updated_at: new Date().toISOString() })
      .eq('id', deal.property_id);

    await logDealAction(adminSupabase, dealId, 'deal_cancelled', user.id, {
      reason: reasonText, cause, feeAmount, refundAmount, refund_status: refundStatus,
    });
    await logAdminAction(adminSupabase, user.id, 'deal_cancelled', dealId, 'deal', {
      reason: reasonText, cause, feeAmount, refundAmount,
    });

    const refundText = isPrePayment
      ? ''
      : refundStatus === 'failed'
        ? ` The refund of ₦${refundAmount.toLocaleString()} could not be started automatically; our team will process it.`
        : ` ₦${refundAmount.toLocaleString()} is being refunded${feeAmount > 0 ? ` after a ₦${feeAmount.toLocaleString()} cancellation fee` : ' in full'}. Bank timing varies.`;
    const message = `The deal for ${deal.properties.title} has been cancelled. Reason: ${reasonText}.${refundText}`;

    await notifyDealParties(adminSupabase, deal, 'Deal Cancelled', message, `/deals/${dealId}`, 'deal_state_change');
    await sendDealStatusEmails(adminSupabase, deal, 'Cancelled', message, `/deals/${dealId}`);

    return new Response(JSON.stringify({ success: true, feeAmount, refundAmount, refundStatus, refundWarning }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Cancel deal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
