import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { offerId, accept } = await req.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: offer, error: fetchError } = await adminSupabase
      .from('custom_deal_offers')
      .select('*')
      .eq('id', offerId)
      .single();
    if (fetchError || !offer) {
      console.error('Offer fetch failed. offerId:', offerId, 'error:', JSON.stringify(fetchError));
      throw new Error(fetchError ? `Offer lookup failed: ${fetchError.message}` : 'Offer not found');
    }

    // Only the person the offer was made to can respond to it
    if (user.id !== offer.offered_to) {
      throw new Error('Permission denied. Only the offer recipient can respond.');
    }

    if (offer.status !== 'pending') {
      throw new Error(`This offer has already been ${offer.status}.`);
    }

    if (!accept) {
      const { error: declineError } = await adminSupabase
        .from('custom_deal_offers')
        .update({ status: 'declined' })
        .eq('id', offerId);
      if (declineError) throw declineError;

      return new Response(JSON.stringify({ success: true, dealCreated: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: offererProfile } = await adminSupabase
      .from('profiles')
      .select('id, role')
      .eq('id', offer.offered_by)
      .single();

    const { data: propertyData } = await adminSupabase
      .from('properties')
      .select('owner_id')
      .eq('id', offer.property_id)
      .single();

    // Agent commission (10%) always applies whenever an agent made this
    // offer, regardless of whether landlord_id happens to equal agent_id —
    // that just means the real landlord isn't a RentEasy account. The
    // agent still earns their commission and receives the landlord's
    // share too, forwarding it to the real landlord themselves outside
    // the platform. RentEasy always pays the agent one combined transfer.
    const isAgent = offererProfile?.role === 'agent';
    const platformFee = Math.round(offer.agreed_price * 0.02);
    const agentFee = isAgent ? Math.round(offer.agreed_price * 0.10) : 0;
    const landlordPayout = offer.agreed_price - platformFee - agentFee;

    const dealPayload: Record<string, unknown> = {
      property_id: offer.property_id,
      tenant_id: offer.offered_to,
      landlord_id: propertyData?.owner_id || offer.offered_by,
      amount: offer.agreed_price,
      platform_fee: platformFee,
      agent_fee: agentFee,
      agent_commission_rate: isAgent ? 10 : 0,
      landlord_payout: landlordPayout,
      status: 'agreement_draft',
      move_in_date: offer.move_in_date || null,
      notes: offer.note || null,
      duration: offer.duration || null,
    };
    if (isAgent) {
      dealPayload.agent_id = offer.offered_by;
    }

    const { data: newDeal, error: dealError } = await adminSupabase
      .from('deals')
      .insert(dealPayload)
      .select()
      .single();
    if (dealError) throw new Error('Deal creation failed: ' + dealError.message);

    const { error: acceptError } = await adminSupabase
      .from('custom_deal_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId);
    if (acceptError) throw acceptError;

    await logDealAction(adminSupabase, newDeal.id, 'deal_created', user.id, {
      source: 'custom_deal_offer',
      offer_id: offerId,
    });

    return new Response(JSON.stringify({ success: true, dealCreated: true, dealId: newDeal.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Respond to deal offer error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
