const fs = require('fs');

// 1. useMessages.ts: sendCustomDealOffer accepts + inserts caution_fee
{
  const p = 'src/hooks/useMessages.ts';
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(
    "    duration?: string;\n    moveInDate?: string;\n    note?: string;\n  }): Promise<void> => {",
    "    duration?: string;\n    moveInDate?: string;\n    note?: string;\n    cautionFee?: number;\n  }): Promise<void> => {"
  );
  content = content.replace(
    "          note: offer.note || null,\n          status: 'pending',",
    "          note: offer.note || null,\n          caution_fee: offer.cautionFee || null,\n          status: 'pending',"
  );
  fs.writeFileSync(p, content);
  console.log('useMessages.ts updated');
}

// 2. ChatWindow.tsx: CreateDealModal gets a caution fee field, handleSendDealOffer passes it through
{
  const p = 'src/components/chat/ChatWindow.tsx';
  let lines = fs.readFileSync(p, 'utf8').split(/\r\n|\n/);

  // handleSendDealOffer signature + call
  const dataTypeIdx = lines.findIndex(l => l.includes('const handleSendDealOffer = async (data: {'));
  for (let i = dataTypeIdx; i < dataTypeIdx + 6; i++) {
    if (lines[i].includes('note: string;')) { lines[i] = lines[i].replace('note: string;', 'note: string;\n    cautionFee?: number;'); break; }
  }
  const sendCallIdx = lines.findIndex(l => l.includes('note: data.note,') && lines.indexOf(l) > dataTypeIdx);
  lines[sendCallIdx] = lines[sendCallIdx].replace('note: data.note,', 'note: data.note,\n        cautionFee: data.cautionFee,');

  // CreateDealModal props type
  const onSendTypeIdx = lines.findIndex(l => l.includes('  onSend: (data: {'));
  for (let i = onSendTypeIdx; i < onSendTypeIdx + 6; i++) {
    if (lines[i].includes('note: string;')) { lines[i] = lines[i].replace('note: string;', 'note: string;\n    cautionFee?: number;'); break; }
  }

  // CreateDealModal internal state
  const noteStateIdx = lines.findIndex(l => l.includes("const [note, setNote] = useState('');"));
  lines.splice(noteStateIdx + 1, 0, "  const [cautionFee, setCautionFee] = useState('');");

  // handleSubmit onSend call
  const handleSubmitOnSendIdx = lines.findIndex(l => l.includes('onSend({ agreedPrice: price, duration, moveInDate, note });'));
  lines[handleSubmitOnSendIdx] = lines[handleSubmitOnSendIdx].replace(
    'onSend({ agreedPrice: price, duration, moveInDate, note });',
    'onSend({ agreedPrice: price, duration, moveInDate, note, cautionFee: cautionFee ? parseInt(cautionFee) : undefined });'
  );

  fs.writeFileSync(p, lines.join('\n'));
  console.log('ChatWindow.tsx updated. dataTypeIdx:', dataTypeIdx, 'sendCallIdx:', sendCallIdx, 'onSendTypeIdx:', onSendTypeIdx, 'noteStateIdx:', noteStateIdx, 'handleSubmitOnSendIdx:', handleSubmitOnSendIdx);
}

// 3. respond-to-deal-offer edge function: carry caution_fee into the new deal
{
  const p = 'supabase/functions/respond-to-deal-offer/index.ts';
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(
    "        notes: offer.note || null,\n        duration: offer.duration || null,\n      };",
    "        notes: offer.note || null,\n        duration: offer.duration || null,\n        caution_fee: offer.caution_fee || null,\n      };"
  );
  fs.writeFileSync(p, content);
  console.log('respond-to-deal-offer/index.ts updated');
}
