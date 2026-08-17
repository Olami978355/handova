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

const ifaceIdx = findLine('ownerAccountStatus?: string;');
lines[ifaceIdx] = `  ownerLikelySuspended?: boolean;`;

const compIdx = findLine('{ property, ownerAccountStatus }');
lines[compIdx] = lines[compIdx].replace('{ property, ownerAccountStatus }', '{ property, ownerLikelySuspended }');

const flagIdx = findLine("const isSuspendedOwner = ownerAccountStatus === 'suspended';");
lines[flagIdx] = `  const isSuspendedOwner = !!ownerLikelySuspended;`;

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('InspectionFeeDisplay.tsx: prop renamed and flag corrected to boolean-based signal.');
