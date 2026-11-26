import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, sendEmail, corsHeaders } from '../_shared/utils.ts';
import { completeDealRelease, failDealRelease } from '../_shared/release.ts';

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computedHex === signature;
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

// Payout (transfer) confirmations. Only a provider-confirmed success marks the deal
// funds_released; a failed or reversed transfer is recorded as a failed release.
async function handleTransferEvent(body: any, supabase: ReturnType<typeof createAdminClient>) {
  const transferCode = body.data?.transfer_code;
  const reference = body.data?.reference;

  if (!transferCode) {
    throw new Error('Missing transfer_code in webhook payload');
  }

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*, properties(*)')
    .eq('paystack_transfer_code', transferCode)
    .single();

  if (dealError || !deal) {
    throw new Error(`No deal found for transfer_code: ${transferCode}`);
  }

  const isSuccess = body.event === 'transfer.success';
  const newTransferStatus = isSuccess ? 'success' : 'failed';

  // Idempotency: a repeated webhook for an outcome we already recorded does nothing.
  const alreadyProcessed = isSuccess
    ? deal.release_status === 'completed'
    : deal.transfer_status === 'failed' && deal.release_status === 'failed';
  if (alreadyProcessed) {
    return jsonResponse({ message: 'Already processed' });
  }

  if (isSuccess) {
    await completeDealRelease(supabase, deal);
  } else {
    await failDealRelease(supabase, deal, body.data?.reason || `Payout provider reported ${body.event}`);
  }

  await logDealAction(supabase, deal.id, `transfer_${newTransferStatus}`, null as any, {
    transfer_code: transferCode,
    reference,
    paystack_event: body.event,
  });

  if (!isSuccess) {
    await notifyDealParties(
      supabase,
      deal,
      'Payout Failed',
      `The payout for ${deal.properties.title} could not be completed. Our team has been notified.`,
      `/deals/${deal.id}`,
      'deal_state_change'
    );
  }

  return jsonResponse({ success: true });
}

