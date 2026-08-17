const fs = require('fs');
const path = 'supabase/functions/submit-inspection-decision/index.ts';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

const startIdx = findLine('// Declined: trigger 70% Paystack refund');
const endIdx = findLine('if (updateError) throw updateError;', startIdx);

const newBlock = [
  `      // Declined: the visit already happened (this function only runs`,
  `      // after inspection_done), so the agent/landlord did their job and`,
  `      // keeps the fee — same as any completed visit. No refund. The fee`,
  `      // still releases automatically via release-inspection-fees on the`,
  `      // agreed release_at date, same as if the tenant had said yes.`,
  `      const { error: updateError } = await supabase`,
  `        .from('inspection_bookings')`,
  `        .update({`,
  `          status: 'tenant_declined',`,
  `          updated_at: new Date().toISOString()`,
  `        })`,
  `        .eq('id', bookingId);`,
  `      if (updateError) throw updateError;`
];

lines.splice(startIdx, (endIdx - startIdx) + 1, ...newBlock);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('submit-inspection-decision: decline no longer refunds — matches agent/landlord-favoring policy.');
