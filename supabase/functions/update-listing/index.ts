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
      .select('owner_id, agent_id, price, deleted_at')
      .eq('id', propertyId)
      .single();
    if (propError || !property) throw new Error('Property not found');
    if (property.deleted_at) throw new Error('Cannot edit a deleted listing.');

    if (property.owner_id !== user.id && property.agent_id !== user.id) {
      throw new Error('Only the landlord or agent who listed this property can edit it.');
    }

    const allowedFields = [
      'listing_type', 'transaction_type', 'category', 'title', 'description',
      'min_rental_duration', 'house_rules', 'bedrooms', 'bathrooms', 'amenities',
      'land_size_value', 'land_size_unit', 'land_title', 'state', 'lga', 'address',
      'lat', 'lng', 'images', 'videos', 'survey_plan_url', 'price', 'price_period',
    ];
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in data) updatePayload[field] = data[field];
    }

    const priceChanged = typeof data.price === 'number' && data.price !== property.price;

    const { error: updateError } = await adminSupabase
      .from('properties')
      .update(updatePayload)
      .eq('id', propertyId);
    if (updateError) throw updateError;

    if (priceChanged) {
      await adminSupabase.from('property_price_history').insert({
        property_id: propertyId,
        old_price: property.price,
        new_price: data.price,
        changed_by: user.id,
      });
    }

    return new Response(JSON.stringify({ success: true, priceChanged }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
