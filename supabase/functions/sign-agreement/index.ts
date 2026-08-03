import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient, getServiceRoleKey } from '../_shared/supabase.ts';
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

    if (deal.status !== 'agreement_sent') {
      throw new Error(`Cannot sign agreement in ${deal.status} status`);
    }
    if (!deal.agreement_url) {
      throw new Error('Agreement has not been uploaded yet');
    }

    // Determine which "side" this caller can sign for: their own party role,
    // or an accepted delegate invitation granting can_sign on someone else's behalf.
    let signingSide: 'tenant' | 'landlord' | null = null;
    let onBehalfOf: string | null = null; // principal_id, only set when signing as a delegate

    if (user.id === deal.tenant_id) {
      signingSide = 'tenant';
    } else if (user.id === deal.landlord_id || user.id === deal.agent_id) {
      // Agent signs directly as the landlord side when they're the deal's agent —
      // no separate delegate grant needed, matches how they're already tied to the deal.
      signingSide = 'landlord';
    } else {
      const { data: delegateRow } = await adminSupabase
        .from('deal_delegates')
        .select('*')
        .eq('deal_id', dealId)
        .eq('delegate_id', user.id)
        .eq('status', 'accepted')
        .eq('can_sign', true)
        .maybeSingle();

      if (delegateRow) {
        signingSide = delegateRow.principal_id === deal.tenant_id ? 'tenant' : 'landlord';
        onBehalfOf = delegateRow.principal_id;
      }
    }

    if (!signingSide) {
      throw new Error('Permission denied. You are not authorized to sign this agreement.');
    }

    const isTenantSide = signingSide === 'tenant';
    if (isTenantSide && deal.tenant_signed_at) throw new Error('Tenant side has already signed');
    if (!isTenantSide && deal.landlord_signed_at) throw new Error('Landlord side has already signed');

    const updateData: any = { updated_at: new Date().toISOString() };
    if (isTenantSide) {
      updateData.tenant_signed_at = new Date().toISOString();
      updateData.tenant_signed_by = user.id;
    } else {
      updateData.landlord_signed_at = new Date().toISOString();
      updateData.landlord_signed_by = user.id;
    }

    const tenantSigned = updateData.tenant_signed_at || deal.tenant_signed_at;
    const landlordSigned = updateData.landlord_signed_at || deal.landlord_signed_at;
    const bothSigned = !!(tenantSigned && landlordSigned);
    if (bothSigned) {
      updateData.status = 'pending_payment';
    }

    const { error: updateError } = await adminSupabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, dealId, 'agreement_signed', user.id, {
      signing_side: signingSide,
      signed_on_behalf_of: onBehalfOf,
      both_signed: bothSigned,
    });

    // If a delegate signed, always notify the principal they represent —
    // same safety pattern used everywhere else delegates can act.
    if (onBehalfOf) {
      await adminSupabase.from('notifications').insert({
        user_id: onBehalfOf,
        title: 'Agreement Signed by Your Delegate',
        body: `Your delegate has signed the agreement for ${deal.properties.title} on your behalf.`,
        link: `/deals/${dealId}`,
        type: 'deal_state_change',
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();

    if (bothSigned) {
      await notifyDealParties(
        adminSupabase,
        deal,
        'Agreement Fully Signed',
        `Agreement for ${deal.properties.title} is fully signed. Move-in can now be scheduled.`,
        `/deals/${dealId}`,
        'deal_state_change'
      );
    } else {
      const targetId = isTenantSide ? deal.landlord_id : deal.tenant_id;
      if (supabaseUrl && serviceRoleKey) {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            user_id: targetId,
            title: 'Agreement Signed',
            body: `${isTenantSide ? 'Tenant' : 'Landlord'} side has signed the agreement for ${deal.properties.title}.`,
            link: `/deals/${dealId}`,
            type: 'deal_state_change',
          }),
        });
        if (deal.agent_id) {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              user_id: deal.agent_id,
              title: 'Agreement Signed',
              body: `${isTenantSide ? 'Tenant' : 'Landlord'} side has signed the agreement for ${deal.properties.title}.`,
              link: `/deals/${dealId}`,
              type: 'deal_state_change',
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, both_signed: bothSigned }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Sign agreement error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
