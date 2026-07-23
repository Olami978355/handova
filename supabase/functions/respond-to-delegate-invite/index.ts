import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { inviteId, accept } = await req.json();

    if (!inviteId || typeof accept !== 'boolean') throw new Error('inviteId and accept (boolean) are required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: invite, error: inviteError } = await adminSupabase
      .from('deal_delegates')
      .select('*, deals(*, properties(*))')
      .eq('id', inviteId)
      .single();
    if (inviteError || !invite) throw new Error('Invitation not found');

    if (invite.delegate_id !== user.id) {
      throw new Error('Only the invited delegate can respond to this invitation.');
    }
    if (invite.status !== 'pending') {
      throw new Error(`This invitation has already been ${invite.status}.`);
    }

    const newStatus = accept ? 'accepted' : 'declined';
    const { error: updateError } = await adminSupabase
      .from('deal_delegates')
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq('id', inviteId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, invite.deal_id, `delegate_${newStatus}`, user.id, { invite_id: inviteId });

    await adminSupabase.from('notifications').insert({
      user_id: invite.principal_id,
      title: accept ? 'Delegate Accepted' : 'Delegate Declined',
      body: accept
        ? `Your delegate has accepted and can now act on your behalf for ${invite.deals.properties.title}.`
        : `Your delegate invitation for ${invite.deals.properties.title} was declined.`,
      link: `/deals/${invite.deal_id}`,
      type: 'deal_state_change',
    });

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
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
