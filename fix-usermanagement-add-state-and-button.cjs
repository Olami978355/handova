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

const stateIdx = lines.findIndex(l => l.includes('const [actionLoading, setActionLoading] = useState(false);'));
if (stateIdx === -1) throw new Error('State anchor not found.');
if (lines.some(l => l.includes('const [pendingRoleChange'))) {
  console.log('State already declared, skipping insert.');
} else {
  lines.splice(stateIdx + 1, 0,
    `  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; role: UserRole } | null>(null);`
  );
}

const btnIdx = lines.findIndex(l => l.includes('onClick={() => handleRoleChange(u.id, role)}'));
if (btnIdx === -1) {
  console.log('Button already rewired or not found — checking...');
} else {
  lines[btnIdx] = lines[btnIdx].replace(
    'onClick={() => handleRoleChange(u.id, role)}',
    'onClick={() => { setPendingRoleChange({ userId: u.id, role }); setSelectedUser(null); }}'
  );
}

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('UserManagement.tsx: state and button fix applied.');
