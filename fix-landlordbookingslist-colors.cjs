const fs = require('fs');
const path = 'src/components/inspection/LandlordBookingsList.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Status color map — collapse to gold/gray/danger.
const mapStart = findLine("payment_confirmed: '#D4AF37',");
lines.splice(mapStart, 8,
  `    payment_confirmed: '#D4AF37',`,
  `    inspection_scheduled: '#9ca3af',`,
  `    inspection_done: '#9ca3af',`,
  `    tenant_interested: '#D4AF37',`,
  `    tenant_declined: '#9ca3af',`,
  `    escrow_started: '#D4AF37',`,
  `    refunded: '#9ca3af',`,
  `    dispute_raised: '#E5484D',`
);

// 2. actionError banner: raw red -> danger token.
const errBannerIdx = findLine('bg-red-500/10 border border-red-500/20 rounded-xl">');
lines[errBannerIdx] = lines[errBannerIdx].replace(
  'bg-red-500/10 border border-red-500/20',
  'bg-danger/10 border border-danger/20'
);
const errIconIdx = findLine('<AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />');
lines[errIconIdx] = lines[errIconIdx].replace('text-red-400', 'text-danger');
const errTextIdx = findLine('<p className="text-[13px] text-red-400">{actionError}</p>');
lines[errTextIdx] = lines[errTextIdx].replace('text-red-400', 'text-danger');

// 3. "Deal active" badge — green -> gold.
const dealActiveIdx = findLine('text-[#4ade80] bg-gold/20 px-2 py-0.5 rounded-full border border-gold/30');
lines[dealActiveIdx] = lines[dealActiveIdx].replace('text-[#4ade80]', 'text-gold');

// 4. Escrow-active message — green -> gold (two lines).
const escrowShieldIdx = findLine('<Shield className="w-4 h-4 text-[#4ade80] flex-shrink-0" />');
lines[escrowShieldIdx] = lines[escrowShieldIdx].replace('text-[#4ade80]', 'text-gold');
const escrowTextIdx = findLine('<p className="text-[11px] text-[#4ade80] font-semibold">');
lines[escrowTextIdx] = lines[escrowTextIdx].replace('text-[#4ade80]', 'text-gold');

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('LandlordBookingsList.tsx: all green/blue/purple/red usages remapped to gold/gray/danger.');
