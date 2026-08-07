import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { bookingId, delegateUsername } = await req.json();
    if (!bookingId || !delegateUsername) throw new Error('bookingId and delegateUsername are required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: booking, error: bookingError } = await adminSupabase
      .from('inspection_bookings')
      .select('*, properties(title)')
      .eq('id', bookingId)
      .single();
    if (bookingError || !booking) throw new Error('Booking not found');

    if (user.id !== booking.tenant_id) {
      throw new Error('Only the tenant who booked this inspection can invite someone to attend on their behalf.');
    }

    const { data: delegateProfile, error: delegateError } = await adminSupabase
      .from('public_profiles')
      .select('id, full_name')
      .eq('username', delegateUsername)
      .single();
    if (delegateError || !delegateProfile) throw new Error('No user found with that username.');

    if (delegateProfile.id === user.id) throw new Error('You cannot delegate to yourself.');
    if (delegateProfile.id === booking.landlord_id || delegateProfile.id === booking.agent_id) {
      throw new Error('This person is already a party on this booking.');
    }

    const { data: existingRow } = await adminSupabase
      .from('inspection_delegates')
      .select('id, status')
      .eq('booking_id', bookingId)
      .eq('principal_id', user.id)
      .eq('delegate_id', delegateProfile.id)
      .maybeSingle();

    if (existingRow && (existingRow.status === 'accepted' || existingRow.status === 'pending')) {
      throw new Error('You have already invited this person for this inspection.');
    }

    let invite;
    if (existingRow) {
      const { data: updated, error: updateError } = await adminSupabase
        .from('inspection_delegates')
        .update({ status: 'pending', responded_at: null })
        .eq('id', existingRow.id)
        .select()
        .single();
      if (updateError) throw updateError;
      invite = updated;
    } else {
      const { data: created, error: insertError } = await adminSupabase
        .from('inspection_delegates')
        .insert({ booking_id: bookingId, principal_id: user.id, delegate_id: delegateProfile.id })
        .select()
        .single();
      if (insertError) {
        if (insertError.code === '23505') throw new Error('You have already invited this person for this inspection.');
        throw insertError;
      }
      invite = created;
    }

    await adminSupabase.from('notifications').insert({
      user_id: delegateProfile.id,
      title: 'Inspection Delegate Invitation',
      body: `You've been invited to attend a property inspection on someone's behalf for ${booking.properties.title}.`,
      link: `/dashboard`,
      type: 'deal_state_change',
    });

    return new Response(JSON.stringify({ success: true, invite }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
