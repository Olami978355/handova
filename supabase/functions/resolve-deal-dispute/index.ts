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
    const { dealId, outcome, note } = await req.json();

    if (!dealId || !outcome || !note || !note.trim()) {
      throw new Error('dealId, outcome, and a resolution note are all required.');
    }
    if (outcome !== 'release' && outcome !== 'refund') {
      throw new Error('outcome must be "release" or "refund".');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      throw new Error('Permission denied. Only admins can resolve disputes.');
    }

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (deal.status !== 'disputed') {
      throw new Error(`Cannot resolve a deal in ${deal.status} status. Only disputed deals can be resolved here.`);
    }

    const newStatus = outcome === 'release' ? 'funds_released' : 'refunded';

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({
        status: newStatus,
        resolution_note: note,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    if (outcome === 'release') {
      await adminSupabase
        .from('properties')
        .update({ is_rented: true, updated_at: new Date().toISOString() })
        .eq('id', deal.property_id);
    } else {
      await adminSupabase
        .from('properties')
        .update({ is_rented: false, updated_at: new Date().toISOString() })
        .eq('id', deal.property_id);
    }

    await logDealAction(adminSupabase, dealId, 'dispute_resolved', user.id, { outcome, note });

    await notifyDealParties(
      adminSupabase,
      deal,
      'Dispute Resolved',
      outcome === 'release'
        ? `The dispute for ${deal.properties.title} has been resolved. Funds have been released. Note: ${note}`
        : `The dispute for ${deal.properties.title} has been resolved. The tenant has been refunded. Note: ${note}`,
      `/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Resolve deal dispute error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
