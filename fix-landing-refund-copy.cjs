const fs = require('fs');
const path = 'src/pages/Landing.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const idx = lines.findIndex(l => l.includes('Get 70-100% refund if anything goes wrong.'));
if (idx === -1) throw new Error('Anchor not found.');
lines[idx] = lines[idx].replace(
  'Get 70-100% refund if anything goes wrong.',
  'Cancel anytime before the visit for a full refund.'
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('Landing.tsx: refund copy updated.');
