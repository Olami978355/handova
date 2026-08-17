const fs = require('fs');
const path = 'src/components/chat/ChatWindow.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

function findLine(needle, fromIdx = 0) {
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(needle)) return i;
  }
  throw new Error(`Could not find line containing: "${needle}"`);
}

// 1. Add isMedia flag alongside isCustomDeal.
const flagIdx = findLine("const isCustomDeal = msg.message_type === 'custom_deal_offer';");
lines.splice(flagIdx + 1, 0,
  `                const isMedia = !!msg.media_url && (msg.media_type === 'image' || msg.media_type === 'video');`
);

// 2. Verify the bubble container and media lines are where expected, fresh
// after the insert above shifted line numbers by 1.
const bubbleOpenIdx = findLine('<div');
// Too generic to search blindly — instead anchor on the exact text bubble
// div's className, which is unique.
const textBubbleClassIdx = findLine("className={`px-4 py-2.5 text-[13px] leading-relaxed break-words cursor-pointer select-none ${");
const imgLineIdx = findLine("<img src={msg.media_url} alt=\"\" className=\"rounded-xl max-w-[240px] max-h-[320px] object-cover\" />");
const videoLineIdx = findLine("<video src={msg.media_url} controls className=\"rounded-xl max-w-[240px] max-h-[320px]\" />");

// 3. Find the closing div of the text bubble (the one right before the next
// menu-related block), by walking forward from imgLineIdx to the matching close.
let bubbleCloseIdx = -1;
for (let i = videoLineIdx; i < videoLineIdx + 6; i++) {
  if (lines[i].trim() === '</div>') { bubbleCloseIdx = i; break; }
}
if (bubbleCloseIdx === -1) throw new Error('Could not find closing </div> of the message bubble.');

// 4. Change the opening className to be conditional: no padding/background
// when the message is pure media (image/video, no text content alongside).
lines[textBubbleClassIdx] = lines[textBubbleClassIdx].replace(
  "className={`px-4 py-2.5 text-[13px] leading-relaxed break-words cursor-pointer select-none ${",
  "className={`text-[13px] leading-relaxed break-words cursor-pointer select-none ${isMedia ? '' : 'px-4 py-2.5'} ${"
);
const nextLineIdx = textBubbleClassIdx + 1;
if (!lines[nextLineIdx].includes("isMe")) throw new Error('Unexpected line after className anchor.');
lines[nextLineIdx] = lines[nextLineIdx].replace(
  "? 'bg-gold text-paper rounded-2xl rounded-tr-sm'",
  "? `${isMedia ? '' : 'bg-gold'} text-paper rounded-2xl rounded-tr-sm overflow-hidden`"
);
const line3Idx = textBubbleClassIdx + 2;
if (!lines[line3Idx].includes("bg-ink border")) throw new Error('Unexpected line for the non-me bubble branch.');
lines[line3Idx] = lines[line3Idx].replace(
  "'bg-ink border border-white/8 text-paper/85 rounded-2xl rounded-tl-sm'",
  "`${isMedia ? '' : 'bg-ink border border-white/8'} text-paper/85 rounded-2xl rounded-tl-sm overflow-hidden`"
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('ChatWindow.tsx: media bubbles no longer inherit text-bubble padding/background.');
