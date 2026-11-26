import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

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

      // The release date comes from this date, so it must be in the future. Otherwise a
      // dishonest agent could confirm a past date and be paid before the tenant can react.
      const slotEndTime = (t?: string): string => {
      if (!t) return '23:59';
      if (/^\d{2}:\d{2}$/.test(t)) return t;
      if (t.startsWith('Morning')) return '12:00';
      if (t.startsWith('Late Afternoon')) return '18:00';
      if (t.startsWith('Afternoon')) return '15:00';
      return '23:59';
    };
    // Times are Nigerian time (WAT, UTC+1); the slot's end is when the visit is considered over.
    const scheduledFor = new Date(confirmedDate + 'T' + slotEndTime(confirmedTime) + ':00+01:00');
      if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
        throw new Error('The inspection date must be in the future.');
      }

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

    if (booking.status !== 'payment_confirmed') {
      throw new Error('Only payment-confirmed bookings can be scheduled.');
    }

    // Schedule only if the booking is still payment-confirmed.
    const { data: updatedRows, error: updateError } = await supabase
      .from('inspection_bookings')
      .update({
        status: 'inspection_scheduled',
        confirmed_date: confirmedDate,
        confirmed_time: confirmedTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('status', 'payment_confirmed')
      .select('id');

    if (updateError) throw updateError;
    if (!updatedRows?.length) {
      throw new Error('Booking status changed. Refresh and try again.');
    }

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
