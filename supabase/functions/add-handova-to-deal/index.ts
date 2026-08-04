import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/utils.ts';

// Handova's system profile — the platform's own account, used to show
// visible presence on a deal (e.g. during dispute handling or a manual
// fund release) without granting any actual delegate permissions.
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

    // 1. Verify caller authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Validate caller has permission (admin or moderator only) —
    // regular users can never trigger this, even by crafting a request.
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile || !['admin', 'moderator'].includes(profile.role)) {
      throw new Error('Permission denied. Only admins and moderators can add Handova to a deal.');
    }

    // 3. Fetch deal to confirm it exists and get the tenant_id
    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('id, tenant_id')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    // 4. Check for any existing row for this deal + Handova pair — the
    // (deal_id, principal_id, delegate_id) unique constraint means a
    // previously-revoked row must be reactivated, not re-inserted.
    const { data: existing, error: existingError } = await adminSupabase
      .from('deal_delegates')
      .select('id, status')
      .eq('deal_id', dealId)
      .eq('delegate_id', HANDOVA_SYSTEM_PROFILE_ID)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.status === 'accepted') {
      throw new Error('Handova is already on this deal.');
    }

    if (existing) {
      // Reactivate the previously-revoked row
      const { error: reactivateError } = await adminSupabase
        .from('deal_delegates')
        .update({
          status: 'accepted',
          can_sign: false,
          can_pay: false,
          can_confirm_movein: false,
          responded_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (reactivateError) throw reactivateError;
    } else {
      // 5. Insert directly as accepted — no invite/accept step, and
      // deliberately no permissions granted (visibility only).
      const { error: insertError } = await adminSupabase
        .from('deal_delegates')
        .insert({
          deal_id: dealId,
          principal_id: deal.tenant_id,
          delegate_id: HANDOVA_SYSTEM_PROFILE_ID,
          status: 'accepted',
          can_sign: false,
          can_pay: false,
          can_confirm_movein: false,
          responded_at: new Date().toISOString(),
        });
      if (insertError) throw insertError;
    }

    // Deliberately no logDealAction() call here, and no notification to
    // the tenant — this is an internal admin action, not a party-visible event.

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Add Handova to deal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
