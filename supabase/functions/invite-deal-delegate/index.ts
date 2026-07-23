import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, delegateUsername, canSign, canPay, canConfirmMovein } = await req.json();

    if (!dealId || !delegateUsername) throw new Error('dealId and delegateUsername are required.');
    if (!canSign && !canPay && !canConfirmMovein) throw new Error('At least one permission must be granted.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    // Only a real party on the deal can delegate — tenant, landlord, or agent
    const isPrincipal = user.id === deal.tenant_id || user.id === deal.landlord_id || user.id === deal.agent_id;
    if (!isPrincipal) throw new Error('Only a party on this deal can invite a delegate.');

    const { data: delegateProfile, error: delegateError } = await adminSupabase
      .from('public_profiles')
      .select('id, full_name')
      .eq('username', delegateUsername)
      .single();
    if (delegateError || !delegateProfile) throw new Error('No user found with that username.');

    // Role-separation: a delegate can never simultaneously be another party on the same deal
    if (
      delegateProfile.id === deal.tenant_id ||
      delegateProfile.id === deal.landlord_id ||
      delegateProfile.id === deal.agent_id
    ) {
      throw new Error('This person is already a party on this deal and cannot also act as a delegate.');
    }

    if (delegateProfile.id === user.id) {
      throw new Error('You cannot delegate to yourself.');
    }

    const { data: invite, error: insertError } = await adminSupabase
      .from('deal_delegates')
      .insert({
        deal_id: dealId,
        principal_id: user.id,
        delegate_id: delegateProfile.id,
        can_sign: !!canSign,
        can_pay: !!canPay,
        can_confirm_movein: !!canConfirmMovein,
      })
      .select()
      .single();
    if (insertError) {
      if (insertError.code === '23505') throw new Error('You have already invited this person on this deal.');
      throw insertError;
    }

    await logDealAction(adminSupabase, dealId, 'delegate_invited', user.id, {
      delegate_id: delegateProfile.id,
      can_sign: !!canSign,
      can_pay: !!canPay,
      can_confirm_movein: !!canConfirmMovein,
    });

    await adminSupabase.from('notifications').insert({
      user_id: delegateProfile.id,
      title: 'Delegate Invitation',
      body: `You've been invited to act on behalf of someone on the deal for ${deal.properties.title}.`,
      link: `/deals/${dealId}`,
      type: 'deal_state_change',
    });

    return new Response(JSON.stringify({ success: true, invite }), {
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
