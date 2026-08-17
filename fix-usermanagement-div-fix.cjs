const fs = require('fs');
const path = 'src/pages/Admin/UserManagement.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function verify(lineNumber, expectedTrimmed) {
  const idx = lineNumber - 1;
  if (lines[idx].trim() !== expectedTrimmed) {
    throw new Error(`Line ${lineNumber} mismatch. Expected: "${expectedTrimmed}" Got: "${lines[idx].trim()}"`);
  }
}

verify(268, `</div>`);
verify(269, ``);
verify(270, `{/* Role change confirmation */}`);
verify(302, `</AnimatePresence>`);
verify(303, `);`);
verify(304, `}`);

// Remove line 268 (the misplaced </div>) and the blank line 269.
lines.splice(267, 2);

// Re-find line 303's ");" now that indices shifted by -2, and insert </div> before it.
const closeParenIdx = lines.findIndex((l, i) => l.trim() === ');' && lines[i - 1].trim() === '</AnimatePresence>' && lines[i + 1] && lines[i + 1].trim() === '}');
if (closeParenIdx === -1) throw new Error('Final close paren not found after shift.');
lines.splice(closeParenIdx, 0, '    </div>');

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('UserManagement.tsx: </div> moved to correct closing position.');
