const fs = require('fs');
const path = 'src/pages/Admin/EscrowQueue.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Update the interface to include account_status on tenant/landlord/agent.
const ifaceLandlord = findLine("landlord?: { full_name: string };");
lines[ifaceLandlord] = "  landlord?: { full_name: string; account_status?: string };";
const ifaceAgent = findLine("agent?: { full_name: string };");
lines[ifaceAgent] = "  agent?: { full_name: string; account_status?: string };";

// 2. Update the query to fetch account_status too.
const queryLandlord = findLine("landlord:profiles!landlord_id(full_name),");
lines[queryLandlord] = "          landlord:profiles!landlord_id(full_name, account_status),";
const queryAgent = findLine("agent:profiles!agent_id(full_name)");
lines[queryAgent] = "          agent:profiles!agent_id(full_name, account_status)";

// 3. Add a badge next to the existing first-payout badge, warning if either
// party is suspended. Admin still sees the button, action is not blocked.
const badgeAnchor = findLine("FIRST PAYOUT · HELD FOR REVIEW");
// find the closing of that conditional block, a few lines down
let closeIdx = -1;
for (let i = badgeAnchor; i < badgeAnchor + 6; i++) {
  if (lines[i].trim() === ')}') { closeIdx = i; break; }
}
if (closeIdx === -1) throw new Error('Could not find close of first-payout badge conditional.');

lines.splice(closeIdx + 1, 0,
  `                  {(deal.landlord?.account_status === 'suspended' || deal.agent?.account_status === 'suspended') && (`,
  `                    <span className="text-[11px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-lg">`,
  `                      COUNTERPARTY SUSPENDED`,
  `                    </span>`,
  `                  )}`
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('EscrowQueue.tsx: suspended-party badge added.');
