import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const signature = req.headers.get('x-paystack-signature');

    // BUG FIX 3: Helper for Kobo conversion (not needed here as we read from Paystack)
    // const toKobo = (naira: number) => Math.round(naira * 100);

    // Verify Paystack signature
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY not set');

    // Paystack signature verification (HMAC SHA512)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(JSON.stringify(body))
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (body.event === 'charge.success') {
      const reference = body.data.reference;

      // Fetch booking
      const { data: booking, error: bookingError } = await supabase
        .from('inspection_bookings')
        .select('*, properties(*)')
        .eq('paystack_reference', reference)
        .single();

      if (bookingError || !booking) {
        throw new Error(`Booking not found for reference: ${reference}`);
      }

      // BUG FIX 1: Idempotency check
      if (booking.status === 'payment_confirmed') {
        return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('inspection_bookings')
        .update({ 
          status: 'payment_confirmed', 
          transfer_status: 'awaiting_release',
          updated_at: new Date().toISOString() 
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // Fee is held by Handova, not paid out yet. It releases automatically
      // once the agreed inspection date passes (see release-inspection-fees),
      // giving cancellations/disputes raised before that date a clean path
      // with no clawback ever needed.

      // Notify landlord/agent
      const parties = [booking.landlord_id];
      if (booking.agent_id) parties.push(booking.agent_id);

      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getServiceRoleKey()}`,
        },
        body: JSON.stringify({
          user_ids: parties,
          title: 'New Inspection Booking',
          body: `A tenant has paid for an inspection of ${booking.properties.title}. Please confirm the date.`,
          link: `/dashboard`,
          type: 'inspection_requested',
        }),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: 'Event ignored' }), {
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
