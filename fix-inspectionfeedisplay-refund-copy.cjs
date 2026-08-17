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

// Fix bottom-to-top so earlier indices stay valid.

// 1. Bullet list — three lines replaced with two.
const bulletStart = findLine("{ text: '70% refund if you decline after visiting', icon: '↩' },");
lines.splice(bulletStart, 3,
  `              { text: 'Full refund if you cancel before the inspection date', icon: '↩' },`,
  `              { text: 'Fee auto-releases to the agent/landlord on the inspection date', icon: 'ℹ' },`,
  `              { text: 'Refund only via dispute review after that', icon: '⚠' },`
);

// 2. tenant_declined status description.
const declinedIdx = findLine("description: 'You declined after inspection. A 70% refund has been processed.',");
lines[declinedIdx] = `    description: 'You declined after your visit. The agent/landlord keeps the fee, same as any completed inspection.',`;

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('InspectionFeeDisplay.tsx: refund copy updated.');
