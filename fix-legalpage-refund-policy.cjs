const fs = require('fs');
const path = 'src/pages/LegalPage.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

const startIdx = findLine("heading: '100% Refund Cases',");
const endIdx = findLine("heading: '2. Escrow Payment Refunds',");

const newSection = [
  `      {`,
  `        heading: 'Cancel Before the Inspection Date',`,
  `        body: \`You can cancel your booking and receive a full refund of your inspection fee any time before the scheduled inspection date.\``,
  `      },`,
  `      {`,
  `        heading: 'Automatic Release on the Inspection Date',`,
  `        body: \`Once the scheduled inspection date arrives, the fee is automatically released to the agent or landlord. This cannot be reversed through a refund request.\``,
  `      },`,
  `      {`,
  `        heading: 'Disputes After the Inspection Date',`,
  `        body: \`If the inspection did not happen as agreed, or the property was significantly misrepresented, you may raise a dispute for a moderator to review. A refund is only issued if the dispute is resolved in your favour.\``,
  `      },`,
  `      {`
];

lines.splice(startIdx, endIdx - startIdx, ...newSection);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('LegalPage.tsx: refund tiers collapsed into new date-based rule.');
