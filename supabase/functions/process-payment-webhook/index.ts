import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, sendEmail, corsHeaders } from '../_shared/utils.ts';

// Verify that this request genuinely came from Paystack by checking the
// x-paystack-signature header against an HMAC-SHA512 of the raw body,
// signed with our Paystack secret key. Without this, anyone who discovers
// this URL could POST a fake "charge.success" event for any deal.
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    // 1. Read the RAW body first — signature verification needs the exact
    // bytes Paystack signed, before any JSON parsing.
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

    if (body.event !== 'charge.success') {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. The deal ID lives in metadata, NOT in data.reference (data.reference
    // is the Paystack transaction reference, a different string entirely).
    const dealId = body.data?.metadata?.deal_id;
    const reference = body.data?.reference;

    if (!dealId || !reference) {
      throw new Error(`Missing deal_id or reference in webhook payload (dealId=${dealId}, reference=${reference})`);
    }

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      throw new Error(`Deal not found: ${dealId}`);
    }

    // Tenant email looked up separately to avoid the FK-alias join pattern
    // that has caused 400s elsewhere in this codebase.
    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', deal.tenant_id)
      .single();

    // Idempotency check — Paystack may send the same webhook more than once.
    if (deal.status === 'payment_received' || deal.status === 'completed') {
      return new Response(JSON.stringify({ message: 'Deal already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Independently verify the transaction directly with Paystack's API.
    // We do NOT trust body.data.amount or body.data.status from the webhook
    // payload alone — we ask Paystack to confirm it themselves.
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

    // 4. Only now, after signature check + independent verification, do we
    // update the deal. This update runs via the service role client, so it
    // passes the protect_deal_status_transitions trigger cleanly.
    const { error: updateError } = await supabase
      .from('deals')
      .update({ status: 'payment_received', updated_at: new Date().toISOString() })
      .eq('id', dealId);

    if (updateError) throw updateError;

    await logDealAction(supabase, dealId, 'payment_received', 'system', {
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
