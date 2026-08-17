const fs = require('fs');
const path = 'src/pages/LegalPage.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function verify(lineNumber, expectedTrimmed) {
  const idx = lineNumber - 1;
  if (lines[idx].trim() !== expectedTrimmed) {
    throw new Error(`Line ${lineNumber} mismatch. Expected: "${expectedTrimmed}" Got: "${lines[idx].trim()}"`);
  }
}

// Find the duplicated brace precisely rather than trust a hardcoded number,
// since this file has shifted during the earlier partial edit.
const idx = lines.findIndex((l, i) =>
  l.trim() === '{' && lines[i + 1] && lines[i + 1].trim() === '{' && lines[i + 2] && lines[i + 2].includes("heading: 'Cancel Before the Inspection Date'")
);
if (idx === -1) throw new Error('Duplicate brace pattern not found.');

// Remove the first, orphaned "{" (keep the second one, which correctly
// opens the "Cancel Before the Inspection Date" object).
lines.splice(idx, 1);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('LegalPage.tsx: duplicate brace removed.');
