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

verify(186, `{selectedUser === u.id && (`);
verify(187, `<div className="fixed inset-0 z-10" onClick={() => setSelectedUser(null)} />`);
verify(212, `</motion.div>`);
verify(213, `)}`);

// Bottom-to-top: close the Fragment first, then open it.
lines.splice(212, 0, `                        </>`);
lines.splice(186, 0, `                        <>`);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('UserManagement.tsx: Fragment wrap added around backdrop + motion.div.');
