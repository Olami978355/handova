const fs = require('fs');

// 1. DealDetail.tsx: add caution fee line item to Payout Breakdown
{
  const p = 'src/pages/DealDetail.tsx';
  let content = fs.readFileSync(p, 'utf8');
  const old = "{ label: 'Total Amount', value: formatNaira(deal.amount), highlight: true },";
  const found = content.includes(old);
  content = content.replace(
    old,
    old + "\n                  ...(deal.caution_fee ? [{ label: 'Caution / Security Deposit', value: formatNaira(deal.caution_fee) }] : []),"
  );
  fs.writeFileSync(p, content);
  console.log('DealDetail.tsx updated, match found:', found);
}

// 2. PropertyDetail.tsx: show caution fee near the main price display
{
  const p = 'src/pages/PropertyDetail.tsx';
  let lines = fs.readFileSync(p, 'utf8').split(/\r\n|\n/);
  const idx = lines.findIndex(l => l.includes("{property.price_period && (") && lines.indexOf(l) > 640);
  let blockEnd = -1;
  for (let i = idx; i < lines.length; i++) {
    if (lines[i].trim() === ')}') { blockEnd = i; break; }
  }
  if (idx === -1 || blockEnd === -1) { console.error('price_period block not found'); process.exit(1); }
  lines.splice(blockEnd + 1, 0,
    '                    {(property as any).caution_fee && (',
    '                      <div className="text-[12px] text-paper/40 mt-1">',
    '                        + {new Intl.NumberFormat(\'en-NG\', { style: \'currency\', currency: \'NGN\', maximumFractionDigits: 0 }).format((property as any).caution_fee)} caution/security deposit',
    '                      </div>',
    '                    )}'
  );
  fs.writeFileSync(p, lines.join('\n'));
  console.log('PropertyDetail.tsx updated. idx:', idx, 'blockEnd:', blockEnd);
}
