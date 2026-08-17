const fs = require('fs');
const path = 'src/components/inspection/InspectionBookingCard.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const idx = lines.findIndex(l => l.includes('You will receive a 70% refund of your inspection fee. This cannot be undone.'));
if (idx === -1) throw new Error('Anchor not found.');
lines[idx] = lines[idx].replace(
  'You will receive a 70% refund of your inspection fee. This cannot be undone.',
  "The agent/landlord keeps the inspection fee, same as any completed visit. This cannot be undone."
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('InspectionBookingCard.tsx: decline confirmation copy updated.');
