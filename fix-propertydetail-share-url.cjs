const fs = require('fs');
const path = 'src/pages/PropertyDetail.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

let fixCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('https://renteasyapp.com/property/${property.id}')) {
    lines[i] = lines[i].replace(
      'const propertyUrl = `https://renteasyapp.com/property/${property.id}`;',
      'const propertyUrl = `${window.location.origin}/property/${property.id}`;'
    );
    fixCount++;
  }
  if (lines[i].includes('https://renteasyapp.com/property/${id}')) {
    lines[i] = lines[i].replace(
      'const propertyUrl = `https://renteasyapp.com/property/${id}`;',
      'const propertyUrl = `${window.location.origin}/property/${id}`;'
    );
    fixCount++;
  }
}

if (fixCount !== 2) throw new Error(`Expected to fix 2 occurrences, fixed ${fixCount}. Aborting write.`);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log(`PropertyDetail.tsx: fixed ${fixCount} hardcoded share URLs, now derived from window.location.origin.`);
