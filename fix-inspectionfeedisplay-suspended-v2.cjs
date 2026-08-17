const fs = require('fs');
const path = 'src/components/inspection/InspectionFeeDisplay.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Extend props interface.
const ifaceIdx = findLine('interface InspectionFeeDisplayProps {');
const ifacePropIdx = findLine('property: Property;', ifaceIdx);
lines.splice(ifacePropIdx + 1, 0, `  ownerAccountStatus?: string;`);

// 2. Destructure the new prop on the component signature.
const compIdx = findLine('export const InspectionFeeDisplay: React.FC<InspectionFeeDisplayProps> = ({ property }) => {');
lines[compIdx] = lines[compIdx].replace('{ property }', '{ property, ownerAccountStatus }');

// 3. Add isSuspendedOwner flag near the fee calc.
const feeIdx = findLine('const inspectionFee = calculateInspectionFee(');
lines.splice(feeIdx, 0, `  const isSuspendedOwner = ownerAccountStatus === 'suspended';`, ``);

// 4. Disable + relabel the "Book Inspection" button.
const bookBtnIdx = findLine('onClick={() => setIsModalOpen(true)}');
lines[bookBtnIdx] = lines[bookBtnIdx].replace(
  'onClick={() => setIsModalOpen(true)}',
  'onClick={() => !isSuspendedOwner && setIsModalOpen(true)}'
);
const bookBtnClassIdx = bookBtnIdx + 1;
lines[bookBtnClassIdx] = lines[bookBtnClassIdx].replace(
  'className="w-full bg-gold text-paper py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors flex items-center justify-center gap-2"',
  'className={`w-full py-3 rounded-xl font-bold text-[13px] transition-colors flex items-center justify-center gap-2 ${isSuspendedOwner ? \'bg-white/5 text-paper/30 cursor-not-allowed\' : \'bg-gold text-paper hover:bg-gold-dark\'}`}'
);
const bookBtnTextIdx = findLine('Book Inspection — {formatFee(inspectionFee)}', bookBtnIdx);
lines[bookBtnTextIdx] = lines[bookBtnTextIdx].replace(
  'Book Inspection — {formatFee(inspectionFee)}',
  "{isSuspendedOwner ? 'Temporarily unavailable' : `Book Inspection — ${formatFee(inspectionFee)}`}"
);

// 5. Disable the second (skip-inspection) "Contact Owner" button specifically —
// re-locate it fresh since line numbers have shifted from the inserts above.
const contactOwnerLabelIdx = findLine('Contact Owner to Arrange Payment');
// walk backwards from the label to find its onClick={handleStartChat} line
let contactBtnClickIdx = -1;
for (let i = contactOwnerLabelIdx; i >= contactOwnerLabelIdx - 10; i--) {
  if (lines[i].includes('onClick={handleStartChat}')) { contactBtnClickIdx = i; break; }
}
if (contactBtnClickIdx === -1) throw new Error('Contact Owner onClick anchor not found.');
lines[contactBtnClickIdx] = lines[contactBtnClickIdx].replace(
  'onClick={handleStartChat}',
  'onClick={() => !isSuspendedOwner && handleStartChat()}'
);
// find its disabled prop right after
const contactDisabledIdx = contactBtnClickIdx + 1;
if (!lines[contactDisabledIdx].includes('disabled={startingChat}')) {
  throw new Error(`Expected disabled prop after Contact Owner onClick, got: ${lines[contactDisabledIdx]}`);
}
lines[contactDisabledIdx] = lines[contactDisabledIdx].replace(
  'disabled={startingChat}',
  'disabled={startingChat || isSuspendedOwner}'
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('InspectionFeeDisplay.tsx: suspended-owner handling added to both action buttons.');
