import React, { useEffect, useState } from 'react';
import { X, Scale, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../utils/format';
import { PaystackButton } from '../payment/PaystackButton';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const PLATFORM_FEE = 500;

interface LawyerOption {
  id: string;
  user_id: string;
  specialty: string;
  default_fee: number;
  full_name: string | null;
  avatar_url: string | null;
}

interface LawyerReviewModalProps {
  dealId: string;
  onClose: () => void;
  onBooked: () => void;
}

export const LawyerReviewModal: React.FC<LawyerReviewModalProps> = ({ dealId, onClose, onBooked }) => {
  const { user } = useAuth();
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLawyers();
  }, []);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const { data: verifications } = await supabase
        .from('lawyer_verifications')
        .select('id, user_id, specialty, default_fee')
        .eq('status', 'approved')
        .or('specialty.eq.tenancy,specialty.eq.both')
        .order('default_fee', { ascending: true })
        .limit(20);

      if (!verifications || verifications.length === 0) {
        setLawyers([]);
        return;
      }

      const userIds = verifications.map(v => v.user_id);
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)
        .not('username', 'is', null);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      setLawyers(
        verifications
          .filter(v => profileMap[v.user_id])
          .map(v => ({
            ...v,
            full_name: profileMap[v.user_id].full_name,
            avatar_url: profileMap[v.user_id].avatar_url,
          }))
      );
    } catch (err) {
      console.error('Error fetching lawyers:', err);
      setError('Could not load lawyers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedLawyer = lawyers.find(l => l.user_id === selectedId);
  const total = selectedLawyer ? PLATFORM_FEE + selectedLawyer.default_fee : 0;

  const handlePaymentSuccess = async (reference: string) => {
    if (!user || !selectedLawyer) return;
    setBooking(true);
    setError(null);
    try {
      const responseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from('lawyer_review_bookings')
        .insert({
          deal_id: dealId,
          requested_by: user.id,
          lawyer_id: selectedLawyer.user_id,
          platform_fee: PLATFORM_FEE,
          lawyer_fee: selectedLawyer.default_fee,
          paystack_reference: reference,
          status: 'paid',
          response_deadline: responseDeadline,
        });
      if (insertError) throw new Error(insertError.message);

      await supabase.from('notifications').insert([
        {
          user_id: selectedLawyer.user_id,
          title: 'New Agreement Review Request',
          body: `You've been booked to review a tenancy agreement. Please respond within 48 hours.`,
          type: 'lawyer_review_requested',
          link: `/deals/${dealId}`,
        },
        {
          user_id: user.id,
          title: 'Lawyer Review Booked',
          body: `Your review request has been sent. You'll be notified once a verdict is submitted.`,
          type: 'lawyer_review_booked',
          link: `/deals/${dealId}`,
        },
      ]);

      setBooked(true);
      onBooked();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking';
      setError(msg);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-slate/20 border border-white/8 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
        style={font}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/12 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-[16px] font-bold text-paper">Get a Lawyer's Review</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {booked ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-gold mx-auto mb-4" />
            <h4 className="text-[15px] font-bold text-paper mb-2">Review Requested</h4>
            <p className="text-[12px] text-paper/45 leading-relaxed mb-6">
              {selectedLawyer?.full_name} has been notified. If they don't respond within 48 hours, the lawyer's fee is automatically refunded to you.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gold text-ink py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-paper/45 leading-relaxed mb-4">
              A lawyer will read your agreement and tell you if anything's a problem before you sign. Pick who reviews it.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-danger/8 border border-danger/20 rounded-xl">
                <p className="text-[11px] text-danger">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-gold animate-spin" />
              </div>
            ) : lawyers.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] text-paper/40">No lawyers are available for review right now.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-5">
                {lawyers.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedId(l.user_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                      selectedId === l.user_id ? 'border-gold bg-gold/8' : 'border-white/8 hover:border-white/15'
                    }`}
                  >
                    <div className="w-9 h-9 bg-gold/20 rounded-lg flex items-center justify-center text-gold text-[13px] font-bold flex-shrink-0 overflow-hidden">
                      {l.avatar_url ? (
                        <img src={l.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (l.full_name || 'L').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-paper truncate">{l.full_name || 'Handova Lawyer'}</p>
                      <p className="text-[11px] text-paper/40">{formatNaira(l.default_fee)} review fee</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedLawyer && (
              <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-5 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-paper/45">Platform fee</span>
                  <span className="text-paper/70 tabular-nums">{formatNaira(PLATFORM_FEE)}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-paper/45">{selectedLawyer.full_name}'s fee</span>
                  <span className="text-paper/70 tabular-nums">{formatNaira(selectedLawyer.default_fee)}</span>
                </div>
                <div className="flex justify-between text-[13px] font-bold pt-1.5 border-t border-white/8">
                  <span className="text-paper">Total</span>
                  <span className="text-gold tabular-nums">{formatNaira(total)}</span>
                </div>
              </div>
            )}

            {selectedLawyer && user && (
              <PaystackButton
                amount={total}
                email={user.email || ''}
                reference={`LAWREV_${dealId}_${Date.now()}`}
                label="Pay and Request Review"
                disabled={booking}
                metadata={{ deal_id: dealId, lawyer_id: selectedLawyer.user_id, type: 'lawyer_review_payment' }}
                onSuccess={handlePaymentSuccess}
                onClose={() => {}}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
