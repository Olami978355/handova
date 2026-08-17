const fs = require('fs');
const path = 'src/components/inspection/LandlordBookingsList.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Add handleMarkDone right after handleConfirmDate closes.
const confirmDateEnd = findLine('const handleStartEscrow = async (bookingId: string) => {');
lines.splice(confirmDateEnd, 0,
  `  const handleMarkDone = async (bookingId: string) => {`,
  `    setConfirming(bookingId);`,
  `    setActionError(null);`,
  `    try {`,
  `      if (!(await requireValidSession())) return;`,
  `      const { error } = await supabase.functions.invoke(`,
  `        'mark-inspection-done',`,
  `        { body: { bookingId } }`,
  `      );`,
  `      if (error) throw error;`,
  `      await fetchData();`,
  `    } catch (err: unknown) {`,
  `      setActionError(err instanceof Error ? err.message : 'Failed to mark inspection complete');`,
  `    } finally {`,
  `      setConfirming(null);`,
  `    }`,
  `  };`,
  ``
);

// 2. Add the button for inspection_scheduled bookings, right after the
// existing Confirm Date button block closes.
const confirmDateBtnAnchor = findLine("Confirm Date");
let btnBlockEnd = -1;
for (let i = confirmDateBtnAnchor; i < confirmDateBtnAnchor + 4; i++) {
  if (lines[i].trim() === ')}') { btnBlockEnd = i; break; }
}
if (btnBlockEnd === -1) throw new Error('Could not find end of Confirm Date button block.');

const newButton = [
  `                          {booking.status === 'inspection_scheduled' && (`,
  `                            <button`,
  `                              onClick={() => handleMarkDone(booking.id)}`,
  `                              disabled={confirming === booking.id}`,
  `                              className="flex-1 bg-gold text-white py-2.5 rounded-xl text-[12px] font-bold hover:bg-gold-dark transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"`,
  `                            >`,
  `                              {confirming === booking.id`,
  `                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />`,
  `                                : <CheckCircle className="w-3.5 h-3.5" />`,
  `                              }`,
  `                              Mark Inspection Complete`,
  `                            </button>`,
  `                          )}`
];
lines.splice(btnBlockEnd + 1, 0, ...newButton);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('LandlordBookingsList.tsx: handleMarkDone + button added.');
