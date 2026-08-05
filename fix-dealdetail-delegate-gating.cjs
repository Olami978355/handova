const fs = require('fs');
const path = 'src/pages/DealDetail.tsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r\n|\n/);

// 769 - move-in confirm visibility (normal path)
lines[768] = lines[768].replace(
  "!deal.agreement_skipped && isTenant && (",
  "!deal.agreement_skipped && (isTenant || canConfirmMoveInAsDelegate) && ("
);

// 760 - signed confirmation message condition
lines[759] = lines[759].replace(
  "{((isTenant && deal.tenant_signed_at) || ((isLandlord || isAgent) && deal.landlord_signed_at)) && (",
  "{((isTenant && deal.tenant_signed_at) || ((isLandlord || isAgent) && deal.landlord_signed_at) || (canSignAsDelegate && delegateRepresentsTenant && deal.tenant_signed_at) || (canSignAsDelegate && !delegateRepresentsTenant && deal.landlord_signed_at)) && ("
);

// 750 - sign button visibility condition
lines[749] = lines[749].replace(
  "{((isTenant && !deal.tenant_signed_at) || ((isLandlord || isAgent) && !deal.landlord_signed_at)) && (",
  "{((isTenant && !deal.tenant_signed_at) || ((isLandlord || isAgent) && !deal.landlord_signed_at) || (canSignAsDelegate && delegateRepresentsTenant && !deal.tenant_signed_at) || (canSignAsDelegate && !delegateRepresentsTenant && !deal.landlord_signed_at)) && ("
);

// 675 - move-in confirm visibility (skip-agreement path)
lines[674] = lines[674].replace(
  "deal.agreement_skipped && isTenant && (",
  "deal.agreement_skipped && (isTenant || canConfirmMoveInAsDelegate) && ("
);

// 137-149 - the useEffect block (0-indexed 136-148)
const newEffect = [
  '  useEffect(() => {',
  '    if (!deal || !user || isTenant) return;',
  '    supabase',
  "      .from('deal_delegates')",
  "      .select('can_sign, can_pay, can_confirm_movein, principal_id')",
  "      .eq('deal_id', deal.id)",
  "      .eq('delegate_id', user.id)",
  "      .eq('status', 'accepted')",
  '      .maybeSingle()',
  '      .then(({ data }) => {',
  '        if (!data) return;',
  '        const representsTenant = data.principal_id === deal.tenant_id;',
  '        setCanPayAsDelegate(!!(data.can_pay && representsTenant));',
  '        setCanConfirmMoveInAsDelegate(!!(data.can_confirm_movein && representsTenant));',
  '        setCanSignAsDelegate(!!data.can_sign);',
  '        setDelegateRepresentsTenant(representsTenant);',
  '      });',
  '  }, [deal?.id, user?.id, isTenant]);',
];
lines.splice(136, 149 - 137 + 1, ...newEffect);

// 135 - state declaration (still at index 134, unaffected by later splices since it's earlier)
lines[134] = lines[134] + "\n  const [canSignAsDelegate, setCanSignAsDelegate] = useState(false);\n  const [canConfirmMoveInAsDelegate, setCanConfirmMoveInAsDelegate] = useState(false);\n  const [delegateRepresentsTenant, setDelegateRepresentsTenant] = useState(false);";

fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
console.log('Delegate action-gating fixed.');
