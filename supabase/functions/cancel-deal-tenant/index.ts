import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders, sendDealStatusEmails } from '../_shared/utils.ts';
import {
  CANCELLATION_FEE_RATE,
  computeCancellationAmounts,
  getPaidAmountNaira,
  requestPaystackRefund,
} from '../_shared/refund.ts';

// A tenant cancelling on their own is a voluntary cancellation: the 5% fee applies once
// payment has been made. Cancellations caused by Handova, the landlord, the agent, an
// invalid listing or a failed handover are handled by an admin with the matching cause
// (see cancel-deal) and carry no fee.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, reason } = await req.json();

    if (!dealId || !reason || !reason.trim()) {
      throw new Error('dealId and a cancellation reason are required.');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (deal.tenant_id !== user.id) {
      throw new Error('Only the tenant on this deal can cancel it.');
    }

    if (['move_in_confirmed', 'funds_released', 'disputed', 'cancelled', 'refunded'].includes(deal.status)) {
      throw new Error(`Cannot cancel a deal in ${deal.status} status.`);
    }

    // Payment either happened (paystack_reference is set) or it didn't.
    const isPrePayment = !deal.paystack_reference;

    let feeAmount = 0;
    let refundAmount = 0;
    if (!isPrePayment) {
      // Use what Paystack actually collected so a refund can never exceed the payment.
      const paid = await getPaidAmountNaira(deal.paystack_reference);
      ({ fee: feeAmount, refund: refundAmount } = computeCancellationAmounts(
        'tenant_voluntary',
        Number(deal.amount),
        paid
      ));
    }

    // Cancel atomically first, so a double tap can never request two refunds.
    const { data: began, error: beginError } = await adminSupabase.rpc('begin_deal_cancellation', {
      p_deal_id: dealId,
      p_actor: user.id,
      p_cause: 'tenant_voluntary',
      p_reason: reason,
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

    await adminSupabase
      .from('properties')
      .update({ is_rented: false, updated_at: new Date().toISOString() })
      .eq('id', deal.property_id);

    await logDealAction(adminSupabase, dealId, 'deal_cancelled_by_tenant', user.id, {
      reason, feeAmount, refundAmount, cause: 'tenant_voluntary', refund_status: refundStatus,
    });

    const feePct = Math.round(CANCELLATION_FEE_RATE * 100);
    const refundText =
      refundStatus === 'failed'
        ? `The refund of ₦${refundAmount.toLocaleString()} could not be started automatically. Our team will process it.`
        : `₦${refundAmount.toLocaleString()} is being refunded. Bank timing varies.`;
    const message = isPrePayment
      ? `The deal for ${deal.properties.title} was cancelled by the tenant. Reason: ${reason}. No payment had been made, so no fee applies.`
      : `The deal for ${deal.properties.title} was cancelled by the tenant. Reason: ${reason}. A ${feePct}% cancellation fee (₦${feeAmount.toLocaleString()}) was applied. ${refundText}`;

    await notifyDealParties(adminSupabase, deal, 'Deal Cancelled by Tenant', message, `/deals/${dealId}`, 'deal_state_change');
    await sendDealStatusEmails(adminSupabase, deal, 'Cancelled by Tenant', message, `/deals/${dealId}`);

    return new Response(JSON.stringify({ success: true, feeAmount, refundAmount, refundStatus, refundWarning }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Cancel deal (tenant) error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
