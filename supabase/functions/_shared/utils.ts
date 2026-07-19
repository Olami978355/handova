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
  const transferAmountNaira = deal.agent_id
    ? Number(deal.agent_fee) + Number(deal.landlord_payout)
    : Number(deal.landlord_payout);

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
