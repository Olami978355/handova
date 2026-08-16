import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

// Marks that the agreed inspection actually took place. Called by whoever
// conducted it — the agent, or the landlord if there's no agent. This is
// the missing trigger that unlocks the tenant's interested/not-interested
// decision (submit-inspection-decision), which was previously unreachable
// since nothing ever set status to inspection_done.
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

    const { bookingId } = await req.json();
    if (!bookingId) throw new Error('bookingId is required.');

    const { data: booking, error: bookingError } = await supabase
      .from('inspection_bookings')
      .select('*, properties(title)')
      .eq('id', bookingId)
      .single();
    if (bookingError || !booking) throw new Error('Booking not found');

    const isConductor = user.id === booking.agent_id || user.id === booking.landlord_id;
    if (!isConductor) {
      throw new Error('Only the agent or landlord on this booking can mark the inspection complete.');
    }

    if (booking.status !== 'inspection_scheduled') {
      throw new Error(`Cannot mark complete from status "${booking.status}". The inspection must be scheduled first.`);
    }

    const { error: updateError } = await supabase
      .from('inspection_bookings')
      .update({ status: 'inspection_done', updated_at: new Date().toISOString() })
      .eq('id', bookingId);
    if (updateError) throw updateError;

    await supabase.from('notifications').insert({
      user_id: booking.tenant_id,
      title: 'Inspection Complete',
      body: `Please let us know if you're interested in ${booking.properties.title} after your visit.`,
      link: '/dashboard',
      type: 'inspection_done',
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('mark-inspection-done error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
