import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders, executeDealPayout, logAdminAction } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId, outcome, note } = await req.json();

    if (!dealId || !outcome || !note || !note.trim()) {
      throw new Error('dealId, outcome, and a resolution note are all required.');
    }
    if (outcome !== 'release' && outcome !== 'refund') {
      throw new Error('outcome must be "release" or "refund".');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      throw new Error('Permission denied. Only admins can resolve disputes.');
    }

    const { data: deal, error: dealError } = await adminSupabase
      .from('deals')
      .select('*, properties(*)')
      .eq('id', dealId)
      .single();
    if (dealError || !deal) throw new Error('Deal not found');

    if (deal.status !== 'disputed') {
      throw new Error(`Cannot resolve a deal in ${deal.status} status. Only disputed deals can be resolved here.`);
    }

    let responseExtra: Record<string, any> = {};

    if (outcome === 'release') {
      // Mark deal settled first, then run the same real payout logic release-funds uses.
      const { error: statusErr } = await adminSupabase
        .from('deals')
        .update({ status: 'funds_released', resolution_note: note, resolved_by: user.id, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', dealId);
      if (statusErr) throw statusErr;

      await adminSupabase.from('properties').update({ is_rented: true, updated_at: new Date().toISOString() }).eq('id', deal.property_id);

      const payoutResult = await executeDealPayout(adminSupabase, deal, user.id, profile.role, { via: 'dispute_resolution', dispute_note: note });
      responseExtra = payoutResult;
    } else {
      // Refund — full amount, no fee, real Paystack refund.
      if (!deal.paystack_reference) {
        throw new Error('No payment reference found on this deal — nothing to refund.');
      }
      const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
      const refundResponse = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${paystackSecret}` },
        body: JSON.stringify({ transaction: deal.paystack_reference, amount: Math.round(Number(deal.amount) * 100) }),
      });
      const refundData = await refundResponse.json();
      if (!refundResponse.ok) {
        throw new Error(`Paystack refund failed: ${refundData.message}`);
      }

      const { error: updateError } = await adminSupabase
        .from('deals')
        .update({
          status: 'refunded',
          resolution_note: note,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          cancellation_fee: 0,
          refund_amount: deal.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);
      if (updateError) throw updateError;

      await logDealAction(adminSupabase, dealId, 'dispute_resolved', user.id, { outcome, note, refundAmount: deal.amount });
    }

    if (outcome === 'release') {
      await logDealAction(adminSupabase, dealId, 'dispute_resolved', user.id, { outcome, note });
    }
    await logAdminAction(adminSupabase, user.id, 'dispute_resolved', dealId, 'deal', { outcome, note });

    await notifyDealParties(
      adminSupabase,
      deal,
      'Dispute Resolved',
      outcome === 'release'
        ? `The dispute for ${deal.properties.title} has been resolved. Funds have been released. Note: ${note}`
        : `The dispute for ${deal.properties.title} has been resolved. The tenant has been fully refunded. Note: ${note}`,
      `/deals/${dealId}`,
      'deal_state_change'
    );

    return new Response(JSON.stringify({ success: true, outcome, ...responseExtra }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Resolve deal dispute error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
