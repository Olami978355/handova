const fs = require('fs');
const path = 'src/pages/Admin/UserManagement.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const dropdownIdx = lines.findIndex(l => l.includes('className="absolute right-5 top-14 w-48'));
if (dropdownIdx === -1) throw new Error('Dropdown anchor not found.');
if (lines[dropdownIdx - 3] && lines[dropdownIdx - 3].includes('setSelectedUser(null)')) {
  console.log('Backdrop already present, skipping.');
} else {
  lines.splice(dropdownIdx, 0, `                          <div className="fixed inset-0 z-10" onClick={() => setSelectedUser(null)} />`);
  fs.writeFileSync(path, lines.join(eol), 'utf8');
  console.log('UserManagement.tsx: backdrop added.');
}
