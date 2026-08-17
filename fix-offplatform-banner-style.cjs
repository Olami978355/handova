const fs = require('fs');
const path = 'src/components/chat/ChatWindow.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

const checkLine = findLine('{offPlatformWarning && (');
const pLine = findLine('<p className="text-[11px] text-paper/45 mb-2 px-1">{offPlatformWarning.message}</p>', checkLine);

if (!lines[checkLine].trim().startsWith('{offPlatformWarning && (')) {
  throw new Error('Unexpected content at checkLine.');
}
if (pLine !== checkLine + 1) {
  throw new Error(`Expected the <p> line immediately after the check line. checkLine=${checkLine}, pLine=${pLine}`);
}
if (!lines[pLine + 1].trim().startsWith(')}')) {
  throw new Error('Unexpected content after the <p> line — expected closing )}');
}

lines.splice(pLine, 1,
  `            <div className="flex items-start gap-2 mb-2 px-3 py-2 bg-gold/8 border border-gold/20 rounded-xl">`,
  `              <AlertCircle className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />`,
  `              <p className="text-[12px] text-paper/80 leading-snug">{offPlatformWarning.message}</p>`,
  `            </div>`
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('ChatWindow.tsx: off-platform warning restyled as a proper inline banner.');
