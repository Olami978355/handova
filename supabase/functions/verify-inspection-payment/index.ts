import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const userClient = createSupabaseClient(req);
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const bookingId = body?.bookingId;
    const reference = body?.reference;

    if (
      typeof bookingId !== 'string' ||
      !bookingId.trim() ||
      typeof reference !== 'string' ||
      !reference.trim()
    ) {
      return jsonResponse({ error: 'bookingId and reference are required' }, 400);
    }

    const { data: booking, error: bookingError } = await admin
      .from('inspection_bookings')
      .select(`
        id,
        tenant_id,
        landlord_id,
        agent_id,
        inspection_fee,
        paystack_reference,
        status,
        wallet_credit_version,
        properties(title)
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Inspection booking not found' }, 404);
    }

    if (booking.tenant_id !== user.id) {
      return jsonResponse({ error: 'You are not authorized to verify this booking' }, 403);
    }

    if (booking.paystack_reference !== reference) {
      return jsonResponse({ error: 'Payment reference does not match this booking' }, 400);
    }

    if (booking.wallet_credit_version !== 'instant_wallet_v1') {
      return jsonResponse({ error: 'This booking is not eligible for inspection wallet credit' }, 400);
    }

    const fee = Number(booking.inspection_fee);
    const expectedAmountKobo = Math.round(fee * 100);

    if (!Number.isFinite(expectedAmountKobo) || expectedAmountKobo <= 0) {
      return jsonResponse({ error: 'Invalid inspection fee on booking' }, 400);
    }

    if (
      booking.status !== 'pending_payment' &&
      booking.status !== 'payment_confirmed'
    ) {
      return jsonResponse({
        error: `Booking cannot be payment-confirmed from status: ${booking.status}`,
      }, 409);
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${paystackSecret}` },
      }
    );

    if (!verifyResponse.ok) {
      console.error('Paystack verification HTTP error:', verifyResponse.status);
      throw new Error('Could not verify payment with Paystack. Please try again.');
    }

    const verifyResult = await verifyResponse.json();
    const transaction = verifyResult?.data;

    if (
      verifyResult?.status !== true ||
      transaction?.status !== 'success' ||
      transaction?.reference !== reference ||
      transaction?.currency !== 'NGN' ||
      Number(transaction?.amount) !== expectedAmountKobo
    ) {
      return jsonResponse({
        error: 'Paystack could not confirm a successful payment matching this booking and amount.',
      }, 400);
    }

    // Confirm the booking before crediting the wallet.
    let transitionedByThisRequest = false;

    if (booking.status === 'pending_payment') {
      const { data: updatedRows, error: updateError } = await admin
        .from('inspection_bookings')
        .update({
          status: 'payment_confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id)
        .eq('status', 'pending_payment')
        .eq('paystack_reference', reference)
        .select('id');

      if (updateError) throw updateError;
      transitionedByThisRequest = !!updatedRows?.length;

      if (!transitionedByThisRequest) {
        const { data: latestBooking, error: latestError } = await admin
          .from('inspection_bookings')
          .select('status, paystack_reference')
          .eq('id', booking.id)
          .single();

        if (latestError || latestBooking?.status !== 'payment_confirmed' ||
            latestBooking?.paystack_reference !== reference) {
          throw new Error('Booking confirmation did not complete. Please retry verification.');
        }
      }
    } else if (booking.status !== 'payment_confirmed') {
      throw new Error('Booking is no longer eligible for payment confirmation.');
    }

    // Credit only after confirmation; the RPC prevents duplicate wallet credits.
    const { data: walletResult, error: walletError } = await admin.rpc(
      'credit_inspection_fee_wallet',
      { p_booking_id: booking.id }
    );

    if (walletError) {
      console.error('Inspection wallet credit failed:', walletError);
      throw new Error('Payment was verified, but wallet credit failed. Please retry verification.');
    }

    if (transitionedByThisRequest) {
      const parties = [booking.landlord_id];
      if (booking.agent_id && !parties.includes(booking.agent_id)) {
        parties.push(booking.agent_id);
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = getServiceRoleKey();

      if (supabaseUrl && serviceRoleKey) {
        const notificationResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              user_ids: parties,
              title: 'New Inspection Booking',
              body: `A tenant has paid for an inspection of ${booking.properties?.title || 'your property'}. Please confirm the inspection date.`,
              link: '/dashboard',
              type: 'inspection_requested',
            }),
          }
        );

        if (!notificationResponse.ok) {
          console.error('Inspection notification failed:', notificationResponse.status,
            await notificationResponse.text());
        }
      }
    }

    return jsonResponse({
      success: true,
      message: 'Inspection payment verified and wallet credit processed.',
      wallet: walletResult,
    });
  } catch (error) {
    console.error('Verify inspection payment error:', error);
    return jsonResponse({
      error: error instanceof Error
        ? error.message
        : 'Unexpected inspection payment verification error.',
    }, 400);
  }
});
