import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, corsHeaders } from '../_shared/utils.ts';
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { delegateRowId } = await req.json();
    if (!delegateRowId) throw new Error('delegateRowId is required.');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: row, error: rowError } = await adminSupabase
      .from('deal_delegates')
      .select('*, delegate:delegate_id(full_name, is_system_account), deals(properties(title))')
      .eq('id', delegateRowId)
      .single();
    if (rowError || !row) throw new Error('Delegate record not found.');

    // Only the principal who granted this delegate can revoke it.
    if (row.principal_id !== user.id) {
      throw new Error('Only the person who invited this delegate can revoke them.');
    }

    if (row.status !== 'accepted' && row.status !== 'pending') {
      throw new Error('This delegate invitation is not currently active.');
    }

    const { error: updateError } = await adminSupabase
      .from('deal_delegates')
      .update({ status: 'revoked', responded_at: new Date().toISOString() })
      .eq('id', delegateRowId);
    if (updateError) throw updateError;

    await logDealAction(adminSupabase, row.deal_id, 'delegate_revoked', user.id, {
      delegate_id: row.delegate_id,
    });

    // Notify the delegate their access was revoked (skip for system accounts).
    if (!row.delegate?.is_system_account) {
      await adminSupabase.from('notifications').insert({
        user_id: row.delegate_id,
        title: 'Delegate Access Revoked',
        body: `Your delegate access on the deal for ${row.deals?.properties?.title || 'a property'} has been revoked.`,
        link: `/deals/${row.deal_id}`,
        type: 'deal_state_change',
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
