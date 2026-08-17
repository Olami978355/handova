const fs = require('fs');
const path = 'src/pages/FAQPage.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const idx = lines.findIndex(l => l.includes("Yes, in most cases. You get 100% back if the property is misrepresented"));
if (idx === -1) throw new Error('FAQ refund answer anchor not found.');
lines[idx] = `        a: "You can cancel and get a full refund any time before the scheduled inspection date. Once that date arrives, the fee is automatically released to the agent or landlord and can't be reversed through a refund request. If the inspection didn't happen as agreed or the property was significantly misrepresented, you can raise a dispute for a moderator to review — a refund is only issued if the dispute is upheld."`;

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('FAQPage.tsx: refund answer updated.');
