const fs = require('fs');
const path = 'src/components/inspection/InspectionBookingCard.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// Bottom-to-top.

// "Confirm" button in the modal: declined path becomes neutral outline, not red.
const confirmBtnIdx = findLine("? 'bg-gold hover:bg-gold-dark'");
lines[confirmBtnIdx + 1] = lines[confirmBtnIdx + 1].replace("'bg-red-500 hover:bg-red-600'", "'bg-white/10 hover:bg-white/15'");

// Icon in the modal header circle.
const modalIconIdx = findLine('? <CheckCircle className="w-7 h-7 text-[#4ade80]" />');
lines[modalIconIdx] = lines[modalIconIdx].replace('text-[#4ade80]', 'text-gold');
lines[modalIconIdx + 1] = lines[modalIconIdx + 1].replace('text-red-400', 'text-paper/60');

// Modal header circle background.
const modalBgIdx = findLine("? 'bg-gold/20'");
lines[modalBgIdx + 1] = lines[modalBgIdx + 1].replace("'bg-red-500/15'", "'bg-white/10'");

// Escrow-started success message.
const escrowIdx = findLine('<Shield className="w-4 h-4 text-[#4ade80] flex-shrink-0" />');
lines[escrowIdx] = lines[escrowIdx].replace('text-[#4ade80]', 'text-gold');
lines[escrowIdx + 1] = lines[escrowIdx + 1].replace('text-[#4ade80]', 'text-gold');

// Refund-processed success indicators.
const refundIconIdx = findLine('<CheckCircle className="w-4 h-4 text-[#4ade80]" />');
lines[refundIconIdx] = lines[refundIconIdx].replace('text-[#4ade80]', 'text-gold');
const refundAmountIdx = findLine('<span className="text-[13px] font-black text-[#4ade80]">');
lines[refundAmountIdx] = lines[refundAmountIdx].replace('text-[#4ade80]', 'text-gold');

// "Not Interested" button: neutral outline instead of red.
const notInterestedIdx = findLine('className="py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[12px] font-bold hover:bg-red-500/15 transition-colors flex items-center justify-center gap-1.5"');
lines[notInterestedIdx] = lines[notInterestedIdx].replace(
  'bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[12px] font-bold hover:bg-red-500/15',
  'bg-white/5 border border-white/10 text-paper/60 rounded-xl text-[12px] font-bold hover:bg-white/8'
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('InspectionBookingCard.tsx: remaining green/red usages remapped.');
