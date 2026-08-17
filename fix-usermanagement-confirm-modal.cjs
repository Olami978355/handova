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
verify(269, `);`);

const modal = [
  ``,
  `      {/* Role change confirmation */}`,
  `      <AnimatePresence>`,
  `        {pendingRoleChange && (`,
  `          <>`,
  `            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}`,
  `              onClick={() => setPendingRoleChange(null)}`,
  `              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />`,
  `            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}`,
  `              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-slate/20 border border-white/8 rounded-2xl z-[110] p-6 shadow-2xl" style={font}`,
  `            >`,
  `              <h3 className="text-[15px] font-bold text-paper mb-2">Change Role?</h3>`,
  `              <p className="text-[12px] text-paper/45 mb-5 leading-relaxed">`,
  `                This will change the user's role to <span className="text-gold font-bold capitalize">{pendingRoleChange.role}</span>. This takes effect immediately.`,
  `              </p>`,
  `              <div className="flex gap-3">`,
  `                <button onClick={() => setPendingRoleChange(null)}`,
  `                  className="flex-1 py-3 rounded-xl font-bold text-[13px] text-paper/40 hover:bg-white/5 transition-colors">`,
  `                  Cancel`,
  `                </button>`,
  `                <button`,
  `                  onClick={async () => {`,
  `                    if (!pendingRoleChange) return;`,
  `                    await handleRoleChange(pendingRoleChange.userId, pendingRoleChange.role);`,
  `                    setPendingRoleChange(null);`,
  `                  }}`,
  `                  className="flex-1 bg-gold text-paper py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors">`,
  `                  Confirm`,
  `                </button>`,
  `              </div>`,
  `            </motion.div>`,
  `          </>`,
  `        )}`,
  `      </AnimatePresence>`
];
lines.splice(268, 0, ...modal);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('UserManagement.tsx: confirm modal added.');
