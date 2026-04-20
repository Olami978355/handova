import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

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

    // 4. Update deal status and calculate payouts
    const totalAmount = deal.amount;
    const commission = Math.floor(totalAmount * 0.10); // 10% commission
    const landlordPayout = totalAmount - commission;

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({ 
        status: 'funds_released', 
        commission_amount: commission,
        landlord_payout_amount: landlordPayout,
        updated_at: new Date().toISOString() 
      })
      .eq('id', dealId);

    if (updateError) throw updateError;

    // 4.1 Update property status and has_active_deal (BUG FIX 4)
    const newStatus = deal.properties.transaction_type === 'sell' ? 'sold' : 'rented';
    const { error: propUpdateError } = await adminSupabase
      .from('properties')
      .update({ 
        status: newStatus,
        has_active_deal: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', deal.property_id);

    if (propUpdateError) throw propUpdateError;

    // 5. Log action
    await logDealAction(adminSupabase, dealId, 'funds_released', user.id, {
      released_by_role: profile.role,
    });

    // 6. Notify parties
    await notifyDealParties(
      adminSupabase,
      deal,
      'Funds Released',
      `Funds for ${deal.properties.title} have been released to the landlord and agent.`,
      `/dashboard/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true }), {
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
