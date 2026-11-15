import {
  executeDealPayout,
  isRecipientFirstPayout,
  logDealAction,
  notifyDealParties,
  sendDealStatusEmails,
} from './utils.ts';

// deals.release_status: not_started -> submitted -> processing -> completed
//   (held_for_review for a first payout; failed -> retry). deals.status becomes
//   'funds_released' ONLY when the payout provider confirms success.

export type ReleaseActor = { id: string | null; role: string };
export type ReleaseState = 'not_started' | 'held_for_review' | 'submitted' | 'processing' | 'completed' | 'failed';

export interface StartReleaseResult {
  started: boolean;
  state: ReleaseState | 'unknown';
  warning?: string;
}

const nowIso = () => new Date().toISOString();

const findExistingTransfer = async (reference: string) => {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) return null;
  try {
    const res = await fetch(`https://api.paystack.co/transfer/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (res.status === 404) return null;
    const body = await res.json();
    if (!body?.status || !body?.data) return null;
    return body.data as { status: string; transfer_code: string; reference: string };
  } catch (_e) {
    throw new Error('Could not verify the previous transfer attempt with Paystack. Try again shortly.');
  }
};

export const startDealRelease = async (
  adminSupabase: any,
  dealId: string,
  actor: ReleaseActor,
  opts: { confirmFirstPayout?: boolean } = {}
): Promise<StartReleaseResult> => {
  const { data: claim, error: claimError } = await adminSupabase.rpc('claim_deal_release', { p_deal_id: dealId });
  if (claimError) throw claimError;

  if (!claim?.claimed) {
    const { data: current } = await adminSupabase
      .from('deals').select('release_status').eq('id', dealId).single();
    return { started: false, state: (current?.release_status as ReleaseState) ?? 'unknown' };
  }

  const attempt: number = claim.attempt;
  const fail = async (reason: string): Promise<StartReleaseResult> => {
    await adminSupabase
      .from('deals')
      .update({ release_status: 'failed', release_failure_reason: reason, updated_at: nowIso() })
      .eq('id', dealId);
    await logDealAction(adminSupabase, dealId, 'release_failed', actor.id as any, { reason, attempt });
    return { started: true, state: 'failed', warning: reason };
  };

  try {
    const { data: deal, error: dealError } = await adminSupabase
      .from('deals').select('*, properties(*)').eq('id', dealId).single();
    if (dealError || !deal) return await fail('Deal not found');

    if (!deal.paystack_reference) {
      return await fail('No verified payment is recorded for this deal');
    }

    const recipientId = deal.agent_id || deal.landlord_id;
    if (!opts.confirmFirstPayout && (await isRecipientFirstPayout(adminSupabase, recipientId))) {
      await adminSupabase
        .from('deals')
        .update({ release_status: 'held_for_review', transfer_status: 'first_payout_review', updated_at: nowIso() })
        .eq('id', dealId);
      await logDealAction(adminSupabase, dealId, 'release_held_first_payout', actor.id as any, {
        payout_recipient_id: recipientId,
        attempt,
      });
      return { started: true, state: 'held_for_review' };
    }

    if (attempt > 1) {
      const previous = await findExistingTransfer(`RELEASE_${dealId}_${attempt - 1}`);
      if (previous && ['success', 'pending', 'otp', 'received', 'processing'].includes(previous.status)) {
        await adminSupabase
          .from('deals')
          .update({
            release_status: 'processing',
            transfer_status: 'pending',
            paystack_transfer_reference: previous.reference,
            paystack_transfer_code: previous.transfer_code,
            updated_at: nowIso(),
          })
          .eq('id', dealId);
        await logDealAction(adminSupabase, dealId, 'release_adopted_previous_attempt', actor.id as any, {
          reference: previous.reference,
          provider_status: previous.status,
        });
        if (previous.status === 'success') {
          await completeDealRelease(adminSupabase, deal);
          return { started: true, state: 'completed' };
        }
        return { started: true, state: 'processing' };
      }
    }

    const payout = await executeDealPayout(adminSupabase, deal, actor.id as any, actor.role, { attempt });
    if (!payout.transferInitiated) {
      return await fail(payout.warning ?? 'The transfer could not be started');
    }

    await adminSupabase
      .from('deals')
      .update({ release_status: 'processing', updated_at: nowIso() })
      .eq('id', dealId);
    return { started: true, state: 'processing' };
  } catch (error) {
    return await fail(`Release error: ${(error as Error).message}`);
  }
};

export const completeDealRelease = async (adminSupabase: any, deal: any) => {
  const { data: updated, error } = await adminSupabase
    .from('deals')
    .update({
      status: 'funds_released',
      release_status: 'completed',
      transfer_status: 'success',
      release_failure_reason: null,
      updated_at: nowIso(),
    })
    .eq('id', deal.id)
    .neq('release_status', 'completed')
    .select('id');
  if (error) throw error;
  if (!updated?.length) return { alreadyCompleted: true };

  await adminSupabase
    .from('properties')
    .update({ is_rented: true, updated_at: nowIso() })
    .eq('id', deal.property_id);

  const recipientId = deal.agent_id || deal.landlord_id;
  await adminSupabase
    .from('profiles')
    .update({ first_payout_released_at: nowIso() })
    .eq('id', recipientId)
    .is('first_payout_released_at', null);

  await logDealAction(adminSupabase, deal.id, 'funds_released', null as any, { confirmed_by: 'payout_provider' });

  const title = deal.properties?.title ?? 'your property';
  const msg = `Funds for ${title} have been released. Bank settlement time depends on the receiving bank.`;
  await notifyDealParties(adminSupabase, deal, 'Funds Released', msg, `/deals/${deal.id}`, 'deal_state_change');
  await sendDealStatusEmails(adminSupabase, deal, 'Funds Released', msg, `/deals/${deal.id}`);
  return { alreadyCompleted: false };
};

export const failDealRelease = async (adminSupabase: any, deal: any, reason: string) => {
  await adminSupabase
    .from('deals')
    .update({
      release_status: 'failed',
      transfer_status: 'failed',
      release_failure_reason: reason,
      updated_at: nowIso(),
    })
    .eq('id', deal.id)
    .neq('release_status', 'completed');
};
