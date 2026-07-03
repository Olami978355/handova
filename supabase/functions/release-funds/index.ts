import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createSupabaseClient, createAdminClient } from '../_shared/supabase.ts';
import { logDealAction, notifyDealParties, corsHeaders } from '../_shared/utils.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const supabase = createSupabaseClient(req);
    const adminSupabase = createAdminClient();
    const { dealId } = await req.json();

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

    // 4. Update deal status. platform_fee, agent_fee, and landlord_payout
    // are already set on this row from deal creation (start-escrow-from-booking) —
    // release-funds just marks the deal settled, it does not recompute payouts.
    const { error: updateError } = await adminSupabase
      .from('deals')
      .update({ 
        status: 'funds_released', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', dealId);
    if (updateError) throw updateError;

    // 4.1 Update property status
    const newStatus = deal.properties.transaction_type === 'sell' ? 'sold' : 'rented';
    const { error: propUpdateError } = await adminSupabase
      .from('properties')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', deal.property_id);
    if (propUpdateError) throw propUpdateError;

    // 4.2 Initiate the actual Paystack transfer.
    // Payout goes to whichever party owns the deal: agent if present, else landlord.
    // Combined payout: agent gets agent_fee + landlord_payout (they forward the
    // landlord's share themselves); if no agent, landlord gets landlord_payout only.
    const payoutRecipientId = deal.agent_id || deal.landlord_id;
    const transferAmountNaira = deal.agent_id
      ? Number(deal.agent_fee) + Number(deal.landlord_payout)
      : Number(deal.landlord_payout);

    const { data: payoutProfile, error: payoutProfileError } = await adminSupabase
      .from('profiles')
      .select('paystack_recipient_code, full_name')
      .eq('id', payoutRecipientId)
      .single();

    if (payoutProfileError || !payoutProfile?.paystack_recipient_code) {
      // Deal is already marked funds_released in our system, but the actual
      // payout could not be sent — recipient has no bank details on file.
      // Do NOT throw here: the deal settlement itself succeeded, only the
      // transfer failed. Surface this clearly via transfer_status instead.
      await adminSupabase
        .from('deals')
        .update({ transfer_status: 'failed' })
        .eq('id', dealId);

      await logDealAction(adminSupabase, dealId, 'transfer_failed', user.id, {
        reason: 'Recipient has no bank details on file',
        payout_recipient_id: payoutRecipientId,
      });

      return new Response(JSON.stringify({
        success: true,
        transferInitiated: false,
        warning: 'Deal marked as funds released, but the payout recipient has no bank details on file. Transfer was NOT sent.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

    const transferReference = `RELEASE_${dealId}_${Date.now()}`;

    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(transferAmountNaira * 100), // kobo
        recipient: payoutProfile.paystack_recipient_code,
        reference: transferReference,
        reason: `Rent Easy payout for deal ${dealId}`,
      }),
    });
    const transferData = await transferRes.json();

    if (!transferData.status) {
      // Same principle: deal settlement already succeeded, only the transfer call failed.
      await adminSupabase
        .from('deals')
        .update({ transfer_status: 'failed' })
        .eq('id', dealId);

      await logDealAction(adminSupabase, dealId, 'transfer_failed', user.id, {
        reason: transferData.message || 'Unknown Paystack transfer error',
      });

      return new Response(JSON.stringify({
        success: true,
        transferInitiated: false,
        warning: `Deal marked as funds released, but the Paystack transfer failed: ${transferData.message}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Transfer accepted by Paystack — status is 'pending' until the
    // transfer webhook confirms success or failure asynchronously.
    await adminSupabase
      .from('deals')
      .update({
        transfer_status: 'pending',
        paystack_transfer_reference: transferReference,
        paystack_transfer_code: transferData.data.transfer_code,
      })
      .eq('id', dealId);

    // 5. Log action
    await logDealAction(adminSupabase, dealId, 'funds_released', user.id, {
      released_by_role: profile.role,
      transfer_reference: transferReference,
      transfer_amount: transferAmountNaira,
      payout_recipient_id: payoutRecipientId,
    });

    // 6. Notify parties
    await notifyDealParties(
      adminSupabase,
      deal,
      'Funds Released',
      `Funds for ${deal.properties.title} have been released to the landlord and agent.`,
      `/dashboard/deals/${dealId}`,
      'deal_state_change'
    );

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
