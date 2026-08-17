const fs = require('fs');
const path = 'src/pages/Admin/DisputeQueue.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Add new state near resolutionText.
const stateIdx = findLine("const [resolutionText, setResolutionText] = useState('');");
lines.splice(stateIdx + 1, 0,
  `  const [refundTenant, setRefundTenant] = useState(true);`,
  `  const [atFaultPartyId, setAtFaultPartyId] = useState<'landlord' | 'agent' | null>('landlord');`
);

// 2. Rewrite handleResolve to take no boolean param, read from state instead.
const handleResolveIdx = findLine('const handleResolve = async (landlordAtFault: boolean) => {');
lines[handleResolveIdx] = '  const handleResolve = async () => {';
const bodyStartIdx = handleResolveIdx + 1;
const invokeIdx = findLine('body: { bookingId: selectedDispute.id, resolution: resolutionText, landlordAtFault },', bodyStartIdx);
lines[invokeIdx] = '        body: { bookingId: selectedDispute.id, resolution: resolutionText, refundTenant, atFaultPartyId },';

// Reset new state alongside the existing reset in the success path.
const successResetIdx = findLine('setResolutionText(\'\');', bodyStartIdx);
lines.splice(successResetIdx + 1, 0,
  `      setRefundTenant(true);`,
  `      setAtFaultPartyId('landlord');`
);

// 3. Replace the two-button block with the new independent controls.
const btn1Idx = findLine('onClick={() => handleResolve(true)}');
const btn2CloseIdx = findLine('Tenant at Fault, Reject Dispute');
// find the closing </button> after btn2CloseIdx
let btn2EndIdx = -1;
for (let i = btn2CloseIdx; i < btn2CloseIdx + 4; i++) {
  if (lines[i].trim() === '</button>') { btn2EndIdx = i; break; }
}
if (btn2EndIdx === -1) throw new Error('Could not find end of second button.');

const newControls = [
  `              <div className="space-y-2">`,
  `                <p className="text-[10px] text-paper/30 uppercase tracking-wider">Refund Tenant?</p>`,
  `                <div className="flex gap-2">`,
  `                  <button`,
  `                    onClick={() => setRefundTenant(true)}`,
  `                    className={\`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors \${`,
  `                      refundTenant ? 'bg-gold/15 border-gold/30 text-gold' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'`,
  `                    }\`}`,
  `                  >`,
  `                    Yes, refund 100%`,
  `                  </button>`,
  `                  <button`,
  `                    onClick={() => setRefundTenant(false)}`,
  `                    className={\`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors \${`,
  `                      !refundTenant ? 'bg-danger/15 border-danger/30 text-danger' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'`,
  `                    }\`}`,
  `                  >`,
  `                    No refund`,
  `                  </button>`,
  `                </div>`,
  `              </div>`,
  `              <div className="space-y-2">`,
  `                <p className="text-[10px] text-paper/30 uppercase tracking-wider">Who is at fault?</p>`,
  `                <div className="flex gap-2">`,
  `                  <button`,
  `                    onClick={() => setAtFaultPartyId('landlord')}`,
  `                    className={\`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors \${`,
  `                      atFaultPartyId === 'landlord' ? 'bg-danger/15 border-danger/30 text-danger' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'`,
  `                    }\`}`,
  `                  >`,
  `                    Landlord`,
  `                  </button>`,
  `                  {selectedDispute.agent_id && (`,
  `                    <button`,
  `                      onClick={() => setAtFaultPartyId('agent')}`,
  `                      className={\`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors \${`,
  `                        atFaultPartyId === 'agent' ? 'bg-danger/15 border-danger/30 text-danger' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'`,
  `                      }\`}`,
  `                    >`,
  `                      Agent`,
  `                    </button>`,
  `                  )}`,
  `                  <button`,
  `                    onClick={() => setAtFaultPartyId(null)}`,
  `                    className={\`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors \${`,
  `                      atFaultPartyId === null ? 'bg-white/10 border-white/20 text-paper' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'`,
  `                    }\`}`,
  `                  >`,
  `                    No fault`,
  `                  </button>`,
  `                </div>`,
  `                {atFaultPartyId && (`,
  `                  <p className="text-[11px] text-paper/30">A strike will be issued to the {atFaultPartyId}.</p>`,
  `                )}`,
  `              </div>`,
  `              <button`,
  `                onClick={handleResolve}`,
  `                disabled={!!resolving || !resolutionText}`,
  `                className="w-full bg-gold text-ink py-3.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"`,
  `              >`,
  `                {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}`,
  `                Confirm Resolution`,
  `              </button>`
];

lines.splice(btn1Idx - 1, (btn2EndIdx - btn1Idx) + 2, ...newControls);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('DisputeQueue.tsx: independent refund/fault controls added.');
