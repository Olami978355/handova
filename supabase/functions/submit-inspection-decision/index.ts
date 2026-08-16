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
      // Declined: the visit already happened (this function only runs
      // after inspection_done), so the agent/landlord did their job and
      // keeps the fee — same as any completed visit. No refund. The fee
      // still releases automatically via release-inspection-fees on the
      // agreed release_at date, same as if the tenant had said yes.
      const { error: updateError } = await supabase
        .from('inspection_bookings')
        .update({
          status: 'tenant_declined',
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
          body: `The tenant who inspected ${booking.properties.title} has declined to proceed.`,
          link: `/dashboard/bookings`,
          type: 'info',
        }),
      });

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
