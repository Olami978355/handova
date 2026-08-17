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

verify(187, `<motion.div`);
verify(191, `<div className="fixed inset-0 z-10" onClick={() => setSelectedUser(null)} />`);

// Remove the bad insertion at line 191 (index 190).
lines.splice(190, 1);

// Insert the backdrop as a proper sibling right before <motion.div> (line 187, index 186).
lines.splice(186, 0, `                        <div className="fixed inset-0 z-10" onClick={() => setSelectedUser(null)} />`);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('UserManagement.tsx: backdrop repositioned as a proper sibling.');
