import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';
import { completeDealRelease, failDealRelease } from '../_shared/release.ts';

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return computedHex === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    if (!(await verifySignature(rawBody, signature, paystackSecret))) {
      console.error('Invalid Paystack transfer webhook signature, rejecting request');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = JSON.parse(rawBody);
    const supabase = createAdminClient();

    if (!['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(body.event)) {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const transferCode = body.data?.transfer_code;
    const reference = body.data?.reference;
    if (!transferCode) throw new Error('Missing transfer_code in webhook payload');

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*, properties(*)')
      .eq('paystack_transfer_code', transferCode)
      .single();
    if (dealError || !deal) throw new Error(`No deal found for transfer_code: ${transferCode}`);

    const isSuccess = body.event === 'transfer.success';
    const newTransferStatus = isSuccess ? 'success' : 'failed';

    const alreadyProcessed = isSuccess
      ? deal.release_status === 'completed'
      : deal.transfer_status === 'failed' && deal.release_status === 'failed';
    if (alreadyProcessed) {
      return new Response(JSON.stringify({ message: 'Already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
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
        supabase, deal, 'Payout Failed',
        `The payout for ${deal.properties.title} could not be completed. Our team has been notified.`,
        `/deals/${deal.id}`, 'deal_state_change'
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
