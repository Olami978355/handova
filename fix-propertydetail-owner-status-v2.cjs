const fs = require('fs');
const path = 'src/pages/PropertyDetail.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Revert the pointless account_status addition to the select list —
// public_profiles filters out suspended users entirely, so this column
// would never be returned regardless.
const selectIdx = findLine("select('id, full_name, avatar_url, role, verification_status, lasrera_id, account_status')");
lines[selectIdx] = lines[selectIdx].replace(
  "select('id, full_name, avatar_url, role, verification_status, lasrera_id, account_status')",
  "select('id, full_name, avatar_url, role, verification_status, lasrera_id')"
);

// 2. Add a new state flag: true when owner_id exists but the profile fetch
// came back empty — which, given the view's WHERE clause, means suspended.
const stateIdx = findLine("const [owner, setOwner] = useState<Profile | null>(null);");
lines.splice(stateIdx + 1, 0, `  const [ownerLikelySuspended, setOwnerLikelySuspended] = useState(false);`);

// 3. Set that flag right after the owner fetch.
const setOwnerIdx = findLine('setOwner(ownerData as Profile);');
lines[setOwnerIdx] = lines[setOwnerIdx] + `\n        if (!ownerData) setOwnerLikelySuspended(true);`;

// 4. Update the InspectionFeeDisplay usage to pass the new flag instead.
const usageIdx = findLine('<InspectionFeeDisplay property={property} ownerAccountStatus={owner?.account_status} />');
lines[usageIdx] = lines[usageIdx].replace(
  '<InspectionFeeDisplay property={property} ownerAccountStatus={owner?.account_status} />',
  '<InspectionFeeDisplay property={property} ownerLikelySuspended={ownerLikelySuspended} />'
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('PropertyDetail.tsx: corrected to use owner-fetch-empty as the suspension signal.');
