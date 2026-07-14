import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, sendEmail, corsHeaders } from '../_shared/utils.ts';

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

  const newTransferStatus = body.event === 'transfer.success' ? 'success' : 'failed';

  if (deal.transfer_status === newTransferStatus) {
    return new Response(JSON.stringify({ message: 'Already processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  const { error: updateError } = await supabase
    .from('deals')
    .update({
      transfer_status: newTransferStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deal.id);

  if (updateError) throw updateError;

  await logDealAction(supabase, deal.id, `transfer_${newTransferStatus}`, null, {
    transfer_code: transferCode,
    reference,
    paystack_event: body.event,
  });

  if (newTransferStatus === 'success') {
    await notifyDealParties(
      supabase,
      deal,
      'Payout Sent',
      `Your payout for ${deal.properties.title} has been sent to your bank account.`,
      `/dashboard/deals/${deal.id}`,
      'deal_state_change'
    );
  } else {
    await notifyDealParties(
      supabase,
      deal,
      'Payout Failed',
      `The payout for ${deal.properties.title} could not be completed. Our team has been notified.`,
      `/dashboard/deals/${deal.id}`,
      'deal_state_change'
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
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
      console.error('Invalid Paystack webhook signature — rejecting request');
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
    const expectedAmountKobo = Math.round((deal.amount - (deal.inspection_fee_credit || 0)) * 100);

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

    await logDealAction(supabase, dealId, 'payment_received', null, {
      paystack_reference: reference,
      paystack_transaction_id: verifyData.data.id,
      amount_received: amountNaira,
    });

    await notifyDealParties(
      supabase,
      deal,
      'Payment Received',
      `Payment of ₦${amountNaira.toLocaleString()} for ${deal.properties.title} has been confirmed.`,
      `/dashboard/deals/${dealId}`,
      'deal_state_change'
    );

    if (tenantProfile?.email) {
      await sendEmail(tenantProfile.email, 'Payment Confirmed - Rent Easy', 'deal_update', {
        name: tenantProfile.full_name,
        propertyTitle: deal.properties.title,
        status: 'Payment Received',
        message: `Your payment of ₦${amountNaira.toLocaleString()} has been confirmed. The funds are now held in escrow.`,
        link: `https://renteasy.ng/dashboard/deals/${dealId}`,
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
