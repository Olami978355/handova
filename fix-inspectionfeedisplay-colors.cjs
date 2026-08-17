const fs = require('fs');
const path = 'src/components/inspection/InspectionFeeDisplay.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let content = raw;

let count = 0;
content = content.split("color: 'text-[#4ade80]',").join((() => { count++; return "color: 'text-gold',"; })());
const greenCount = count;

count = 0;
content = content.split("color: 'text-red-400',").join((() => { count++; return "color: 'text-danger',"; })());
const redCount = count;

if (greenCount === 0 && redCount === 0) throw new Error('No replacements made — aborting write.');

fs.writeFileSync(path, content, 'utf8');
console.log(`InspectionFeeDisplay.tsx: replaced ${greenCount} green and ${redCount} red status colors.`);
