import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Same key resolution used in supabase.ts — the old SUPABASE_SERVICE_ROLE_KEY
// env var is no longer populated under the new sb_secret_ key system, so it
// must be read from SUPABASE_SECRET_KEYS instead, or notifications silently
// fail to send across the entire deal flow.
function getServiceRoleKey(): string {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      const key = parsed['default'] ?? Object.values(parsed)[0];
      if (key) return key as string;
    } catch { /* fall through */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

export const logDealAction = async (
  supabase: SupabaseClient,
  dealId: string,
  action: string,
  performedBy: string,
  details: Record<string, any>
) => {
  const { error } = await supabase
    .from('deal_logs')
    .insert({
      deal_id: dealId,
      action,
      performed_by: performedBy,
      details,
    });
  
  if (error) console.error('Error logging deal action:', error);
};

export const notifyDealParties = async (
  supabase: SupabaseClient,
  deal: any,
  title: string,
  body: string,
  link: string,
  type: string = 'info'
) => {
  const parties = [deal.tenant_id, deal.landlord_id];
  if (deal.agent_id) parties.push(deal.agent_id);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();
    
    if (supabaseUrl && serviceRoleKey) {
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_ids: parties,
          title,
          body,
          link,
          type,
        }),
      });
    } else {
      // Fallback to direct insert if env vars are missing (unlikely in Edge Function)
      const notifications = parties.map(userId => ({
        user_id: userId,
        title,
        body,
        link,
        type,
        read: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
};

export const sendEmail = async (
  to: string,
  subject: string,
  template: string,
  data: Record<string, any>
) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();
    
    if (supabaseUrl && serviceRoleKey) {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          to,
          subject,
          template,
          data,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error calling send-email function: ${response.status} ${errorText}`);
      }
    }
  } catch (error) {
    console.error('Error in sendEmail utility:', error);
  }
};

export const sendDealStatusEmails = async (
  adminSupabase: any,
  deal: any,
  status: string,
  message: string,
  link: string,
  template: string = 'deal_update'
) => {
  try {
    const partyIds = [deal.tenant_id, deal.landlord_id];
    if (deal.agent_id) partyIds.push(deal.agent_id);

    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', partyIds);

    const siteUrl = Deno.env.get('SITE_URL') || 'https://rent-easy-ruby.vercel.app';
    const propertyTitle = deal.properties?.title || 'a property';

    for (const p of profiles || []) {
      if (!p.email) continue;
      await sendEmail(
        p.email,
        `Deal Update: ${propertyTitle}`,
        template,
        {
          name: p.full_name || 'there',
          propertyTitle,
          status,
          message,
          link: `${siteUrl}${link}`,
        }
      );
    }
  } catch (error) {
    console.error('Error sending deal status emails:', error);
  }
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const executeDealPayout = async (
  adminSupabase: any,
  deal: any,
  actorId: string,
  actorRole: string,
  extraLogDetails: Record<string, any> = {}
) => {
  const payoutRecipientId = deal.agent_id || deal.landlord_id;
  const grossPayout = deal.agent_id
    ? Number(deal.agent_fee) + Number(deal.landlord_payout)
    : Number(deal.landlord_payout);
  const agreementFee = Number(deal.agreement_fee) || 0;
  const transferAmountNaira = Math.max(0, grossPayout - agreementFee);

  const { data: payoutProfile, error: payoutProfileError } = await adminSupabase
    .from('profiles')
    .select('paystack_recipient_code, full_name')
    .eq('id', payoutRecipientId)
    .single();

  if (payoutProfileError || !payoutProfile?.paystack_recipient_code) {
    await adminSupabase.from('deals').update({ transfer_status: 'failed' }).eq('id', deal.id);
    await logDealAction(adminSupabase, deal.id, 'transfer_failed', actorId, {
      reason: 'Recipient has no bank details on file',
      payout_recipient_id: payoutRecipientId,
      ...extraLogDetails,
    });
    return { transferInitiated: false, warning: 'Deal marked as funds released, but the payout recipient has no bank details on file. Transfer was NOT sent.' };
  }

  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

  const transferReference = `RELEASE_${deal.id}_${Date.now()}`;

  const transferRes = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(transferAmountNaira * 100),
      recipient: payoutProfile.paystack_recipient_code,
      reference: transferReference,
      reason: `Rent Easy payout for deal ${deal.id}`,
    }),
  });
  const transferData = await transferRes.json();

  if (!transferData.status) {
    await adminSupabase.from('deals').update({ transfer_status: 'failed' }).eq('id', deal.id);
    await logDealAction(adminSupabase, deal.id, 'transfer_failed', actorId, {
      reason: transferData.message || 'Unknown Paystack transfer error',
      ...extraLogDetails,
    });
    return { transferInitiated: false, warning: `Deal marked as funds released, but the Paystack transfer failed: ${transferData.message}` };
  }

  await adminSupabase
    .from('deals')
    .update({
      transfer_status: 'pending',
      paystack_transfer_reference: transferReference,
      paystack_transfer_code: transferData.data.transfer_code,
    })
    .eq('id', deal.id);

  await logDealAction(adminSupabase, deal.id, 'funds_released', actorId, {
    released_by_role: actorRole,
    transfer_reference: transferReference,
    transfer_amount: transferAmountNaira,
    payout_recipient_id: payoutRecipientId,
    ...extraLogDetails,
  });

  return { transferInitiated: true };
};

export const isRecipientFirstPayout = async (
  adminSupabase: any,
  recipientId: string
) => {
  const { data } = await adminSupabase
    .from('profiles')
    .select('first_payout_released_at')
    .eq('id', recipientId)
    .single();
  return !data?.first_payout_released_at;
};

/**
 * Finalizes a deal's fund release: marks the deal and property settled,
 * runs the Paystack payout, marks the recipient's first-payout milestone,
 * and notifies parties. Shared by the normal release-funds path and the
 * admin first-payout confirmation path so both behave identically.
 */
export const finalizeDealFundsRelease = async (
  adminSupabase: any,
  deal: any,
  actorId: string,
  actorRole: string
) => {
  const { error: updateError } = await adminSupabase
    .from('deals')
    .update({
      status: 'funds_released',
      updated_at: new Date().toISOString(),
    })
    .eq('id', deal.id);
  if (updateError) throw updateError;

  const { error: propUpdateError } = await adminSupabase
    .from('properties')
    .update({
      is_rented: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deal.property_id);
  if (propUpdateError) throw propUpdateError;

  const payoutResult = await executeDealPayout(adminSupabase, deal, actorId, actorRole);
  await logAdminAction(adminSupabase, actorId, 'funds_released', deal.id, 'deal', { role: actorRole });

  const payoutRecipientId = deal.agent_id || deal.landlord_id;
  await adminSupabase
    .from('profiles')
    .update({ first_payout_released_at: new Date().toISOString() })
    .eq('id', payoutRecipientId)
    .is('first_payout_released_at', null);

  if (payoutResult.transferInitiated) {
    await notifyDealParties(
      adminSupabase,
      deal,
      'Funds Released',
      `Funds for ${deal.properties.title} have been released to the landlord and agent.`,
      `/deals/${deal.id}`,
      'deal_state_change'
    );
    await sendDealStatusEmails(
      adminSupabase,
      deal,
      'Funds Released',
      `Funds for ${deal.properties.title} have been released to the landlord and agent.`,
      `/deals/${deal.id}`
    );
  }

  return payoutResult;
};

export const logAdminAction = async (
  supabase: any,
  actorId: string,
  action: string,
  targetId: string,
  targetType: string,
  details: Record<string, any> = {}
) => {
  const { error } = await supabase.from('admin_logs').insert({
    actor_id: actorId,
    action,
    target_id: targetId,
    target_type: targetType,
    details,
  });
  if (error) console.error('Error logging admin action:', error);
};

/**
 * Pays out 100% of an inspection fee to the agent on that booking.
 * Only call this when booking.agent_id is set — landlord-only bookings
 * (no agent) don't charge an inspection fee at all, so there's nothing
 * to transfer. Mirrors executeDealPayout's pattern (recipient lookup,
 * Paystack transfer call, failure handling) but scoped to
 * inspection_bookings instead of deals, with no platform-fee deduction —
 * the agent gets the full fee.
 */
export const executeInspectionFeeTransfer = async (
  adminSupabase: any,
  booking: any,
  actorId: string
) => {
  // 85/15 split: whoever did the work (agent, or landlord if no agent) gets
  // 85%, Handova keeps 15% as its cut for holding and mediating the fee.
  const payoutRecipientId = booking.agent_id || booking.landlord_id;
  if (!payoutRecipientId) {
    return { transferInitiated: false, reason: 'no_recipient' };
  }

  const totalFee = Number(booking.inspection_fee);
  if (!totalFee || totalFee <= 0) {
    return { transferInitiated: false, reason: 'zero_fee' };
  }

  const PLATFORM_CUT_RATE = 0.15;
  const transferAmountNaira = Math.round(totalFee * (1 - PLATFORM_CUT_RATE) * 100) / 100;

  const { data: payoutProfile, error: payoutProfileError } = await adminSupabase
    .from('profiles')
    .select('paystack_recipient_code, full_name')
    .eq('id', payoutRecipientId)
    .single();

  if (payoutProfileError || !payoutProfile?.paystack_recipient_code) {
    await adminSupabase
      .from('inspection_bookings')
      .update({ transfer_status: 'failed' })
      .eq('id', booking.id);
    await logAdminAction(adminSupabase, actorId, 'inspection_fee_transfer_failed', booking.id, 'inspection_booking', {
      reason: 'Recipient has no bank details on file',
      payout_recipient_id: payoutRecipientId,
    });
    return { transferInitiated: false, warning: 'Inspection fee release date reached, but the recipient has no bank details on file. Transfer was NOT sent.' };
  }

  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');

  const transferReference = `INSPECTION_${booking.id}_${Date.now()}`;

  const transferRes = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(transferAmountNaira * 100),
      recipient: payoutProfile.paystack_recipient_code,
      reference: transferReference,
      reason: `Handova inspection fee payout for booking ${booking.id}`,
    }),
  });

  const transferData = await transferRes.json();

  if (!transferData.status) {
    await adminSupabase
      .from('inspection_bookings')
      .update({ transfer_status: 'failed' })
      .eq('id', booking.id);
    await logAdminAction(adminSupabase, actorId, 'inspection_fee_transfer_failed', booking.id, 'inspection_booking', {
      reason: transferData.message || 'Unknown Paystack transfer error',
    });
    return { transferInitiated: false, warning: `Inspection fee release failed: ${transferData.message}` };
  }

  await adminSupabase
    .from('inspection_bookings')
    .update({
      transfer_status: 'pending',
      paystack_transfer_reference: transferReference,
      paystack_transfer_code: transferData.data.transfer_code,
    })
    .eq('id', booking.id);

  await logAdminAction(adminSupabase, actorId, 'inspection_fee_transfer_initiated', booking.id, 'inspection_booking', {
    amount: transferAmountNaira,
    platform_cut: Math.round(totalFee * PLATFORM_CUT_RATE * 100) / 100,
    payout_recipient_id: payoutRecipientId,
  });

  return { transferInitiated: true };
};
