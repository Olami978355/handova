import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

const FIELDS = [
  'listing_type', 'transaction_type', 'category', 'title', 'description',
  'min_rental_duration', 'house_rules', 'bedrooms', 'bathrooms', 'amenities',
  'land_size_value', 'land_size_unit', 'land_title', 'state', 'lga', 'address',
  'lat', 'lng', 'images', 'videos', 'survey_plan_url', 'price', 'price_period',
  'caution_fee',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const admin = createAdminClient();
    const { companyId, data } = await req.json();
    if (!companyId || !data) throw new Error('companyId and data are required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'agent') throw new Error('Only agents can list for a company.');

    const { data: member } = await admin
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('member_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!member) throw new Error('You are not an active member of this company.');

    const row: Record<string, unknown> = {};
    for (const field of FIELDS) {
      if (field in data) row[field] = data[field];
    }
    row.price_period = data.transaction_type === 'sell' ? 'outright' : data.price_period;
    row.caution_fee = data.transaction_type === 'rent' ? (data.caution_fee || null) : null;
    row.videos = data.videos || [];
    row.owner_id = companyId;
    row.company_id = companyId;
    row.agent_id = user.id;
    row.status = 'pending_review';

    const { data: created, error: insertError } = await admin
      .from('properties')
      .insert(row)
      .select('id')
      .single();
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, propertyId: created.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});
