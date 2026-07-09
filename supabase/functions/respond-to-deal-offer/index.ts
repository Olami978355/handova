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
    if (fetchError || !offer) throw new Error('Offer not found');

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

    // ACCEPTING — this is the money path, needs the same protections as
    // start-escrow-from-booking: lock the property, check for an existing
    // active deal, only then create. A deal counts as "active" if it's
    // anything other than funds_released — this includes 'disputed' since
    // there is currently no resolution path that would legitimately free
    // the property back up.
    const propertyIdInt = parseInt(offer.property_id.replace(/-/g, '').substring(0, 8), 16);
    const { error: lockError } = await adminSupabase.rpc('execute_sql', {
      sql: `SELECT pg_advisory_xact_lock(${propertyIdInt});`,
    });
    if (lockError) throw lockError;

    const { data: existingDeals, error: existingError } = await adminSupabase
      .from('deals')
      .select('id, status')
      .eq('property_id', offer.property_id)
      .neq('status', 'funds_released');
    if (existingError) throw existingError;

    if (existingDeals && existingDeals.length > 0) {
      throw new Error('This property already has an active deal in progress. This offer can no longer be accepted.');
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

    const isAgent = offererProfile?.role === 'agent';
    // Agent commission only applies when the agent is managing on behalf of
    // a genuinely separate landlord — if the agent is also the property
    // owner (self-listed, no distinct landlord), there is nobody to pay
    // that 10% to, so it must not be deducted from their own payout.
    const hasDistinctLandlord = isAgent && !!propertyData?.owner_id && propertyData.owner_id !== offer.offered_by;
    const platformFee = Math.round(offer.agreed_price * 0.02);
    const agentFee = hasDistinctLandlord ? Math.round(offer.agreed_price * 0.10) : 0;
    const landlordPayout = offer.agreed_price - platformFee - agentFee;

    const dealPayload: Record<string, unknown> = {
      property_id: offer.property_id,
      tenant_id: offer.offered_to,
      landlord_id: propertyData?.owner_id || offer.offered_by,
      amount: offer.agreed_price,
      platform_fee: platformFee,
      agent_fee: agentFee,
      landlord_payout: landlordPayout,
      status: 'agreement_draft',
      move_in_date: offer.move_in_date || null,
      notes: offer.note || null,
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

    await logDealAction(adminSupabase, newDeal.id, 'agreement_draft', user.id, {
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
