const fs = require('fs');
const path = 'src/components/inspection/DisputeModal.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}" from index ${fromIdx}`);
}

// Bottom-to-top order.

// Success screen.
const successIconIdx = findLine('<Shield className="w-8 h-8 text-red-400" />');
lines[successIconIdx] = lines[successIconIdx].replace('text-red-400', 'text-gold');
const successBgIdx = findLine('bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4');
lines[successBgIdx] = lines[successBgIdx].replace('bg-red-500/15', 'bg-gold/15');

// Submit button.
const submitBtnIdx = findLine('bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50');
lines[submitBtnIdx] = lines[submitBtnIdx].replace('text-white bg-red-500 hover:bg-red-600', 'text-black bg-gold hover:bg-gold-dark');

// Second (lower) error banner — the submit-error one, near the button.
const err2TextIdx = findLine('<p className="text-[12px] text-red-400">{error}</p>');
lines[err2TextIdx] = lines[err2TextIdx].replace('text-red-400', 'text-danger');
const err2IconIdx = findLine('<AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />', err2TextIdx - 3);
lines[err2IconIdx] = lines[err2IconIdx].replace('text-red-400', 'text-danger');
const err2BannerIdx = findLine('bg-red-500/10 border border-red-500/20 rounded-xl">', err2IconIdx - 3);
lines[err2BannerIdx] = lines[err2BannerIdx].replace('bg-red-500/10 border border-red-500/20', 'bg-danger/10 border border-danger/20');

// Remove-photo badge — genuine destructive action, keep as danger.
const removeBadgeIdx = findLine('bg-red-500 text-white rounded-full flex items-center justify-center');
lines[removeBadgeIdx] = lines[removeBadgeIdx].replace('bg-red-500', 'bg-danger');

// Textarea/select focus rings — should not read as an error state by default.
const textareaFocusIdx = findLine('focus:border-red-500/50 transition-colors resize-none');
lines[textareaFocusIdx] = lines[textareaFocusIdx].replace('focus:border-red-500/50', 'focus:border-gold/50');
const selectFocusIdx = findLine('focus:border-red-500/50 transition-colors appearance-none cursor-pointer');
lines[selectFocusIdx] = lines[selectFocusIdx].replace('focus:border-red-500/50', 'focus:border-gold/50');

// Character-count success indicator.
const charCountIdx = findLine("description.length >= 50 ? 'text-[#4ade80]' : 'text-white/25'");
lines[charCountIdx] = lines[charCountIdx].replace("'text-[#4ade80]'", "'text-gold'");

// Required-field asterisks — gold instead of red.
const descAsteriskIdx = findLine('Description <span className="text-red-400">*</span>');
lines[descAsteriskIdx] = lines[descAsteriskIdx].replace('text-red-400', 'text-gold');
const reasonAsteriskIdx = findLine('Reason <span className="text-red-400">*</span>');
lines[reasonAsteriskIdx] = lines[reasonAsteriskIdx].replace('text-red-400', 'text-gold');

// First (upper) warning banner — genuine caution, keep danger.
const err1TextIdx = findLine('<p className="text-[11px] text-red-400/70 leading-relaxed">');
lines[err1TextIdx] = lines[err1TextIdx].replace('text-red-400/70', 'text-danger/70');
const err1TitleIdx = findLine('<p className="text-[12px] font-bold text-red-400 mb-1">');
lines[err1TitleIdx] = lines[err1TitleIdx].replace('text-red-400', 'text-danger');
const err1IconIdx = findLine('<AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />');
lines[err1IconIdx] = lines[err1IconIdx].replace('text-red-400', 'text-danger');
const err1BannerIdx = findLine('bg-red-500/10 border border-red-500/20 rounded-xl">');
lines[err1BannerIdx] = lines[err1BannerIdx].replace('bg-red-500/10 border border-red-500/20', 'bg-danger/10 border border-danger/20');

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('DisputeModal.tsx: all colors remapped.');
