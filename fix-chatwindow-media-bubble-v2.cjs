const fs = require('fs');
const path = 'src/components/chat/ChatWindow.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function verify(lineNumber, expectedTrimmed) {
  const idx = lineNumber - 1;
  if (lines[idx].trim() !== expectedTrimmed) {
    throw new Error(`Line ${lineNumber} mismatch. Expected: "${expectedTrimmed}" Got: "${lines[idx].trim()}"`);
  }
}

verify(651, `const isCustomDeal = msg.message_type === 'custom_deal_offer';`);
verify(706, `className={\`px-4 py-2.5 text-[13px] leading-relaxed break-words cursor-pointer select-none \${`);
verify(708, `? 'bg-gold text-paper rounded-2xl rounded-tr-sm'`);
verify(709, `: 'bg-ink border border-white/8 text-paper/85 rounded-2xl rounded-tl-sm'`);

// Bottom-to-top edits.

lines[708] = lines[708].replace(
  `: 'bg-ink border border-white/8 text-paper/85 rounded-2xl rounded-tl-sm'`,
  `: \`\${isMedia ? '' : 'bg-ink border border-white/8'} text-paper/85 rounded-2xl rounded-tl-sm overflow-hidden\``
);
lines[707] = lines[707].replace(
  `? 'bg-gold text-paper rounded-2xl rounded-tr-sm'`,
  `? \`\${isMedia ? '' : 'bg-gold'} text-paper rounded-2xl rounded-tr-sm overflow-hidden\``
);
lines[705] = lines[705].replace(
  `className={\`px-4 py-2.5 text-[13px] leading-relaxed break-words cursor-pointer select-none \${`,
  `className={\`text-[13px] leading-relaxed break-words cursor-pointer select-none \${isMedia ? '' : 'px-4 py-2.5'} \${`
);

lines.splice(651, 0,
  `                const isMedia = !!msg.media_url && (msg.media_type === 'image' || msg.media_type === 'video');`
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('ChatWindow.tsx: media bubbles no longer inherit text-bubble padding/background.');
