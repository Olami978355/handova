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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (deal.deal_type !== 'house_sale' && deal.deal_type !== 'land_sale') {
      throw new Error('This endpoint is only for sale transactions. Use confirm-move-in for rentals.');
    }

    const skippedAgreement = deal.agreement_skipped === true;
    if (skippedAgreement) {
      if (deal.status !== 'payment_received') {
        throw new Error(`Cannot confirm handover in ${deal.status} status.`);
      }
    } else {
      if (deal.status !== 'agreement_signed') {
        throw new Error(`Cannot confirm handover in ${deal.status} status. Contract must be signed first.`);
      }
      if (!deal.tenant_signed_at || !deal.landlord_signed_at) {
        throw new Error('Both parties must sign the contract before handover can be confirmed.');
      }
    }

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
        throw new Error('Permission denied. Only the buyer or their authorized delegate can confirm handover.');
      }
      onBehalfOf = deal.tenant_id;
    }

    // Reuses the same 'move_in_confirmed' status value as rentals — release-funds,
    // dispute resolution, and everything else downstream stays unchanged. The
    // distinction is purely in the copy shown to the user and logged here.
    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({
        status: 'move_in_confirmed',
        move_in_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, dealId, 'handover_confirmed', user.id, {
      handover_date: new Date().toISOString(),
      confirmed_by_delegate: !!onBehalfOf,
    });

    if (onBehalfOf) {
      await adminSupabase.from('notifications').insert({
        user_id: onBehalfOf,
        title: 'Handover Confirmed by Your Delegate',
        body: `Your delegate has confirmed handover for ${deal.properties.title} on your behalf. Funds will be released to the seller.`,
        link: `/deals/${dealId}`,
        type: 'deal_state_change',
      });
    }

    await notifyDealParties(
      adminSupabase,
      deal,
      'Handover Confirmed',
      `The buyer has confirmed handover for ${deal.properties.title}. Funds will be released soon.`,
      `/dashboard/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Confirm handover error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