// Refund confirmations. A refund is only treated as complete when Paystack says so.
async function handleRefundEvent(body: any, supabase: ReturnType<typeof createAdminClient>) {
  const reference = body.data?.transaction_reference ?? body.data?.transaction?.reference;
  if (!reference) {
    return jsonResponse({ message: 'Refund event without a transaction reference ignored' });
  }

  const { data: deal } = await supabase
    .from('deals')
    .select('*, properties(*)')
    .eq('paystack_reference', reference)
    .maybeSingle();

  if (!deal) {
    const { data: booking, error: bookingError } = await supabase
      .from('lawyer_review_bookings')
      .select('id, deal_id, requested_by, status')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) {
      return jsonResponse({ message: 'No matching deal or lawyer booking for this refund reference' });
    }

    if (body.event === 'refund.processed') {
      if (booking.status === 'refunded') {
        return jsonResponse({ message: 'Lawyer refund already processed' });
      }

      const { error: updateError } = await supabase
        .from('lawyer_review_bookings')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', booking.id)
        .neq('status', 'refunded');

      if (updateError) throw updateError;

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: booking.requested_by,
        title: 'Lawyer Review Refund Processed',
        body: 'Paystack has processed your lawyer review fee refund. It may take up to 10 business days to appear in your account.',
        type: 'refund_processed',
        link: '/deals/' + booking.deal_id,
      });

      if (notificationError) throw notificationError;
      return jsonResponse({ success: true, refund: 'lawyer_review' });
    }

    if (body.event === 'refund.failed' || body.event === 'refund.needs-attention') {
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: booking.requested_by,
        title: 'Lawyer Review Refund Needs Attention',
        body: 'Paystack could not complete your lawyer review fee refund yet. Handova is checking the issue.',
        type: 'refund_attention',
        link: '/deals/' + booking.deal_id,
      });

      if (notificationError) throw notificationError;
      return jsonResponse({ success: true, refund: 'lawyer_review', attention: true });
    }

    return jsonResponse({ message: 'Lawyer-review refund event noted' });
  }

  const now = new Date().toISOString();

  if (body.event === 'refund.processed') {
    if (deal.refund_status === 'completed') return jsonResponse({ message: 'Already processed' });

    await supabase
      .from('deals')
      .update({
        refund_status: 'completed',
        refund_failure_reason: null,
        status: ['cancelled', 'disputed'].includes(deal.status) ? 'refunded' : deal.status,
        updated_at: now,
      })
      .eq('id', deal.id)
      .neq('refund_status', 'completed');

    await logDealAction(supabase, deal.id, 'refund_completed', null as any, {
      paystack_event: body.event,
      transaction_reference: reference,
    });
    await notifyDealParties(
      supabase,
      deal,
      "Refund Processed",
      "The refund for " + (deal.properties?.title ?? "your deal") + " has been processed. It can take up to 10 business days to reach the bank account.",
      `/deals/${deal.id}`,
      "refund_processed"
    );
    return jsonResponse({ success: true });
  }

  if (body.event === 'refund.failed' || body.event === 'refund.needs-attention') {
    if (deal.refund_status === 'failed') return jsonResponse({ message: 'Already processed' });

    const reason =
      body.event === 'refund.needs-attention'
        ? 'Paystack needs the customer bank account details to complete this refund'
        : body.data?.reason || 'Paystack could not process the refund';

    await supabase
      .from('deals')
      .update({ refund_status: 'failed', refund_failure_reason: reason, updated_at: now })
      .eq('id', deal.id)
      .neq('refund_status', 'completed');

    await logDealAction(supabase, deal.id, 'refund_failed', null as any, {
      paystack_event: body.event,
      transaction_reference: reference,
      reason,
    });
    await notifyDealParties(
      supabase,
      deal,
      "Refund Needs Attention",
      "The refund for " + (deal.properties?.title ?? "your deal") + " could not be completed yet. Our team is looking into it.",
      `/deals/${deal.id}`,
      "refund_attention"
    );
    return jsonResponse({ success: true });
  }

  // refund.pending / refund.processing: nothing to change, the request is already recorded.
  return jsonResponse({ message: 'Refund event noted' });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    const validSignature = await verifySignature(rawBody, signature, paystackSecret);
    if (!validSignature) {
      console.error('Invalid Paystack webhook signature - rejecting request');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = JSON.parse(rawBody);
    const supabase = createAdminClient();

    if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(body.event)) {
      return await handleTransferEvent(body, supabase);
    }

    if (typeof body.event === 'string' && body.event.startsWith('refund.')) {
      return await handleRefundEvent(body, supabase);
    }

    if (body.event !== 'charge.success') {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const dealId = body.data?.metadata?.deal_id;
    const reference = body.data?.reference;

    if (!dealId || !reference) {
      throw new Error(`Missing deal_id or reference in webhook payload (dealId=${dealId}, reference=${reference})`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
    let adminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (secretKeys) {
      try {
        const parsed = JSON.parse(secretKeys);
        const k = parsed['default'] ?? Object.values(parsed)[0];
        if (k) adminKey = k as string;
      } catch { /* use legacy */ }
    }

    const dealRes = await fetch(
      `${supabaseUrl}/rest/v1/deals?id=eq.${dealId}&select=*,properties(*)`,
      {
        headers: {
          'apikey': adminKey,
          'Authorization': `Bearer ${adminKey}`,
          'Accept': 'application/json',
        },
      }
    );
    const dealArr = await dealRes.json();
    const deal = Array.isArray(dealArr) && dealArr.length > 0 ? dealArr[0] : null;

    if (!deal) {
      throw new Error(`Deal not found: ${dealId} (status: ${dealRes.status})`);
    }

    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', deal.tenant_id)
      .single();

    if (deal.paystack_reference === reference) {
      return new Response(JSON.stringify({ message: 'This exact transaction reference was already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (deal.status !== 'pending_payment') {
      return new Response(JSON.stringify({ message: `Deal already processed (current status: ${deal.status})` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });
    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      throw new Error(`Paystack verification failed for reference ${reference}: ${JSON.stringify(verifyData)}`);
    }

    const verifiedAmountKobo = verifyData.data.amount;
    // Fee model v2 deals are charged the full total (rent + Handova 2% + agreement fee + agency fee);
    // existing deals keep the original rent-only amount.
    const expectedAmountKobo =
      Number(deal.fee_model_version) === 2
        ? Math.round(Number(deal.total_payable) * 100)
        : Math.round((deal.amount - (deal.inspection_fee_credit || 0)) * 100);

    if (verifiedAmountKobo !== expectedAmountKobo) {
      throw new Error(
        `Amount mismatch for deal ${dealId}: expected ${expectedAmountKobo} kobo, Paystack confirms ${verifiedAmountKobo} kobo`
      );
    }

    const amountNaira = verifiedAmountKobo / 100;

    const { data: updatedRows, error: updateError } = await supabase
      .from('deals')
      .update({ status: 'payment_received', paystack_reference: reference, updated_at: new Date().toISOString() })
      .eq('id', dealId)
      .eq('status', 'pending_payment')
      .select('id');

    if (updateError) throw updateError;

    if (!updatedRows || updatedRows.length === 0) {
      return new Response(JSON.stringify({ message: 'Deal was processed concurrently by another webhook delivery' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    await logDealAction(supabase, dealId, 'payment_received', null as any, {
      paystack_reference: reference,
      paystack_transaction_id: verifyData.data.id,
      amount_received: amountNaira,
    });

    await notifyDealParties(
      supabase,
      deal,
      'Payment Received',
      `Payment of ₦${amountNaira.toLocaleString()} for ${deal.properties.title} has been confirmed.`,
      `/deals/${dealId}`,
      'deal_state_change'
    );

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
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
