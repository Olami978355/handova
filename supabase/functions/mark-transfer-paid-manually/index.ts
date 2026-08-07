import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, note } = await req.json();
    if (!dealId) throw new Error('dealId is required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile || !['admin', 'moderator'].includes(profile.role)) {
      throw new Error('Permission denied. Only admins and moderators can mark a payout as manually paid.');
    }

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals').select('id, status, transfer_status').eq('id', dealId).single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (deal.status !== 'funds_released') {
      throw new Error('This deal has not been marked as funds released yet.');
    }
    if (deal.transfer_status === 'success') {
      throw new Error('This payout is already marked as paid.');
    }

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({
        transfer_status: 'success',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, dealId, 'transfer_marked_manual', user.id, {
      note: note || null,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Mark transfer paid manually error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
