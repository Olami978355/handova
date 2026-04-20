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
    if (deal.status !== 'agreement_signed') {
      throw new Error(`Cannot confirm move-in in ${deal.status} status. Agreement must be signed first.`);
    }

    // 2.2 Verify both signatures are present
    if (!deal.tenant_signed_at || !deal.landlord_signed_at) {
      throw new Error('Both parties must sign the agreement before move-in can be confirmed.');
    }

    // 3. Validate caller has permission (tenant only)
    if (user.id !== deal.tenant_id) {
      throw new Error('Permission denied. Only the tenant can confirm move-in.');
    }

    // 4. Update deal status
    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({ 
        status: 'move_in_confirmed', 
        move_in_date: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', dealId);

    if (updateError) throw updateError;

    // 5. Log action
    await logDealAction(adminSupabase, dealId, 'move_in_confirmed', user.id, {
      move_in_date: new Date().toISOString(),
    });

    // 6. Notify parties
    await notifyDealParties(
      adminSupabase,
      deal,
      'Move-in Confirmed',
      `The tenant has confirmed move-in for ${deal.properties.title}. Funds will be released soon.`,
      `/dashboard/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Confirm move-in error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
