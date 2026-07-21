import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { propertyId, delist } = await req.json();

    if (typeof delist !== 'boolean') throw new Error('delist (boolean) is required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: property, error: propError } = await adminSupabase
      .from('properties')
      .select('owner_id, agent_id, deleted_at')
      .eq('id', propertyId)
      .single();
    if (propError || !property) throw new Error('Property not found');
    if (property.deleted_at) throw new Error('This listing has already been deleted.');

    if (property.owner_id !== user.id && property.agent_id !== user.id) {
      throw new Error('Only the landlord or agent who listed this property can delist it.');
    }

    // No active-deal check here, deliberately — delisting just hides the
    // property from new browsers, it never touches money-in-progress deals.
    const { error: updateError } = await adminSupabase
      .from('properties')
      .update({ is_delisted: delist, updated_at: new Date().toISOString() })
      .eq('id', propertyId);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, is_delisted: delist }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
