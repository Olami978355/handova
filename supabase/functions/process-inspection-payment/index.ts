
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const hash = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody)
  );

  const expected = Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  if (expected.length !== signature.length) return false;

  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return difference === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY not set');

    // Verify the original request bytes, not reconstructed JSON.
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!(await verifyPaystackSignature(rawBody, signature, secret))) {
      return new Response(
        JSON.stringify({ error: 'Invalid Paystack signature' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const body = JSON.parse(rawBody);

    if (body.event !== 'charge.success') {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const transaction = body.data;

    if (
      !transaction?.reference ||
      transaction.status !== 'success' ||
      transaction.currency !== 'NGN'
    ) {
      throw new Error('Invalid or unsuccessful inspection payment.');
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('id, inspection_fee, paystack_reference, status, wallet_credit_version, properties(title)')
      .eq('paystack_reference', transaction.reference)
      .single();

    if (bookingError || !booking) {
      throw new Error('No inspection booking found for this payment reference.');
    }

    // Verify the actual amount received against the booking fee.
    const expectedAmount = Math.round(Number(booking.inspection_fee) * 100);

    if (
      !Number.isFinite(expectedAmount) ||
      expectedAmount <= 0 ||
      Number(transaction.amount) !== expectedAmount
    ) {
      throw new Error('Paystack payment amount does not match the inspection fee.');
    }

    if (booking.wallet_credit_version !== 'instant_wallet_v1') {
      return new Response(
        JSON.stringify({ success: true, message: 'Legacy booking; wallet credit skipped.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Confirm the booking before crediting the wallet.
    let transitionedByThisRequest = false;

    if (booking.status === 'pending_payment') {
      const { data: updatedRows, error: updateError } = await supabase
        .from('inspection_bookings')
        .update({
          status: 'payment_confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id)
        .eq('status', 'pending_payment')
        .eq('paystack_reference', transaction.reference)
        .select('id');

      if (updateError) throw updateError;
      transitionedByThisRequest = !!updatedRows?.length;

      if (!transitionedByThisRequest) {
        const { data: latestBooking, error: latestError } = await supabase
          .from('inspection_bookings')
          .select('status, paystack_reference')
          .eq('id', booking.id)
          .single();

        if (latestError || latestBooking?.status !== 'payment_confirmed' ||
            latestBooking?.paystack_reference !== transaction.reference) {
          throw new Error('Booking is no longer eligible for payment confirmation.');
        }
      }
    } else if (booking.status !== 'payment_confirmed') {
      throw new Error('Booking is not awaiting payment confirmation.');
    }

    // Idempotent RPC: safe when webhook and direct verification race.
    const { data: walletResult, error: walletError } = await supabase.rpc(
      'credit_inspection_fee_wallet',
      { p_booking_id: booking.id }
    );

    if (walletError) {
      console.error('Inspection wallet credit failed:', walletError);
      throw new Error('Payment verified, but wallet credit could not be completed. Webhook retry required.');
    }

    if (transitionedByThisRequest) {
      const { data: bookingParties, error: partiesError } = await supabase
        .from('inspection_bookings')
        .select('landlord_id, agent_id')
        .eq('id', booking.id)
        .single();

      if (partiesError) throw partiesError;
      const parties = [bookingParties.landlord_id];
      if (bookingParties.agent_id) parties.push(bookingParties.agent_id);

      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getServiceRoleKey()}`,
        },
        body: JSON.stringify({
          user_ids: parties,
          title: 'New Inspection Booking',
          body: `A tenant has paid for an inspection of ${booking.properties?.title || 'your property'}. Please confirm the inspection date.`,
          link: '/dashboard',
          type: 'inspection_requested',
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inspection payment processed.',
        wallet: walletResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Inspection payment webhook error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected payment processing error.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
