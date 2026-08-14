import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders, executeDealPayout, logAdminAction, sendDealStatusEmails, isRecipientFirstPayout, finalizeDealFundsRelease } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, confirmFirstPayout } = await req.json();

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

    // 2.1 Verify deal status
    if (deal.status !== 'move_in_confirmed') {
      throw new Error(`Cannot release funds in ${deal.status} status. Move-in must be confirmed first.`);
    }

    // 3. Validate caller has permission (admin or moderator)
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
      throw new Error('Permission denied. Only admins or moderators can release funds.');
    }

    // 3.1 First-payout safety check. A recipient's first-ever released
    // payout is held for explicit admin confirmation instead of being
    // paid out automatically. Does not touch deal.status or is_rented —
    // nothing user-facing changes until an admin confirms.
    const payoutRecipientId = deal.agent_id || deal.landlord_id;
    if (!confirmFirstPayout) {
      const isFirstPayout = await isRecipientFirstPayout(adminSupabase, payoutRecipientId);
      if (isFirstPayout) {
        await adminSupabase
          .from('deals')
          .update({ transfer_status: 'first_payout_review' })
          .eq('id', dealId);
        await logAdminAction(adminSupabase, user.id, 'first_payout_held_for_review', dealId, 'deal', {
          payout_recipient_id: payoutRecipientId,
        });
        return new Response(JSON.stringify({ success: true, heldForReview: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // 4. Finalize the release: deal + property status, real Paystack
    // payout, first-payout milestone, and notifications. Shared with the
    // admin first-payout confirmation path above.
    const payoutResult = await finalizeDealFundsRelease(adminSupabase, deal, user.id, profile.role);

    if (!payoutResult.transferInitiated) {
      return new Response(JSON.stringify({ success: true, transferInitiated: false, warning: payoutResult.warning }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: true, transferInitiated: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Release funds error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
