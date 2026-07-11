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

    const { bookingId, confirmedDate, confirmedTime } = await req.json();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(*), profiles!tenant_id(full_name, email)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) throw new Error('Booking not found');

    // Check if user is landlord or agent
    if (booking.landlord_id !== user.id && booking.agent_id !== user.id) {
      throw new Error('You are not authorized to confirm this inspection.');
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('inspection_bookings')
      .update({ 
        status: 'inspection_scheduled',
        confirmed_date: confirmedDate,
        confirmed_time: confirmedTime,
        updated_at: new Date().toISOString() 
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Notify tenant
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getServiceRoleKey()}`,
      },
      body: JSON.stringify({
        user_ids: [booking.tenant_id],
        title: 'Inspection Confirmed',
        body: `The landlord has confirmed your inspection for ${booking.properties.title} on ${confirmedDate} at ${confirmedTime}.`,
        link: `/dashboard/bookings`,
        type: 'inspection_confirmed',
      }),
    });

    // Send Email to Tenant
    if (booking.profiles?.email) {
      await sendEmail(
        booking.profiles.email,
        'Inspection Confirmed - Rent Easy',
        'inspection_booked',
        {
          name: booking.profiles.full_name,
          propertyTitle: booking.properties.title,
          date: confirmedDate,
          time: confirmedTime,
          link: `https://renteasy.ng/dashboard/bookings`
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Confirm inspection error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
