import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders, sendEmail } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAdminClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Authentication failed');

    const { bookingId, interested } = await req.json();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*), tenant:profiles!tenant_id(full_name, email), landlord:profiles!landlord_id(full_name, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('Booking not found');

    // Check if user is tenant
    if (booking.tenant_id !== user.id) {
      throw new Error('You are not authorized to submit a decision for this inspection.');
    }

    const toKobo = (naira: number) => Math.round(naira * 100);
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (interested) {
      // Set deadline = now + 72 hours
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 72);

      const { error: updateError } = await supabase
        .from('inspection_bookings')
        .update({ 
          status: 'tenant_interested',
          tenant_decision_deadline: deadline.toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

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
          title: 'Tenant Interested',
          body: `The tenant who inspected ${booking.properties.title} is interested! You have 72 hours to start escrow with them.`,
          link: `/dashboard/bookings`,
          type: 'info',
        }),
      });

      // Send Email to Landlord
      if (booking.landlord?.email) {
        await sendEmail(
          booking.landlord.email,
          'Tenant Interested - Rent Easy',
          'deal_update',
          {
            name: booking.landlord.full_name,
            propertyTitle: booking.properties.title,
            status: 'Tenant Interested',
            message: `The tenant who inspected your property is interested! You have 72 hours to start the escrow process.`,
            link: `https://handova.ng/dashboard`
          }
        );
      }
    } else {
      // Declined: trigger 70% Paystack refund
      const refundPercentage = 70;
      const refundAmount = booking.inspection_fee * (refundPercentage / 100);
      const refundAmountKobo = toKobo(refundAmount);

      // Call Paystack refund API
      const refundResponse = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paystackSecret}`,
        },
        body: JSON.stringify({
          transaction: booking.paystack_reference,
          amount: refundAmountKobo,
        }),
      });

      const refundData = await refundResponse.json();
      if (!refundResponse.ok) {
        throw new Error(`Paystack refund failed: ${refundData.message}`);
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('inspection_bookings')
        .update({ 
          status: 'tenant_declined',
          refund_percentage: refundPercentage,
          refund_amount: refundAmount,
          paystack_refund_reference: refundData.data.reference,
          updated_at: new Date().toISOString() 
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

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
          title: 'Tenant Declined',
          body: `The tenant who inspected ${booking.properties.title} has declined. They have been issued a 70% refund.`,
          link: `/dashboard/bookings`,
          type: 'info',
        }),
      });

      // Send Refund Email to Tenant
      if (booking.tenant?.email) {
        await sendEmail(
          booking.tenant.email,
          'Refund Processed - Rent Easy',
          'refund',
          {
            name: booking.tenant.full_name,
            propertyTitle: booking.properties.title,
            amount: refundAmount,
            link: `https://handova.ng/dashboard`
          }
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Submit decision error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
