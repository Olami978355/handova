import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

export const ReceiptCard = React.forwardRef<HTMLDivElement, { deal: any }>(
  ({ deal }, ref) => {
    const property = deal.properties;
    const tenant = deal.profiles;
    const landlord = deal.landlord;
    const agent = deal.agent;
    const dateStr = new Date(deal.updated_at).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
      <div
        ref={ref}
        style={{
          width: '1080px', height: '1350px', position: 'fixed',
          left: '-9999px', top: '-9999px', fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: '#0a1f11', display: 'flex', flexDirection: 'column',
          padding: '64px', boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '48px' }}>
          <p style={{ fontSize: '30px', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>
            Rent<span style={{ color: '#f0c040' }}>Easy</span>
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: '600' }}>
            Escrow Verified
          </p>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '40px' }} />

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>
          Transaction Receipt
        </p>
        <h2 style={{ fontSize: '34px', fontWeight: '800', color: '#ffffff', margin: '0 0 8px', lineHeight: '1.25' }}>
          {property?.title}
        </h2>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', margin: '0 0 40px' }}>
          {property?.address}, {property?.lga}, {property?.state}
        </p>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '36px', marginBottom: '36px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>
            Amount Held in Escrow
          </p>
          <p style={{ fontSize: '52px', fontWeight: '800', color: '#f0c040', margin: 0, letterSpacing: '-1px' }}>
            {formatNaira(deal.amount)}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '28px', columnGap: '24px', marginBottom: '36px' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', fontWeight: '600' }}>Tenant</p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{tenant?.full_name || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', fontWeight: '600' }}>
              {agent ? 'Agent' : 'Landlord'}
            </p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              {(agent || landlord)?.full_name || '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', fontWeight: '600' }}>Status</p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: '#4ade80', margin: 0, textTransform: 'capitalize' }}>
              {String(deal.status).replace(/_/g, ' ')}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px', fontWeight: '600' }}>Date</p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{dateStr}</p>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginTop: 'auto', marginBottom: '24px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'monospace' }}>
            {deal.id}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            renteasyapp.com
          </p>
        </div>
      </div>
    );
  }
);
ReceiptCard.displayName = 'ReceiptCard';

export const ReceiptPanel = ({ deal, onClose }: { deal: any; onClose: () => void }) => {
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 1, useCORS: true, allowTaint: true, backgroundColor: '#0a1f11',
      });
      const link = document.createElement('a');
      link.download = `renteasy-receipt-${deal.id.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate receipt:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <ReceiptCard ref={cardRef} deal={deal} />
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-sm h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-white">Deal Receipt</h3>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[12px] text-white/40 mb-4 leading-relaxed">
            A clean, shareable record of this transaction.
          </p>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="w-full bg-[#1a6b3c] text-white py-3.5 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Download Receipt'}
          </button>
        </div>
      </motion.div>
    </>
  );
};
