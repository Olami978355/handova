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

    // 2.1 Verify deal status — normally requires payment_received with both
    // signatures already on file (agreement is signed before payment in this
    // flow), but if the
    // landlord/agent chose to skip the tenancy agreement entirely, the deal
    // goes straight from payment_received to move-in confirmation instead.
    const skippedAgreement = deal.agreement_skipped === true;

    if (skippedAgreement) {
      if (deal.status !== 'payment_received') {
        throw new Error(`Cannot confirm move-in in ${deal.status} status.`);
      }
    } else {
      if (deal.status !== 'payment_received') {
        throw new Error(`Cannot confirm move-in in ${deal.status} status. Agreement must be signed and paid first.`);
      }

      // 2.2 Verify both signatures are present (only applies when an agreement exists)
      if (!deal.tenant_signed_at || !deal.landlord_signed_at) {
        throw new Error('Both parties must sign the agreement before move-in can be confirmed.');
      }
    }

    // 3. Validate caller has permission — tenant directly, or an accepted
    // delegate with can_confirm_movein granted.
    let onBehalfOf: string | null = null;
    if (user.id !== deal.tenant_id) {
      const { data: delegateRow } = await adminSupabase
        .from('deal_delegates')
        .select('*')
        .eq('deal_id', dealId)
        .eq('delegate_id', user.id)
        .eq('principal_id', deal.tenant_id)
        .eq('status', 'accepted')
        .eq('can_confirm_movein', true)
        .maybeSingle();
      if (!delegateRow) {
        throw new Error('Permission denied. Only the tenant or their authorized delegate can confirm move-in.');
      }
      onBehalfOf = deal.tenant_id;
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
      confirmed_by_delegate: !!onBehalfOf,
    });

    // Real-time safety net: if a delegate confirmed, the tenant must be
    // notified immediately — this action is irreversible and releases funds.
    if (onBehalfOf) {
      await adminSupabase.from('notifications').insert({
        user_id: onBehalfOf,
        title: 'Move-in Confirmed by Your Delegate',
        body: `Your delegate has confirmed move-in for ${deal.properties.title} on your behalf. Funds will be released to the landlord.`,
        link: `/deals/${dealId}`,
        type: 'deal_state_change',
      });
    }

    // 6. Notify parties
    await notifyDealParties(
      adminSupabase,
      deal,
      'Move-in Confirmed',
      `The tenant has confirmed move-in for ${deal.properties.title}. Funds will be released soon.`,
      `/deals/${dealId}`,
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
