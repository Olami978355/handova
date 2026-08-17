const fs = require('fs');
const path = 'supabase/functions/confirm-inspection-date/index.ts';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const idx = lines.findIndex(l => l.includes('confirmed_date: confirmedDate,'));
if (idx === -1) throw new Error('Anchor not found.');

// Release 24 hours after the confirmed date+time, giving the tenant a
// window after the visit to raise a dispute before the fee moves out.
// This also naturally handles reschedules: calling this function again
// with a new date simply overwrites release_at to follow it.
lines.splice(idx, 0,
  `        release_at: new Date(new Date(\`\${confirmedDate}T\${confirmedTime || '23:59'}:00\`).getTime() + 24 * 60 * 60 * 1000).toISOString(),`
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('confirm-inspection-date: release_at now set/updated on every confirm or reschedule.');
