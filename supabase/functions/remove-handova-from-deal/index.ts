import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

const HANDOVA_SYSTEM_PROFILE_ID = '46d3aed8-71dc-4505-b413-c24aac8b07e7';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId } = await req.json();
    if (!dealId) throw new Error('dealId is required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile || !['admin', 'moderator'].includes(profile.role)) {
      throw new Error('Permission denied. Only admins and moderators can remove Handova from a deal.');
    }

    const { data: row, error: rowError } = await adminSupabase
      .from('deal_delegates')
      .select('id')
      .eq('deal_id', dealId)
      .eq('delegate_id', HANDOVA_SYSTEM_PROFILE_ID)
      .eq('status', 'accepted')
      .maybeSingle();
    if (rowError) throw rowError;
    if (!row) throw new Error('Handova is not currently on this deal.');

    const { error: updateError } = await adminSupabase
      .from('deal_delegates')
      .update({ status: 'revoked', responded_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Remove Handova from deal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
