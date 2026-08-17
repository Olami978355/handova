const fs = require('fs');
const path = 'src/components/inspection/BookInspectionModal.tsx';
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

// 2. Inline "Your money is protected" summary.
const summaryIdx = findLine('70% refund if you decline. 100% refund if the property is taken.');
lines[summaryIdx] = `                    Full refund if you cancel before the inspection date. Once that date passes, the fee auto-releases and can only be refunded via a dispute review.`;

// 1. Bullet list — three lines replaced with two.
const bulletIdx = findLine("'70% back if you decide not to proceed',");
lines.splice(bulletIdx, 3,
  `                      'Full refund if you cancel before the inspection date',`,
  `                      'Fee auto-releases on the inspection date, non-refundable after',`,
  `                      'Disputes reviewed by a moderator if something goes wrong',`
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('BookInspectionModal.tsx: refund copy updated in both spots.');
