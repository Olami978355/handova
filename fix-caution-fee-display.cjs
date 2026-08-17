const fs = require('fs');
const p = 'src/components/chat/ChatWindow.tsx';
let lines = fs.readFileSync(p, 'utf8').split(/\r\n|\n/);

// 1. DealOfferCard: show caution fee after duration
const durationBlockIdx = lines.findIndex(l => l.includes('{offer.duration && ('));
let durationBlockEnd = -1;
for (let i = durationBlockIdx; i < lines.length; i++) {
  if (lines[i].trim() === ')}') { durationBlockEnd = i; break; }
}
if (durationBlockIdx === -1 || durationBlockEnd === -1) { console.error('duration block not found'); process.exit(1); }
lines.splice(durationBlockEnd + 1, 0,
  '        {(offer as any).caution_fee && (',
  '          <div className="flex items-center justify-between pt-1 border-t border-white/5">',
  '            <p className="text-[11px] text-paper/40">Caution / Security Deposit</p>',
  '            <p className="text-[12px] font-semibold text-paper/70">{formatNaira((offer as any).caution_fee)}</p>',
  '          </div>',
  '        )}'
);

// 2. CreateDealModal: add caution fee input after Agreed Price block
const agreedPriceHintIdx = lines.findIndex(l => l.includes('= {formatNaira(parseInt(agreedPrice))}'));
let agreedPriceBlockEnd = -1;
for (let i = agreedPriceHintIdx; i < lines.length; i++) {
  if (lines[i].trim() === '</div>') { agreedPriceBlockEnd = i; break; }
}
if (agreedPriceHintIdx === -1 || agreedPriceBlockEnd === -1) { console.error('agreed price block not found'); process.exit(1); }
lines.splice(agreedPriceBlockEnd + 1, 0,
  '          <div>',
  '            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Caution / Security Deposit (\u20a6) <span className="normal-case text-paper/25">(optional)</span></label>',
  '            <input',
  '              type="number"',
  '              value={cautionFee}',
  '              onChange={e => setCautionFee(e.target.value)}',
  '              placeholder="e.g. 200000"',
  '              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-white/25 outline-none focus:border-gold/50 transition-colors"',
  '            />',
  '          </div>'
);

fs.writeFileSync(p, lines.join('\n'));
console.log('done. durationBlockIdx:', durationBlockIdx, 'durationBlockEnd:', durationBlockEnd, 'agreedPriceHintIdx:', agreedPriceHintIdx, 'agreedPriceBlockEnd:', agreedPriceBlockEnd);
