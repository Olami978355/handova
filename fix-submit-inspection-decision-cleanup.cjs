const fs = require('fs');
const path = 'supabase/functions/submit-inspection-decision/index.ts';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const anchorIdx = lines.findIndex(l => l.includes("body: `The tenant who inspected ${booking.properties.title} has declined to proceed.`,"));
if (anchorIdx === -1) throw new Error('Notification body anchor not found.');

// Find the closing of send-notification's fetch call: "});" a few lines down
let fetchCloseIdx = -1;
for (let i = anchorIdx; i < anchorIdx + 6; i++) {
  if (lines[i].trim() === '});') { fetchCloseIdx = i; break; }
}
if (fetchCloseIdx === -1) throw new Error('fetch close anchor not found.');

// Everything between fetchCloseIdx+1 and the next "}" that closes the outer
// if/else block is the orphaned fragment — remove it, keeping only a blank
// line before the closing braces of the else block.
let elseCloseIdx = -1;
for (let i = fetchCloseIdx + 1; i < fetchCloseIdx + 10; i++) {
  if (lines[i].trim() === '}' && lines[i + 1] && lines[i + 1].trim() === '') {
    // heuristic not reliable enough — abort and report context instead
  }
}

console.log('Context after fetch close:');
for (let i = fetchCloseIdx; i < fetchCloseIdx + 8; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
