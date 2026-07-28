import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, revieweeId, rating, comment } = await req.json();

    if (!dealId || !revieweeId) throw new Error('dealId and revieweeId are required.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating must be a whole number between 1 and 5.');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('id, status, tenant_id, landlord_id, agent_id')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found.');

    if (deal.status !== 'funds_released') {
      throw new Error('You can only leave a review after the deal is fully complete.');
    }

    const isTenant = user.id === deal.tenant_id;
    const isLandlord = user.id === deal.landlord_id;
    const isAgent = user.id === deal.agent_id;
    if (!isTenant && !isLandlord && !isAgent) {
      throw new Error('Only a party on this deal can leave a review.');
    }
    if (user.id === revieweeId) {
      throw new Error('You cannot review yourself.');
    }

    // A tenant may review the landlord and/or the agent; a landlord/agent may
    // only review the tenant. Reviewee must actually be a party on this deal.
    const revieweeIsValidParty = revieweeId === deal.tenant_id || revieweeId === deal.landlord_id || revieweeId === deal.agent_id;
    if (!revieweeIsValidParty) {
      throw new Error('This person is not a party on this deal.');
    }
    if (isTenant && revieweeId !== deal.landlord_id && revieweeId !== deal.agent_id) {
      throw new Error('As the tenant, you can only review the landlord or agent.');
    }
    if ((isLandlord || isAgent) && revieweeId !== deal.tenant_id) {
      throw new Error('You can only review the tenant on this deal.');
    }

    const { data: review, error: insertError } = await adminSupabase
      .from('deal_reviews')
      .insert({
        deal_id: dealId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') throw new Error('You have already reviewed this person for this deal.');
      throw insertError;
    }

    const { data: reviewerProfile } = await adminSupabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    await adminSupabase.from('notifications').insert({
      user_id: revieweeId,
      title: 'New Review Received',
      body: `You received a ${rating}-star review on a completed deal.`,
      link: reviewerProfile?.username ? `/u/${reviewerProfile.username}` : `/deals/${dealId}`,
      type: 'deal_state_change',
    });

    return new Response(JSON.stringify({ success: true, review }), {
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
