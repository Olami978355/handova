import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { executeDealPayout, corsHeaders } from '../_shared/utils.ts';

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

    if (deal.status !== 'funds_released') {
      throw new Error('This deal has not been marked as funds released yet.');
    }
    if (deal.transfer_status !== 'failed') {
      throw new Error(`Cannot retry a transfer with status "${deal.transfer_status}". Only a failed transfer can be retried.`);
    }

    const payoutResult = await executeDealPayout(adminSupabase, deal, user.id, profile.role, { retried: true });

    return new Response(JSON.stringify({ success: true, ...payoutResult }), {
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
