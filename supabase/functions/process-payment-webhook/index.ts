import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, sendEmail, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const body = await req.json();
    
    // BUG FIX 1 — PAYSTACK WEBHOOK IDEMPOTENCY:
    // Paystack sometimes sends the same webhook twice.
    // Before processing any webhook:
    // - Check if booking.status is already 'payment_confirmed'
    // - If yes: return 200 OK immediately without processing
    // - This prevents double-processing the same payment
    
    if (body.event === 'charge.success') {
      const dealId = body.data.reference;
      const amount = body.data.amount / 100; // Paystack is in kobo

      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('*, properties(*), profiles!tenant_id(full_name, email)')
        .eq('id', dealId)
        .single();

      if (dealError || !deal) {
        throw new Error(`Deal not found: ${dealId}`);
      }

      // Idempotency check
      if (deal.status === 'payment_received' || deal.status === 'completed') {
        return new Response(JSON.stringify({ message: 'Deal already processed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Update deal status
      const { error: updateError } = await supabase
        .from('deals')
        .update({ status: 'payment_received', updated_at: new Date().toISOString() })
        .eq('id', dealId);

      if (updateError) throw updateError;

      // Log action
      await logDealAction(supabase, dealId, 'payment_received', 'system', {
        paystack_reference: body.data.id,
        amount_received: amount,
      });

      // Notify parties
      await notifyDealParties(
        supabase,
        deal,
        'Payment Received',
        `Payment of ₦${amount.toLocaleString()} for ${deal.properties.title} has been confirmed.`,
        `/dashboard/deals/${dealId}`,
        'deal_state_change'
      );

      // Send Email to Tenant
      if (deal.profiles?.email) {
        await sendEmail(
          deal.profiles.email,
          'Payment Confirmed - Rent Easy',
          'deal_update',
          {
            name: deal.profiles.full_name,
            propertyTitle: deal.properties.title,
            status: 'Payment Received',
            message: `Your payment of ₦${amount.toLocaleString()} has been confirmed. The funds are now held in escrow.`,
            link: `https://renteasy.ng/dashboard/deals/${dealId}`
          }
        );
      }

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
