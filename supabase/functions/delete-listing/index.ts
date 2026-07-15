import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { propertyId } = await req.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: property, error: propError } = await adminSupabase
      .from('properties')
      .select('owner_id, agent_id')
      .eq('id', propertyId)
      .single();
    if (propError || !property) throw new Error('Property not found');

    if (property.owner_id !== user.id && property.agent_id !== user.id) {
      throw new Error('Only the landlord or agent who listed this property can delete it.');
    }

    const { data: activeDeals, error: dealsError } = await adminSupabase
      .from('deals')
      .select('id, status')
      .eq('property_id', propertyId)
      .not('status', 'in', '(cancelled,refunded,funds_released)');
    if (dealsError) throw dealsError;
    if (activeDeals && activeDeals.length > 0) {
      throw new Error('Cannot delete a listing with an active deal in progress. Resolve or complete the deal first.');
    }

    const { error: updateError } = await adminSupabase
      .from('properties')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', propertyId);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
