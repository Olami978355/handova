const fs = require('fs');
const path = 'src/components/inspection/BookInspectionModal.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// Bottom-to-top.

const errBannerIdx = findLine('bg-red-500/10 border border-red-500/20 rounded-xl">');
lines[errBannerIdx] = lines[errBannerIdx].replace('bg-red-500/10 border border-red-500/20', 'bg-danger/10 border border-danger/20');

const errIconIdx = findLine('<AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />');
lines[errIconIdx] = lines[errIconIdx].replace('text-red-400', 'text-danger');

const errTextIdx = findLine('<p className="text-[12px] text-red-400 leading-relaxed">{error}</p>');
lines[errTextIdx] = lines[errTextIdx].replace('text-red-400', 'text-danger');

const bulletIdx = findLine('<CheckCircle className="w-3 h-3 text-[#4ade80] flex-shrink-0" />');
lines[bulletIdx] = lines[bulletIdx].replace('text-[#4ade80]', 'text-gold');

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('BookInspectionModal.tsx: colors remapped to gold/danger.');
