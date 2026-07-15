import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const firstName = (fullName?: string) => fullName?.split(' ')[0] || 'A tenant';

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
          padding: '56px', boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <p style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', margin: 0 }}>
            Rent<span style={{ color: '#f0c040' }}>Easy</span>
          </p>
          <div style={{ background: '#1a6b3c', color: '#fff', padding: '8px 18px', borderRadius: '12px', fontSize: '16px', fontWeight: '800' }}>
            ✓ Escrow Verified
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '32px' }} />

        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Transaction Receipt
        </p>
        <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#ffffff', margin: '0 0 8px', lineHeight: '1.2' }}>
          {property?.title}
        </h2>
        <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', margin: '0 0 32px' }}>
          📍 {property?.address}, {property?.lga}, {property?.state}
        </p>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px', marginBottom: '32px' }}>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Amount Held in Escrow
          </p>
          <p style={{ fontSize: '56px', fontWeight: '900', color: '#f0c040', margin: 0 }}>
            {formatNaira(deal.amount)}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Tenant</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{tenant?.full_name || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>
              {agent ? 'Agent' : 'Landlord'}
            </p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              {(agent || landlord)?.full_name || '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Status</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#4ade80', margin: 0, textTransform: 'capitalize' }}>
              {String(deal.status).replace(/_/g, ' ')}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', margin: '0 0 4px' }}>Date</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{dateStr}</p>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)', margin: 0, fontFamily: 'monospace' }}>
            Deal ID: {deal.id}
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            renteasyapp.com
          </p>
        </div>
      </div>
    );
  }
);
ReceiptCard.displayName = 'ReceiptCard';

export const PublicReceiptCard = React.forwardRef<HTMLDivElement, { deal: any; showAmount: boolean }>(
  ({ deal, showAmount }, ref) => {
    const property = deal.properties;
    const tenant = deal.profiles;

    return (
      <div
        ref={ref}
        style={{
          width: '1080px', height: '1080px', position: 'fixed',
          left: '-9999px', top: '-9999px', fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: '#0a1f11', display: 'flex', flexDirection: 'column',
          padding: '56px', boxSizing: 'border-box', justifyContent: 'center', alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ background: '#1a6b3c', color: '#fff', padding: '10px 24px', borderRadius: '14px', fontSize: '20px', fontWeight: '800', marginBottom: '32px' }}>
          ✓ Deal Closed via Escrow
        </div>
        <h2 style={{ fontSize: '40px', fontWeight: '900', color: '#ffffff', margin: '0 0 12px', lineHeight: '1.2' }}>
          {firstName(tenant?.full_name)} just secured a home
        </h2>
        <p style={{ fontSize: '22px', color: 'rgba(255,255,255,0.5)', margin: '0 0 32px' }}>
          📍 {property?.lga}, {property?.state}
        </p>
        {showAmount && (
          <p style={{ fontSize: '48px', fontWeight: '900', color: '#f0c040', margin: '0 0 40px' }}>
            {formatNaira(deal.amount)}
          </p>
        )}
        <p style={{ fontSize: '36px', fontWeight: '900', color: '#ffffff', margin: 0 }}>
          Rent<span style={{ color: '#f0c040' }}>Easy</span>
        </p>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.35)', margin: '8px 0 0' }}>
          Escrow-protected rentals · renteasyapp.com
        </p>
      </div>
    );
  }
);
PublicReceiptCard.displayName = 'PublicReceiptCard';

export const ReceiptPanel = ({ deal, onClose }: { deal: any; onClose: () => void }) => {
  const [showAmount, setShowAmount] = useState(true);
  const [generating, setGenerating] = useState<'private' | 'public' | null>(null);
  const privateRef = useRef<HTMLDivElement>(null);
  const publicRef = useRef<HTMLDivElement>(null);

  const download = async (ref: React.RefObject<HTMLDivElement>, filename: string, kind: 'private' | 'public') => {
    if (!ref.current) return;
    setGenerating(kind);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 1, useCORS: true, allowTaint: true, backgroundColor: '#0a1f11',
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate receipt:', err);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
      <ReceiptCard ref={privateRef} deal={deal} />
      <PublicReceiptCard ref={publicRef} deal={deal} showAmount={showAmount} />
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
        className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-white">Deal Receipt</h3>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <button
            onClick={() => download(privateRef, `renteasy-receipt-${deal.id.slice(0, 8)}.png`, 'private')}
            disabled={!!generating}
            className="w-full flex items-center gap-3 p-4 bg-[#1a6b3c]/10 border border-[#1a6b3c]/20 rounded-xl hover:bg-[#1a6b3c]/15 transition-colors disabled:opacity-50 text-left"
          >
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white">Full Receipt (private)</p>
              <p className="text-[11px] text-white/35">Full details — for you and the other party only</p>
            </div>
            {generating === 'private' && <span className="text-[11px] text-white/40">Generating...</span>}
          </button>

          <div className="border-t border-white/6 pt-4 space-y-3">
            <label className="flex items-center gap-2 text-[12px] text-white/50">
              <input type="checkbox" checked={showAmount} onChange={(e) => setShowAmount(e.target.checked)} />
              Include amount on public card
            </label>
            <button
              onClick={() => download(publicRef, `renteasy-public-receipt-${deal.id.slice(0, 8)}.png`, 'public')}
              disabled={!!generating}
              className="w-full flex items-center gap-3 p-4 bg-white/4 border border-white/8 rounded-xl hover:bg-white/6 transition-colors disabled:opacity-50 text-left"
            >
              <div className="flex-1">
                <p className="text-[13px] font-bold text-white">Public Share Card</p>
                <p className="text-[11px] text-white/35">First name only, no address, no deal ID — safe to post</p>
              </div>
              {generating === 'public' && <span className="text-[11px] text-white/40">Generating...</span>}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};
