import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders, sendDealStatusEmails } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, reason } = await req.json();

    // 1. Verify caller authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // 2. Fetch deal details
    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) throw new Error('Deal not found');

    // 3. Validate caller has permission (admin only)
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Permission denied. Only admins can mark deals as disputed.');
    }

    // 4. Update deal status
    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({ 
        status: 'disputed', 
        dispute_reason: reason || 'Deal marked as disputed by admin.',
        updated_at: new Date().toISOString() 
      })
      .eq('id', dealId);

    if (updateError) throw updateError;

    // 5. Log action
    await logDealAction(adminSupabase, dealId, 'deal_disputed', user.id, {
      reason,
    });

    // 6. Notify parties
    await notifyDealParties(
      adminSupabase,
      deal,
      'Deal Disputed',
      `The deal for ${deal.properties.title} has been marked as disputed. Our support team will contact you.`,
      `/deals/${dealId}`,
      'deal_state_change'
    );
    await sendDealStatusEmails(
      adminSupabase,
      deal,
      'Disputed',
      `The deal for ${deal.properties.title} has been marked as disputed. Our support team will contact you.`,
      `/deals/${dealId}`,
      'dispute'
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Mark disputed error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
