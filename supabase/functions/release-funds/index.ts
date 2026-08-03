import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders, executeDealPayout, logAdminAction, sendDealStatusEmails } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId } = await req.json();

    // 1. Verify caller authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Fetch deal details
    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    // 2.1 Verify deal status
    if (deal.status !== 'move_in_confirmed') {
      throw new Error(`Cannot release funds in ${deal.status} status. Move-in must be confirmed first.`);
    }

    // 3. Validate caller has permission (admin or moderator)
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      throw new Error('Permission denied. Only admins or moderators can release funds.');
    }

    // 4. Update deal status. platform_fee, agent_fee, and landlord_payout
    // are already set on this row from deal creation (start-escrow-from-booking) —
    // release-funds just marks the deal settled, it does not recompute payouts.
    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({ 
        status: 'funds_released', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    // 4.1 Update property status
    // status stays 'active'; is_rented is the new source of truth for availability
    const { error: propUpdateError } = await adminSupabase
      .from('properties')
      .update({ 
        is_rented: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', deal.property_id);
    if (propUpdateError) throw propUpdateError;

    // 4.2 Execute payout via shared helper (real Paystack transfer)
    const payoutResult = await executeDealPayout(adminSupabase, deal, user.id, profile.role);
    await logAdminAction(adminSupabase, user.id, 'funds_released', dealId, 'deal', { role: profile.role });
    if (!payoutResult.transferInitiated) {
      return new Response(JSON.stringify({ success: true, transferInitiated: false, warning: payoutResult.warning }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 6. Notify parties
    await notifyDealParties(
      adminSupabase,
      deal,
      'Funds Released',
      `Funds for ${deal.properties.title} have been released to the landlord and agent.`,
      `/deals/${dealId}`,
      'deal_state_change'
    );
    await sendDealStatusEmails(
      adminSupabase,
      deal,
      'Funds Released',
      `Funds for ${deal.properties.title} have been released to the landlord and agent.`,
      `/deals/${dealId}`
    );

    return new Response(JSON.stringify({ success: true, transferInitiated: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Release funds error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
