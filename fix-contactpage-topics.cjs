const fs = require('fs');
const path = 'src/pages/ContactPage.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const idx = lines.findIndex(l => l.includes("['Refund requests', 'Listing disputes', 'Account verification', 'Partnership inquiries', 'Bug reports']"));
if (idx === -1) throw new Error('Common Topics anchor not found.');
lines[idx] = lines[idx].replace(
  "['Refund requests', 'Listing disputes', 'Account verification', 'Partnership inquiries', 'Bug reports']",
  "['Account verification', 'Partnership inquiries', 'Bug reports', 'General questions']"
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('ContactPage.tsx: Common Topics updated — refunds/disputes now route through in-app Report and Dispute flows, not email.');
