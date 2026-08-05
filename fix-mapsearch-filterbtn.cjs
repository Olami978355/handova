const fs = require('fs');
const p = 'src/pages/MapSearch.tsx';
let lines = fs.readFileSync(p, 'utf8').split(/\r\n|\n/);

const s = lines.findIndex(l => l.includes('{/* Verified toggle */}'));
if (s === -1) { console.error('start not found'); process.exit(1); }
let e = -1;
for (let i = s; i < lines.length; i++) {
  if (lines[i].trim() === '</button>') { e = i; break; }
}
lines.splice(s, e - s + 1,
  '      {/* Verified filter */}',
  "      <FilterBtn label=\"\u2713 Verified only\" active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)} />"
);

let lastImportIdx = 0;
for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImportIdx = i;
lines.splice(lastImportIdx + 1, 0, "import { FilterBtn } from '../components/ui/FilterBtn';");

fs.writeFileSync(p, lines.join('\n'));
console.log('done', s, '-', e);
