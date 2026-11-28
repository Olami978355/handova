import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: jsonHeaders,
        status: 405,
      });
    }

    const supabase = createSupabaseClient(req);
    const admin = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const action = body?.action;
    const propertyId = body?.propertyId;
    const offerId = body?.offerId;
    const payload = body?.data ?? {};

    if (!['create', 'update', 'withdraw'].includes(action)) {
      throw new Error('Invalid action.');
    }

    if (action === 'create' && !propertyId) {
      throw new Error('propertyId is required.');
    }

    if (action !== 'create' && !offerId) {
      throw new Error('offerId is required.');
    }

    let property: {
      id: string;
      owner_id: string;
      agent_id: string | null;
      company_id: string | null;
      price: number;
      deleted_at: string | null;
      is_delisted: boolean;
      status: string;
    } | null = null;

    if (action === 'create') {
      const { data, error } = await admin
        .from('properties')
        .select('id, owner_id, agent_id, company_id, price, deleted_at, is_delisted, status')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) throw error;
      property = data;
    } else {
      const { data: offer, error } = await admin
        .from('property_offers')
        .select('id, property_id, created_by, status')
        .eq('id', offerId)
        .maybeSingle();

      if (error) throw error;
      if (!offer) throw new Error('Offer not found.');

      const { data, error: propertyError } = await admin
        .from('properties')
        .select('id, owner_id, agent_id, company_id, price, deleted_at, is_delisted, status')
        .eq('id', offer.property_id)
        .maybeSingle();

      if (propertyError) throw propertyError;
      property = data;
    }

    if (!property) throw new Error('Property not found.');
    if (property.deleted_at) throw new Error('This listing has been deleted.');
    if (property.is_delisted) throw new Error('This listing is delisted and cannot have offers.');

    const isOwner = property.owner_id === user.id;
    let isAssignedAgent = property.agent_id === user.id;

    if (property.company_id && !isOwner) {
      // Company listings may assign staff through property_agents
      // instead of properties.agent_id.
      const { data: assignment, error: assignmentError } = await admin
        .from('property_agents')
        .select('agent_id')
        .eq('property_id', property.id)
        .eq('agent_id', user.id)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      isAssignedAgent = isAssignedAgent || Boolean(assignment);

      if (!isAssignedAgent) {
        throw new Error('Only the property owner or assigned agent can manage its offers.');
      }

      const { data: membership, error: membershipError } = await admin
        .from('company_members')
        .select('id')
        .eq('company_id', property.company_id)
        .eq('member_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        throw new Error('Your active company membership is required.');
      }
    } else if (!isOwner && !isAssignedAgent) {
      throw new Error('Only the property owner or assigned agent can manage its offers.');
    }

    if (action === 'create') {
      if (property.status !== 'active') {
        throw new Error('Only active listings can have offers.');
      }

      // Expire an elapsed offer before creating another one. This keeps
      // the one-active-offer rule usable without deleting offer history.
      const { data: currentOffer, error: currentOfferError } = await admin
        .from('property_offers')
        .select('id, expires_at')
        .eq('property_id', property.id)
        .eq('status', 'active')
        .maybeSingle();

      if (currentOfferError) throw currentOfferError;

      if (currentOffer?.expires_at && new Date(currentOffer.expires_at).getTime() <= Date.now()) {
        const now = new Date().toISOString();
        const { data: expired, error: expireError } = await admin
          .from('property_offers')
          .update({
            status: 'expired',
            updated_by: user.id,
            updated_at: now,
          })
          .eq('id', currentOffer.id)
          .eq('status', 'active')
          .lte('expires_at', now)
          .select('id')
          .maybeSingle();

        if (expireError) throw expireError;
        if (!expired) {
          throw new Error('The existing offer changed. Refresh and try again.');
        }
      } else if (currentOffer) {
        throw new Error('This property already has an active offer. Edit or withdraw it before creating another.');
      }

      const allowed = [
        'offer_type', 'headline', 'description', 'offer_price',
        'payment_terms', 'starts_at', 'expires_at',
      ];

      const data: Record<string, unknown> = {
        property_id: property.id,
        created_by: user.id,
        reference_price: null,
      };

      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
          data[key] = payload[key];
        }
      }

      if (data.offer_type === 'price_reduction') {
        data.reference_price = property.price;
      }

      const { data: created, error } = await admin
        .from('property_offers')
        .insert(data)
        .select('id, property_id, offer_type, headline, description, reference_price, offer_price, payment_terms, starts_at, expires_at, status, created_at, updated_at')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, offer: created }), {
        headers: jsonHeaders,
        status: 201,
      });
    }

    const { data: existing, error: existingError } = await admin
      .from('property_offers')
      .select('id, property_id, offer_type, headline, description, reference_price, offer_price, payment_terms, starts_at, expires_at, status, created_at, updated_at')
      .eq('id', offerId)
      .eq('property_id', property.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Offer not found.');

    if (existing.status === 'active' && existing.expires_at) {
      const now = new Date().toISOString();

      if (new Date(existing.expires_at).getTime() <= Date.now()) {
        const { data: expired, error: expireError } = await admin
          .from('property_offers')
          .update({
            status: 'expired',
            updated_by: user.id,
            updated_at: now,
          })
          .eq('id', offerId)
          .eq('status', 'active')
          .lte('expires_at', now)
          .select('id')
          .maybeSingle();

        if (expireError) throw expireError;
        if (!expired) {
          throw new Error('This offer changed. Refresh and try again.');
        }

        throw new Error('This offer has expired and can no longer be changed.');
      }
    }

    if (existing.status !== 'active') {
      throw new Error('Only active offers can be changed.');
    }

    if (action === 'withdraw') {
      const { data: withdrawn, error } = await admin
        .from('property_offers')
        .update({
          status: 'withdrawn',
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .eq('status', 'active')
        .select('id, property_id, offer_type, headline, description, reference_price, offer_price, payment_terms, starts_at, expires_at, status, created_at, updated_at')
        .maybeSingle();

      if (error) throw error;
      if (!withdrawn) {
        throw new Error('This offer is no longer active. Refresh and try again.');
      }

      return new Response(JSON.stringify({ success: true, offer: withdrawn }), {
        headers: jsonHeaders,
        status: 200,
      });
    }

    const allowed = [
      'offer_type', 'headline', 'description', 'offer_price',
      'payment_terms', 'starts_at', 'expires_at',
    ];

    const update: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        update[key] = payload[key];
      }
    }

    const nextType = update.offer_type ?? existing.offer_type;

    if (nextType === 'price_reduction') {
      update.reference_price = existing.reference_price ?? property.price;
    } else {
      update.reference_price = null;
      update.offer_price = null;
    }

    const { data: updated, error } = await admin
      .from('property_offers')
      .update(update)
      .eq('id', offerId)
      .eq('status', 'active')
      .select('id, property_id, offer_type, headline, description, reference_price, offer_price, payment_terms, starts_at, expires_at, status, created_at, updated_at')
      .maybeSingle();

    if (error) throw error;
    if (!updated) throw new Error('This offer is no longer active. Refresh and try again.');

    return new Response(JSON.stringify({ success: true, offer: updated }), {
      headers: jsonHeaders,
      status: 200,
    });
  } catch (error) {
    const dbError = error as { code?: string; message?: string };
    const isConflict = dbError?.code === '23505';

    const message = isConflict
      ? 'This property already has an active offer. Edit or withdraw it before creating another.'
      : error instanceof Error ? error.message : String(error);

    const status = isConflict ? 409 : message === 'Unauthorized' ? 401 : 400;

    return new Response(JSON.stringify({ error: message }), {
      headers: jsonHeaders,
      status,
    });
  }
});
