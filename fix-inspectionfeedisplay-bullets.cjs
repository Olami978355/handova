const fs = require('fs');
const path = 'src/components/inspection/InspectionFeeDisplay.tsx';
const raw = fs.readFileSync(path, 'utf8');
const content = raw.split('#4ade80').join('D4AF37');
if (content === raw) throw new Error('No #4ade80 found — nothing to replace.');
fs.writeFileSync(path, content, 'utf8');
console.log('InspectionFeeDisplay.tsx: remaining bullet icon colors updated to gold hex.');
