const fs = require('fs');
const path = 'supabase/functions/_shared/utils.ts';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

const startIdx = findLine('export const executeInspectionFeeTransfer = async (');
const endIdx = findLine('return { transferInitiated: true };', startIdx) + 2; // includes the closing };

const newFn = [
  `export const executeInspectionFeeTransfer = async (`,
  `  adminSupabase: any,`,
  `  booking: any,`,
  `  actorId: string`,
  `) => {`,
  `  // 85/15 split: whoever did the work (agent, or landlord if no agent) gets`,
  `  // 85%, Handova keeps 15% as its cut for holding and mediating the fee.`,
  `  const payoutRecipientId = booking.agent_id || booking.landlord_id;`,
  `  if (!payoutRecipientId) {`,
  `    return { transferInitiated: false, reason: 'no_recipient' };`,
  `  }`,
  ``,
  `  const totalFee = Number(booking.inspection_fee);`,
  `  if (!totalFee || totalFee <= 0) {`,
  `    return { transferInitiated: false, reason: 'zero_fee' };`,
  `  }`,
  ``,
  `  const PLATFORM_CUT_RATE = 0.15;`,
  `  const transferAmountNaira = Math.round(totalFee * (1 - PLATFORM_CUT_RATE) * 100) / 100;`,
  ``,
  `  const { data: payoutProfile, error: payoutProfileError } = await adminSupabase`,
  `    .from('profiles')`,
  `    .select('paystack_recipient_code, full_name')`,
  `    .eq('id', payoutRecipientId)`,
  `    .single();`,
  ``,
  `  if (payoutProfileError || !payoutProfile?.paystack_recipient_code) {`,
  `    await adminSupabase`,
  `      .from('inspection_bookings')`,
  `      .update({ transfer_status: 'failed' })`,
  `      .eq('id', booking.id);`,
  `    await logAdminAction(adminSupabase, actorId, 'inspection_fee_transfer_failed', booking.id, 'inspection_booking', {`,
  `      reason: 'Recipient has no bank details on file',`,
  `      payout_recipient_id: payoutRecipientId,`,
  `    });`,
  `    return { transferInitiated: false, warning: 'Inspection fee release date reached, but the recipient has no bank details on file. Transfer was NOT sent.' };`,
  `  }`,
  ``,
  `  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');`,
  `  if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY not set');`,
  ``,
  `  const transferReference = \`INSPECTION_\${booking.id}_\${Date.now()}\`;`,
  ``,
  `  const transferRes = await fetch('https://api.paystack.co/transfer', {`,
  `    method: 'POST',`,
  `    headers: { Authorization: \`Bearer \${paystackSecret}\`, 'Content-Type': 'application/json' },`,
  `    body: JSON.stringify({`,
  `      source: 'balance',`,
  `      amount: Math.round(transferAmountNaira * 100),`,
  `      recipient: payoutProfile.paystack_recipient_code,`,
  `      reference: transferReference,`,
  `      reason: \`Handova inspection fee payout for booking \${booking.id}\`,`,
  `    }),`,
  `  });`,
  ``,
  `  const transferData = await transferRes.json();`,
  ``,
  `  if (!transferData.status) {`,
  `    await adminSupabase`,
  `      .from('inspection_bookings')`,
  `      .update({ transfer_status: 'failed' })`,
  `      .eq('id', booking.id);`,
  `    await logAdminAction(adminSupabase, actorId, 'inspection_fee_transfer_failed', booking.id, 'inspection_booking', {`,
  `      reason: transferData.message || 'Unknown Paystack transfer error',`,
  `    });`,
  `    return { transferInitiated: false, warning: \`Inspection fee release failed: \${transferData.message}\` };`,
  `  }`,
  ``,
  `  await adminSupabase`,
  `    .from('inspection_bookings')`,
  `    .update({`,
  `      transfer_status: 'pending',`,
  `      paystack_transfer_reference: transferReference,`,
  `      paystack_transfer_code: transferData.data.transfer_code,`,
  `    })`,
  `    .eq('id', booking.id);`,
  ``,
  `  await logAdminAction(adminSupabase, actorId, 'inspection_fee_transfer_initiated', booking.id, 'inspection_booking', {`,
  `    amount: transferAmountNaira,`,
  `    platform_cut: Math.round(totalFee * PLATFORM_CUT_RATE * 100) / 100,`,
  `    payout_recipient_id: payoutRecipientId,`,
  `  });`,
  ``,
  `  return { transferInitiated: true };`,
  `};`
];

lines.splice(startIdx, endIdx - startIdx, ...newFn);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('executeInspectionFeeTransfer rewritten for 85/15 split, agent-or-landlord recipient.');
