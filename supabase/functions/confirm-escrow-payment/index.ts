import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, sendEmail, corsHeaders } from '../_shared/utils.ts';

// Direct, authenticated fallback for confirming an escrow payment.
// process-payment-webhook depends entirely on Paystack's dashboard
// having a webhook URL configured pointing at it - if that's missing
// or misconfigured, charge.success events never arrive and deals get
// stuck at pending_payment forever, with the client only polling and
// timing out. This function does the same Paystack verification and
// status update, but is called directly by the paying tenant, so it
// doesn't depend on any external dashboard configuration at all.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, reference } = await req.json();

    if (!dealId || !reference) throw new Error('dealId and reference are required');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    // Only the tenant (or an accepted pay-delegate) can confirm their
    // own payment - not just anyone with a deal id.
    const isTenant = deal.tenant_id === user.id;
    if (!isTenant) {
      const { data: delegate } = await adminSupabase
        .from('deal_delegates')
        .select('can_pay')
        .eq('deal_id', dealId)
        .eq('delegate_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (!delegate?.can_pay) throw new Error('You are not authorized to confirm payment for this deal');
    }

    if (deal.status !== 'pending_payment') {
      return new Response(JSON.stringify({ success: true, message: `Deal already processed (status: ${deal.status})` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });
    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      throw new Error('Payment could not be verified with Paystack. If you were charged, contact support.');
    }

    const verifiedAmountKobo = verifyData.data.amount;
    const expectedAmountKobo = Math.round((deal.amount - (deal.inspection_fee_credit || 0)) * 100);

    if (verifiedAmountKobo !== expectedAmountKobo) {
      throw new Error(`Amount mismatch: expected ${expectedAmountKobo} kobo, Paystack confirms ${verifiedAmountKobo} kobo`);
    }

    const amountNaira = verifiedAmountKobo / 100;

    const { data: updatedRows, error: updateError } = await adminSupabase
      .from('deals')
      .update({ status: 'payment_received', paystack_reference: reference, updated_at: new Date().toISOString() })
      .eq('id', dealId)
      .eq('status', 'pending_payment')
      .select('id');
    if (updateError) throw updateError;

    if (!updatedRows || updatedRows.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Deal was processed concurrently (likely by the webhook, if it is configured)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    await logDealAction(adminSupabase, dealId, 'payment_received', user.id, {
      paystack_reference: reference,
      amount_received: amountNaira,
      confirmed_via: 'direct_client_confirm_fallback',
    });

    await notifyDealParties(
      adminSupabase,
      deal,
      'Payment Received',
      `Payment of ₦${amountNaira.toLocaleString()} for ${deal.properties.title} has been confirmed.`,
      `/deals/${dealId}`,
      'deal_state_change'
    );

    const { data: tenantProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', deal.tenant_id)
      .single();

    if (tenantProfile?.email) {
      await sendEmail(tenantProfile.email, 'Payment Confirmed - Handova', 'deal_update', {
        name: tenantProfile.full_name,
        propertyTitle: deal.properties.title,
        status: 'Payment Received',
        message: `Your payment of ₦${amountNaira.toLocaleString()} has been confirmed. The funds are now held in escrow.`,
        link: `https://handova.ng/deals/${dealId}`,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Confirm escrow payment error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
