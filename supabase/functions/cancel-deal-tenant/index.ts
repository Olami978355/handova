import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

const CANCELLATION_FEE_RATE = 0.05; // 5% — flat rate, adjust here if it changes

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

    if (deal.status === 'move_in_confirmed' || deal.status === 'funds_released' || deal.status === 'disputed') {
      throw new Error(`Cannot cancel a deal in ${deal.status} status.`);
    }

    const isPrePayment = deal.status === 'agreement_draft' || deal.status === 'pending_payment';

    let feeAmount = 0;
    let refundAmount = 0;

    if (isPrePayment) {
      // No payment has been made yet — free cancellation, nothing to refund via Paystack.
      feeAmount = 0;
      refundAmount = 0;
    } else {
      if (!deal.paystack_reference) {
        throw new Error('No payment reference found on this deal — nothing to refund.');
      }

      feeAmount = Math.round(deal.amount * CANCELLATION_FEE_RATE * 100) / 100;
      refundAmount = deal.amount - feeAmount;
      const toKobo = (naira: number) => Math.round(naira * 100);
      const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

      const refundResponse = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paystackSecret}`,
        },
        body: JSON.stringify({
          transaction: deal.paystack_reference,
          amount: toKobo(refundAmount),
        }),
      });
      const refundData = await refundResponse.json();
      if (!refundResponse.ok) {
        throw new Error(`Paystack refund failed: ${refundData.message}`);
      }
    }

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason,
        cancellation_fee: feeAmount,
        refund_amount: refundAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    await adminSupabase
      .from('properties')
      .update({ is_rented: false, updated_at: new Date().toISOString() })
      .eq('id', deal.property_id);

    await logDealAction(adminSupabase, dealId, 'deal_cancelled_by_tenant', user.id, {
      reason, feeAmount, refundAmount,
    });

    await notifyDealParties(
      adminSupabase,
      deal,
      'Deal Cancelled by Tenant',
      isPrePayment
        ? `The deal for ${deal.properties.title} was cancelled by the tenant. Reason: ${reason}. No payment had been made, so no fee applies.`
        : `The deal for ${deal.properties.title} was cancelled by the tenant. Reason: ${reason}. A 5% cancellation fee (₦${feeAmount.toLocaleString()}) was applied; ₦${refundAmount.toLocaleString()} was refunded.`,
      `/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true, feeAmount, refundAmount }), {
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
