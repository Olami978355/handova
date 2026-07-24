import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId } = await req.json();
    if (!dealId) throw new Error('dealId is required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (user.id !== deal.landlord_id && user.id !== deal.agent_id) {
      throw new Error('Permission denied. Only the landlord or agent can skip the agreement.');
    }

    if (deal.status !== 'agreement_draft') {
      throw new Error(`Cannot skip agreement in ${deal.status} status.`);
    }

    // Enforcement: skip is only allowed under ₦1,000,000 AND when the
    // property has no caution fee set. Either condition makes a written
    // agreement mandatory.
    const hasCautionFee = deal.properties.caution_fee != null && Number(deal.properties.caution_fee) > 0;
    if (Number(deal.amount) >= 1000000) {
      throw new Error('Deals of ₦1,000,000 or more require a written agreement and cannot be skipped.');
    }
    if (hasCautionFee) {
      throw new Error('A caution fee applies to this property, so a written agreement is required and cannot be skipped.');
    }

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({ status: 'pending_payment', agreement_skipped: true, updated_at: new Date().toISOString() })
      .eq('id', dealId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, dealId, 'agreement_skipped', user.id, {
      amount: deal.amount,
    });

    await adminSupabase.from('notifications').insert({
      user_id: deal.tenant_id,
      title: 'Proceeding Without Written Agreement',
      body: `The landlord/agent has chosen to proceed without a formal tenancy agreement for ${deal.properties.title}. By paying into escrow, you confirm you have agreed on terms directly with them.`,
      type: 'deal_state_change',
      link: `/deals/${dealId}`,
    });

    return new Response(JSON.stringify({ success: true }), {
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
