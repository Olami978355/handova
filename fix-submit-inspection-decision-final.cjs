const fs = require('fs');
const path = 'supabase/functions/submit-inspection-decision/index.ts';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function verify(lineNumber, expectedTrimmed) {
  const idx = lineNumber - 1;
  if (lines[idx].trim() !== expectedTrimmed) {
    throw new Error(`Line ${lineNumber} mismatch. Expected: "${expectedTrimmed}" Got: "${lines[idx].trim()}"`);
  }
}

verify(119, `});`);
verify(120, ``);
verify(121, `);`);
verify(122, `}`);
verify(123, `}`);

// Remove the orphaned fragment: lines 121-122 (indices 120-121).
lines.splice(120, 2);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('submit-inspection-decision: orphaned fragment removed.');
