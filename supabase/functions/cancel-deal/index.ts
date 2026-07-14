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
    const { dealId, reason } = await req.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    // Only admins can cancel a deal
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      throw new Error('Permission denied. Only admins can cancel a deal.');
    }

    // Cannot cancel a deal once the tenant has moved in or funds are already released
    if (deal.status === 'move_in_confirmed' || deal.status === 'funds_released' || deal.status === 'disputed') {
      throw new Error(`Cannot cancel a deal in ${deal.status} status.`);
    }

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason || 'Cancelled by admin.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    // Free the property back up so it can be listed/deal'd again
    await adminSupabase
      .from('properties')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', deal.property_id);

    await logDealAction(adminSupabase, dealId, 'deal_cancelled', user.id, { reason });

    await notifyDealParties(
      adminSupabase,
      deal,
      'Deal Cancelled',
      `The deal for ${deal.properties.title} has been cancelled. Reason: ${reason || 'Not specified'}.`,
      `/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Cancel deal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
