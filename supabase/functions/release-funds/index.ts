import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders, logAdminAction } from '../_shared/utils.ts';
import { startDealRelease } from '../_shared/release.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, confirmFirstPayout } = await req.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (deal.status !== 'move_in_confirmed') {
      throw new Error(`Cannot release funds in ${deal.status} status. Move-in must be confirmed first.`);
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      throw new Error('Permission denied. Only admins or moderators can release funds.');
    }

    // Release normally starts automatically when the tenant confirms move-in. This path lets
    // admins confirm a held first payout or start one that did not start. A release already
    // in progress or completed is never started twice.
    const result = await startDealRelease(
      adminSupabase,
      dealId,
      { id: user.id, role: profile.role },
      { confirmFirstPayout: !!confirmFirstPayout }
    );

    await logAdminAction(adminSupabase, user.id, 'release_funds_requested', dealId, 'deal', {
      role: profile.role,
      confirm_first_payout: !!confirmFirstPayout,
      resulting_state: result.state,
    });

    const json = (payload: Record<string, unknown>) =>
      new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    if (!result.started) return json({ success: true, alreadyInProgress: true, releaseState: result.state });
    if (result.state === 'held_for_review') return json({ success: true, heldForReview: true });
    if (result.state === 'failed') return json({ success: true, transferInitiated: false, warning: result.warning });
    return json({ success: true, transferInitiated: true, releaseState: result.state });
  } catch (error) {
    console.error('Release funds error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
