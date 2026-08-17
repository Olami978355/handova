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

// Fix 1: landlord/agent notification text — no longer mentions a refund.
const notifIdx = findLine("body: `The tenant who inspected ${booking.properties.title} has declined. They have been issued a 70% refund.`,");
lines[notifIdx] = "          body: `The tenant who inspected ${booking.properties.title} has declined to proceed.`,";

// Fix 2: remove the tenant refund email entirely — nothing to refund.
const emailCommentIdx = findLine('// Send Refund Email to Tenant');
const emailBlockEnd = findLine('}', emailCommentIdx); // closes the if (booking.tenant?.email) block
lines.splice(emailCommentIdx, (emailBlockEnd - emailCommentIdx) + 1);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('submit-inspection-decision: fixed notification text, removed broken refund email.');
