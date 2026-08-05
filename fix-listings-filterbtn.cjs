const fs = require('fs');
const p = 'src/pages/Listings.tsx';
let lines = fs.readFileSync(p, 'utf8').split(/\r\n|\n/);

const startIdx = lines.findIndex(l => l.includes('const FilterBtn = ({'));
if (startIdx === -1) { console.error('FilterBtn def not found'); process.exit(1); }
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].trim() === ');') { endIdx = i; break; }
}
lines.splice(startIdx, endIdx - startIdx + 1);

let lastImportIdx = 0;
for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('import ')) lastImportIdx = i;
lines.splice(lastImportIdx + 1, 0, "import { FilterBtn } from '../components/ui/FilterBtn';");

function removeBlock(startMarker, extraDivAfter) {
  const s = lines.findIndex(l => l.includes(startMarker));
  if (s === -1) { console.error('not found:', startMarker); return; }
  let e = -1;
  for (let i = s; i < lines.length; i++) {
    if (lines[i].trim() === '</button>') { e = i; break; }
  }
  if (extraDivAfter && lines[e + 1] && lines[e + 1].trim() === '</div>') e += 1;
  lines.splice(s, e - s + 1);
  console.log('removed', startMarker, s, '-', e);
}
removeBlock('{/* Verified only */}', true);
removeBlock('{/* Verified */}', false);

fs.writeFileSync(p, lines.join('\n'));
console.log('done');
