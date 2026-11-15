import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';
import { startDealRelease } from '../_shared/release.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId } = await req.json();
    if (!dealId) throw new Error('dealId is required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile || !['admin', 'moderator'].includes(profile.role)) {
      throw new Error('Permission denied. Only admins and moderators can retry a transfer.');
    }

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals').select('*, properties(*)').eq('id', dealId).single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (!['move_in_confirmed', 'funds_released'].includes(deal.status)) {
      throw new Error(`Cannot retry a release in ${deal.status} status.`);
    }
    if (deal.release_status !== 'failed') {
      throw new Error(`Cannot retry a release with status "${deal.release_status}". Only a failed release can be retried.`);
    }

    const result = await startDealRelease(adminSupabase, dealId, { id: user.id, role: profile.role });

    return new Response(JSON.stringify({
      success: true,
      transferInitiated: result.started && ['processing', 'completed'].includes(result.state),
      releaseState: result.state,
      warning: result.warning,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Retry deal transfer error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
