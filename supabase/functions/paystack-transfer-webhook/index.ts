import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

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

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    const validSignature = await verifySignature(rawBody, signature, paystackSecret);
    if (!validSignature) {
      console.error('Invalid Paystack transfer webhook signature — rejecting request');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = JSON.parse(rawBody);
    const supabase = createAdminClient();

    // Only care about transfer lifecycle events
    if (!['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(body.event)) {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

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

    const newTransferStatus =
      body.event === 'transfer.success' ? 'success' : 'failed';

    // Idempotency: if we've already recorded this exact outcome, skip re-processing
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
      // Failed/reversed transfer — surface this clearly, money did not move
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
  } catch (error) {
    console.error('Transfer webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
