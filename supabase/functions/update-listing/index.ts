import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { propertyId, data } = await req.json();

    if (!propertyId || !data) throw new Error('propertyId and data are required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: property, error: propError } = await adminSupabase
      .from('properties')
      .select('owner_id, agent_id, company_id, price, deleted_at')
      .eq('id', propertyId)
      .single();
    if (propError || !property) throw new Error('Property not found');
    if (property.deleted_at) throw new Error('Cannot edit a deleted listing.');

    const isOwner = property.owner_id === user.id;
    const isAssignedAgent = property.agent_id === user.id;

    if (!isOwner && !isAssignedAgent) {
      throw new Error('Only the property owner or assigned agent can edit this listing.');
    }

    // Company agents must retain active membership to edit company listings.
    if (property.company_id && !isOwner && isAssignedAgent) {
      const { data: membership, error: membershipError } = await adminSupabase
        .from('company_members')
        .select('id')
        .eq('company_id', property.company_id)
        .eq('member_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        throw new Error('Your active membership in this company is required to edit this listing.');
      }
    }

    const allowedFields = [
      'listing_type', 'transaction_type', 'category', 'title', 'description',
      'min_rental_duration', 'house_rules', 'bedrooms', 'bathrooms', 'amenities',
      'land_size_value', 'land_size_unit', 'land_title', 'state', 'lga', 'address',
      'lat', 'lng', 'images', 'videos', 'survey_plan_url', 'price', 'price_period', 'caution_fee',
    ];
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in data) updatePayload[field] = data[field];
    }

    const { data: priceChanged, error: updateError } = await adminSupabase.rpc(
      'update_property_with_price_history',
      {
        p_property_id: propertyId,
        p_data: updatePayload,
        p_changed_by: user.id,
      },
    );
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, priceChanged }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
