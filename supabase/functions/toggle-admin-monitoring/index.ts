import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, logAdminAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, enable, note } = await req.json();

    if (!dealId || typeof enable !== 'boolean') throw new Error('dealId and enable (boolean) are required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await adminSupabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      throw new Error('Permission denied. Only admins or moderators can add RentEasy monitoring to a deal.');
    }

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({
        admin_monitoring: enable,
        admin_monitoring_note: enable ? (note || null) : null,
        admin_monitoring_added_by: enable ? user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, dealId, enable ? 'admin_monitoring_added' : 'admin_monitoring_removed', user.id, { note });
    await logAdminAction(adminSupabase, user.id, enable ? 'admin_monitoring_added' : 'admin_monitoring_removed', dealId, 'deal', { note });

    if (enable) {
      await notifyDealParties(
        adminSupabase,
        deal,
        'RentEasy is Monitoring This Deal',
        `A RentEasy team member is now overseeing this deal for ${deal.properties.title} to ensure everything goes smoothly.${note ? ` Note: ${note}` : ''}`,
        `/deals/${dealId}`,
        'deal_state_change'
      );
    }

    return new Response(JSON.stringify({ success: true, admin_monitoring: enable }), {
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
