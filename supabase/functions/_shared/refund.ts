import { logDealAction } from './utils.ts';

// Voluntary tenant cancellation: Handova keeps 5% of the contract amount and refunds the rest
// of what was actually paid. Cancellation caused by Handova/landlord/agent/invalid listing/
// failed handover: full refund, no fee. A refund is "completed" only on Paystack's
// refund.processed event.

export const CANCELLATION_FEE_RATE = 0.05;

export const NON_VOLUNTARY_CAUSES = ['landlord', 'agent', 'handova', 'invalid_listing', 'handover_failure'] as const;
export const REFUNDABLE_CAUSES = ['tenant_voluntary', ...NON_VOLUNTARY_CAUSES] as const;
export type CancellationCause = typeof REFUNDABLE_CAUSES[number];

const round2 = (n: number) => Math.round(n * 100) / 100;
export const toKobo = (naira: number) => Math.round(naira * 100);

export const getPaidAmountNaira = async (reference: string): Promise<number> => {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY not set');
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json();
  if (!body?.status || body.data?.status !== 'success') {
    throw new Error('Could not verify the original payment with Paystack. Please try again shortly.');
  }
  return Number(body.data.amount) / 100;
};

export const computeCancellationAmounts = (
  cause: CancellationCause,
  contractAmountNaira: number,
  paidNaira: number
) => {
  if (cause === 'tenant_voluntary') {
    const fee = Math.min(round2(contractAmountNaira * CANCELLATION_FEE_RATE), paidNaira);
    return { fee, refund: round2(Math.max(0, paidNaira - fee)) };
  }
  return { fee: 0, refund: round2(paidNaira) };
};

export const requestPaystackRefund = async (
  adminSupabase: any,
  deal: any,
  refundNaira: number,
  actorId: string | null
): Promise<{ ok: boolean; reason?: string }> => {
  const markFailed = async (reason: string) => {
    await adminSupabase
      .from('deals')
      .update({ refund_status: 'failed', refund_failure_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', deal.id);
    await logDealAction(adminSupabase, deal.id, 'refund_request_failed', actorId as any, {
      reason,
      refund_amount: refundNaira,
    });
    return { ok: false, reason };
  };

  try {
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) return await markFailed('PAYSTACK_SECRET_KEY not set');

    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        transaction: deal.paystack_reference,
        amount: toKobo(refundNaira),
        merchant_note: `Handova deal ${deal.id} cancellation refund`,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return await markFailed(data?.message || 'Paystack did not accept the refund request');
    }

    await logDealAction(adminSupabase, deal.id, 'refund_requested', actorId as any, {
      refund_amount: refundNaira,
      paystack_message: data.message,
    });
    return { ok: true };
  } catch (error) {
    return await markFailed(`Refund request error: ${(error as Error).message}`);
  }
};
