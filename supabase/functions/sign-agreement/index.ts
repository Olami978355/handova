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

    // Which side can this caller sign for: their own role, or an accepted delegate with can_sign.
    let signingSide: 'tenant' | 'landlord' | null = null;
    let onBehalfOf: string | null = null;

    if (user.id === deal.tenant_id) {
      signingSide = 'tenant';
    } else if (user.id === deal.landlord_id || user.id === deal.agent_id) {
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

    // Bind the signature to the exact document being signed: hash the stored file now.
    let docBytes: ArrayBuffer;
    if (deal.agreement_path) {
      const { data: file, error: downloadError } = await adminSupabase.storage
        .from('agreements')
        .download(deal.agreement_path);
      if (downloadError || !file) {
        throw new Error('The agreement document could not be read. Ask for it to be uploaded again.');
      }
      docBytes = await file.arrayBuffer();
    } else {
      const res = await fetch(deal.agreement_url); // older deals stored only a link
      if (!res.ok) throw new Error('The agreement document could not be read. Ask for it to be uploaded again.');
      docBytes = await res.arrayBuffer();
    }
    const digest = await crypto.subtle.digest('SHA-256', docBytes);
    const documentSha256 = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    // The DB function locks the deal row: no race, and a signature can't attach to a different file.
    const { data: signResult, error: signError } = await adminSupabase.rpc('sign_deal_agreement', {
      p_deal_id: dealId,
      p_signer_id: user.id,
      p_side: signingSide,
      p_on_behalf_of: onBehalfOf,
      p_document_sha256: documentSha256,
      p_document_path: deal.agreement_path ?? null,
    });
    if (signError) throw new Error(signError.message);
    const bothSigned = !!signResult?.both_signed;
    const otherSideReset = !!signResult?.other_side_reset;

    await logDealAction(adminSupabase, dealId, 'agreement_signed', user.id, {
      signing_side: signingSide,
      signed_on_behalf_of: onBehalfOf,
      both_signed: bothSigned,
      document_sha256: documentSha256,
      other_side_reset: otherSideReset,
    });

    if (otherSideReset) {
      await notifyDealParties(
        adminSupabase, deal,
        'Agreement Changed - Signature Needed',
        `The agreement for ${deal.properties.title} changed after an earlier signature. Please review and sign the current version.`,
        `/deals/${dealId}`, 'deal_state_change'
      );
    }

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
        adminSupabase, deal, 'Agreement Fully Signed',
        `Agreement for ${deal.properties.title} is fully signed. Move-in can now be scheduled.`,
        `/deals/${dealId}`, 'deal_state_change'
      );
    } else {
      const targetId = isTenantSide ? deal.landlord_id : deal.tenant_id;
      if (supabaseUrl && serviceRoleKey) {
        const notify = (userId: string) =>
          fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              user_id: userId,
              title: 'Agreement Signed',
              body: `${isTenantSide ? 'Tenant' : 'Landlord'} side has signed the agreement for ${deal.properties.title}.`,
              link: `/deals/${dealId}`,
              type: 'deal_state_change',
            }),
          });
        await notify(targetId);
        if (deal.agent_id) await notify(deal.agent_id);
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
