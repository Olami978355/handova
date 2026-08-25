import React, { useState } from 'react';
import { X, Scale, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../utils/format';
import { PaystackButton } from '../payment/PaystackButton';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const PLATFORM_FEE = 500;

interface LawyerConsultationModalProps {
  lawyerId: string;
  lawyerName: string;
  lawyerFee: number;
  onClose: () => void;
}

export const LawyerConsultationModal: React.FC<LawyerConsultationModalProps> = ({ lawyerId, lawyerName, lawyerFee, onClose }) => {
  const { user } = useAuth();
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = PLATFORM_FEE + lawyerFee;

  const handlePaymentSuccess = async (reference: string) => {
    if (!user) return;
    setBooking(true);
    setError(null);
    try {
      const responseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from('lawyer_review_bookings')
        .insert({
          deal_id: null,
          booking_type: 'consultation',
          requested_by: user.id,
          lawyer_id: lawyerId,
          platform_fee: PLATFORM_FEE,
          lawyer_fee: lawyerFee,
          paystack_reference: reference,
          status: 'paid',
          response_deadline: responseDeadline,
        });
      if (insertError) throw new Error(insertError.message);

      await supabase.from('notifications').insert([
        {
          user_id: lawyerId,
          title: 'New Consultation Request',
          body: 'Someone has booked a general consultation with you. Please respond within 48 hours.',
          type: 'lawyer_consultation_requested',
          link: '/lawyer/bookings',
        },
        {
          user_id: user.id,
          title: 'Consultation Booked',
          body: `Your consultation with ${lawyerName} has been booked. You'll be notified once they respond.`,
          type: 'lawyer_consultation_booked',
          link: '/dashboard',
        },
      ]);

      setBooked(true);
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
        className="bg-slate/20 border border-white/8 rounded-2xl p-6 max-w-md w-full"
        style={font}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/12 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-[16px] font-bold text-paper">Book a Consultation</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {booked ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-gold mx-auto mb-4" />
            <h4 className="text-[15px] font-bold text-paper mb-2">Consultation Requested</h4>
            <p className="text-[12px] text-paper/45 leading-relaxed mb-6">
              {lawyerName} has been notified. If they don't respond within 48 hours, the lawyer's fee is automatically refunded to you.
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
              Book {lawyerName} for general advice, no specific deal required. They'll follow up through your notifications.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-danger/8 border border-danger/20 rounded-xl">
                <p className="text-[11px] text-danger">{error}</p>
              </div>
            )}

            <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-5 space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-paper/45">Platform fee</span>
                <span className="text-paper/70 tabular-nums">{formatNaira(PLATFORM_FEE)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-paper/45">{lawyerName}'s fee</span>
                <span className="text-paper/70 tabular-nums">{formatNaira(lawyerFee)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-bold pt-1.5 border-t border-white/8">
                <span className="text-paper">Total</span>
                <span className="text-gold tabular-nums">{formatNaira(total)}</span>
              </div>
            </div>

            {user && (
              <PaystackButton
                amount={total}
                email={user.email || ''}
                reference={`LAWCONSULT_${lawyerId}_${Date.now()}`}
                label="Pay and Book Consultation"
                disabled={booking}
                metadata={{ lawyer_id: lawyerId, type: 'lawyer_consultation_payment' }}
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
