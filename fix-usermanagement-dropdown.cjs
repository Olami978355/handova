const fs = require('fs');
const path = 'src/pages/Admin/UserManagement.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Add confirm state near other state declarations.
const stateAnchor = findLine("const [actionLoading, setActionLoading] = useState(false);");
lines.splice(stateAnchor + 1, 0,
  `  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; role: UserRole } | null>(null);`
);

// 2. handleRoleChange stays as the actual executor, but rename its call site
// to fire only after confirmation. We keep handleRoleChange itself intact
// and add a confirm trigger + confirm modal.
const menuButtonIdx = findLine("<button key={role} disabled={!isAdmin} onClick={() => handleRoleChange(u.id, role)}");
lines[menuButtonIdx] = lines[menuButtonIdx].replace(
  "onClick={() => handleRoleChange(u.id, role)}",
  "onClick={() => { setPendingRoleChange({ userId: u.id, role }); setSelectedUser(null); }}"
);

// 3. Add a backdrop behind the dropdown so outside taps close it safely
// instead of falling through to whatever button is underneath.
const dropdownAnchor = findLine('className="absolute right-5 top-14 w-48 bg-ink border border-white/10 rounded-xl shadow-2xl z-20 p-1.5"');
lines.splice(dropdownAnchor, 0,
  `                          <div className="fixed inset-0 z-10" onClick={() => setSelectedUser(null)} />`
);

// 4. Add the confirm modal right before the closing </AnimatePresence></div> at
// the end of the component, anchored on the existing Suspend modal's closing.
const suspendModalCloseAnchor = findLine('</AnimatePresence>\n    </div>\n  );'.split('\n')[0]); // fallback below if this exact multi-line doesn't match
