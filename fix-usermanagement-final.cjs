const fs = require('fs');
const path = 'src/pages/Admin/UserManagement.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(/\r\n|\n/);

function verify(lineNumber, expectedTrimmed) {
  const idx = lineNumber - 1;
  if (lines[idx].trim() !== expectedTrimmed) {
    throw new Error(`Line ${lineNumber} mismatch. Expected: "${expectedTrimmed}" Got: "${lines[idx].trim()}"`);
  }
}

// 1. Move the </div> that got left behind the modal back to close the component
// properly. Currently: "</AnimatePresence>" (component-level) then "</div>"
// then the misplaced modal then a second "</AnimatePresence>" then ");" then "}".
// Fix: remove the stray "</div>" where it currently sits (right after the
// component-level AnimatePresence close), and add it back right before the
// final ");".
const strayDivIdx = lines.findIndex((l, i) =>
  l.trim() === '</div>' &&
  lines[i - 1] && lines[i - 1].trim() === '</AnimatePresence>' &&
  lines[i + 1] && lines[i + 1].trim() === '{/* Role change confirmation */}'
);
if (strayDivIdx === -1) throw new Error('Stray </div> anchor not found.');
lines.splice(strayDivIdx, 1); // remove the misplaced </div>

// Now find the final closing sequence: last "</AnimatePresence>" then ");" then "}"
const finalCloseParenIdx = lines.findIndex((l, i) =>
  l.trim() === ');' && lines[i - 1] && lines[i - 1].trim() === '</AnimatePresence>' && lines[i + 1] && lines[i + 1].trim() === '}'
);
if (finalCloseParenIdx === -1) throw new Error('Final close anchor not found.');
lines.splice(finalCloseParenIdx, 0, '    </div>'); // re-add </div> right before the final );

// 2. Add pendingRoleChange state declaration.
const stateAnchorIdx = lines.findIndex(l => l.includes('const [actionLoading, setActionLoading] = useState(false);'));
if (stateAnchorIdx === -1) throw new Error('State anchor not found.');
lines.splice(stateAnchorIdx + 1, 0,
  `  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; role: UserRole } | null>(null);`
);

// 3. Rewire the menu button to open the confirm modal instead of firing directly.
const btnIdx = lines.findIndex(l => l.includes('onClick={() => handleRoleChange(u.id, role)}'));
if (btnIdx === -1) throw new Error('Menu button anchor not found.');
lines[btnIdx] = lines[btnIdx].replace(
  'onClick={() => handleRoleChange(u.id, role)}',
  'onClick={() => { setPendingRoleChange({ userId: u.id, role }); setSelectedUser(null); }}'
);

// 4. Add a backdrop behind the role-change dropdown so outside taps close it
// safely instead of falling through to a button underneath.
const dropdownIdx = lines.findIndex(l => l.includes('className="absolute right-5 top-14 w-48 bg-ink border border-white/10 rounded-xl shadow-2xl z-20 p-1.5"'));
if (dropdownIdx === -1) throw new Error('Dropdown anchor not found.');
lines.splice(dropdownIdx, 0, `                          <div className="fixed inset-0 z-10" onClick={() => setSelectedUser(null)} />`);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('UserManagement.tsx: structural fix applied — modal repositioned, state added, button rewired, backdrop added.');
