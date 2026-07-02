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
      const debugKey = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(paystackSecret),
        { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
      );
      const debugMac = await crypto.subtle.sign('HMAC', debugKey, new TextEncoder().encode(rawBody));
      const debugComputed = Array.from(new Uint8Array(debugMac)).map(b => b.toString(16).padStart(2, '0')).join('');
      console.error('DEBUG received signature:', signature);
      console.error('DEBUG computed signature:', debugComputed);
      console.error('DEBUG raw body length:', rawBody.length);
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

    console.log('DEBUG dealId value:', JSON.stringify(dealId));
    console.log('DEBUG dealId type:', typeof dealId);
    console.log('DEBUG dealId length:', dealId.length);
    console.log('DEBUG full metadata object:', JSON.stringify(body.data?.metadata));

    console.log('DEBUG SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('DEBUG has SERVICE_ROLE_KEY:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Use raw fetch instead of Supabase JS client - sb_secret_ keys only
    // bypass RLS correctly when sent as apikey header in direct REST calls
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
    console.log('DEBUG adminKey prefix:', adminKey.slice(0, 20));

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
    console.log('DEBUG deal fetch status:', dealRes.status);
    console.log('DEBUG deal fetch result:', JSON.stringify(dealArr).slice(0, 200));
    const deal = Array.isArray(dealArr) && dealArr.length > 0 ? dealArr[0] : null;

    if (!deal) {
      throw new Error(`Deal not found: ${dealId} (status: ${dealRes.status})`);
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
