const fs = require('fs');
const path = 'supabase/functions/process-inspection-payment/index.ts';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

const importIdx = findLine("import { corsHeaders, executeInspectionFeeTransfer } from '../_shared/utils.ts';");
lines[importIdx] = "import { corsHeaders } from '../_shared/utils.ts';";

const updateIdx = findLine("status: 'payment_confirmed', ");
lines.splice(updateIdx + 1, 0, `          transfer_status: 'awaiting_release',`);

const payoutCommentStart = findLine('// Pay the agent 100% of the inspection fee, if there is one on');
const payoutCommentEnd = findLine('const payoutResult = await executeInspectionFeeTransfer(supabase, booking, booking.tenant_id);');
const payoutWarnBlockEnd = findLine('}', payoutCommentEnd) ; // closes the if(payoutResult.warning) block

lines.splice(payoutCommentStart, (payoutWarnBlockEnd - payoutCommentStart) + 1,
  `      // Fee is held by Handova, not paid out yet. It releases automatically`,
  `      // once the agreed inspection date passes (see release-inspection-fees),`,
  `      // giving cancellations/disputes raised before that date a clean path`,
  `      // with no clawback ever needed.`
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('process-inspection-payment: immediate payout removed, marked awaiting_release.');
