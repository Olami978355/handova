const fs = require('fs');
const path = 'src/pages/PropertyDetail.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const idx = lines.findIndex(l => l.includes("select('id, full_name, avatar_url, role, verification_status, lasrera_id')"));
if (idx === -1) throw new Error('Owner select anchor not found.');
lines[idx] = lines[idx].replace(
  "select('id, full_name, avatar_url, role, verification_status, lasrera_id')",
  "select('id, full_name, avatar_url, role, verification_status, lasrera_id, account_status')"
);

const propIdx = lines.findIndex(l => l.includes('{property.status === \'active\' && !isOwner && <InspectionFeeDisplay property={property} />}'));
if (propIdx === -1) throw new Error('InspectionFeeDisplay usage anchor not found.');
lines[propIdx] = lines[propIdx].replace(
  '<InspectionFeeDisplay property={property} />',
  '<InspectionFeeDisplay property={property} ownerAccountStatus={owner?.account_status} />'
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('PropertyDetail.tsx: account_status fetched and passed to InspectionFeeDisplay.');
