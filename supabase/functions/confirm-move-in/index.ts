import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';
import { startDealRelease } from '../_shared/release.ts';

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

    // A repeat confirmation is a harmless no-op. Normally the deal must be paid with both
    // signatures on file; if the agreement was skipped, signatures are not required.
    const alreadyConfirmed = ['move_in_confirmed', 'funds_released'].includes(deal.status);
    const skippedAgreement = deal.agreement_skipped === true;

    if (!alreadyConfirmed) {
      if (deal.status !== 'payment_received') {
        throw new Error(
          skippedAgreement
            ? `Cannot confirm move-in in ${deal.status} status.`
            : `Cannot confirm move-in in ${deal.status} status. Agreement must be signed and paid first.`
        );
      }
      if (!skippedAgreement && (!deal.tenant_signed_at || !deal.landlord_signed_at)) {
        throw new Error('Both parties must sign the agreement before move-in can be confirmed.');
      }
    }

    // Tenant directly, or an accepted delegate with can_confirm_movein.
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

    if (alreadyConfirmed) {
      return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Conditional update = idempotent: a double tap cannot confirm twice or start two releases.
    const confirmedAt = new Date().toISOString();
    const { data: confirmedRows, error: updateError } = await adminSupabase
      .from('deals')
      .update({ status: 'move_in_confirmed', move_in_date: confirmedAt, updated_at: confirmedAt })
      .eq('id', dealId)
      .eq('status', 'payment_received')
      .select('id');
    if (updateError) throw updateError;
    if (!confirmedRows || confirmedRows.length === 0) {
      return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    await logDealAction(adminSupabase, dealId, 'move_in_confirmed', user.id, {
      move_in_date: confirmedAt,
      confirmed_by_delegate: !!onBehalfOf,
    });

    if (onBehalfOf) {
      await adminSupabase.from('notifications').insert({
        user_id: onBehalfOf,
        title: 'Move-in Confirmed by Your Delegate',
        body: `Your delegate has confirmed move-in for ${deal.properties.title} on your behalf. The payment release has been started.`,
        link: `/deals/${dealId}`,
        type: 'deal_state_change',
      });
    }

    // Start the authorised release immediately (no waiting period).
    let release: { state: string; warning?: string } = { state: 'unknown' };
    try {
      release = await startDealRelease(adminSupabase, dealId, { id: user.id, role: 'system' });
    } catch (releaseError) {
      console.error('Release start error:', releaseError);
      release = { state: 'failed', warning: (releaseError as Error).message };
    }

    const releaseText =
      release.state === 'held_for_review'
        ? 'The payout is going through a standard security check before it is released.'
        : release.state === 'failed'
          ? 'The release could not be started automatically. Our team has been alerted.'
          : 'The payment release has been started. Bank settlement time depends on the receiving bank.';

    await notifyDealParties(
      adminSupabase,
      deal,
      'Move-in Confirmed',
      `The tenant has confirmed move-in for ${deal.properties.title}. ${releaseText}`,
      `/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true, release_state: release.state }), {
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
