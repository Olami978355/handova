import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, Shield, AlertCircle,
  CheckCircle, XCircle, Loader2, ArrowRight, Info
} from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { InspectionBooking } from '../../types';
import { formatFee } from '../../utils/inspectionFee';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { motion, AnimatePresence } from 'framer-motion';

interface InspectionBookingCardProps {
  booking: InspectionBooking;
  onUpdate?: () => void;
}

export const InspectionBookingCard: React.FC<InspectionBookingCardProps> = ({
  booking,
  onUpdate
}) => {
  const { submitDecision, loading } = useInspectionBooking();
  const [timeLeft, setTimeLeft] = useState('');
  const [showConfirm, setShowConfirm] = useState<{
    type: 'interested' | 'declined';
    show: boolean;
  }>({ type: 'interested', show: false });

  useEffect(() => {
    if (
      booking.status === 'inspection_done' &&
      booking.tenant_decision_deadline
    ) {
      const timer = setInterval(() => {
        const diff = differenceInSeconds(
          new Date(booking.tenant_decision_deadline!),
          new Date()
        );
        if (diff <= 0) {
          setTimeLeft('Expired');
          clearInterval(timer);
        } else {
          const h = Math.floor(diff / 3600);
          const m = Math.floor((diff % 3600) / 60);
          const s = diff % 60;
          setTimeLeft(`${h}h ${m}m ${s}s`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [booking.status, booking.tenant_decision_deadline]);

  const handleDecision = async (interested: boolean) => {
    try {
      await submitDecision(booking.id, interested);
      setShowConfirm(prev => ({ ...prev, show: false }));
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error submitting decision:', err);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending_payment:      { label: 'Pending Payment',      color: '#D4AF37', bg: 'rgba(240,192,64,0.1)' },
    payment_confirmed:    { label: 'Payment Confirmed',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    inspection_scheduled: { label: 'Inspection Scheduled', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    inspection_done:      { label: 'Inspection Done',      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    tenant_interested:    { label: 'Interested',           color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    tenant_declined:      { label: 'Declined',             color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    escrow_started:       { label: 'Escrow Started',       color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    refunded:             { label: 'Refunded',             color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    dispute_raised:       { label: 'Dispute Raised',       color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
    dispute_resolved:     { label: 'Dispute Resolved',     color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  };

  const status = statusConfig[booking.status] || {
    label: booking.status,
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.1)'
  };

  return (
    <div
      className="bg-ink border border-white/6 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="p-5">
        {/* Top — property + status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-[#111a14] rounded-xl overflow-hidden flex-shrink-0 border border-white/6">
              {booking.properties?.images?.[0] ? (
                <img
                  src={booking.properties.images[0]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/15">
                  <Shield className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold text-white truncate">
                {booking.properties?.title || 'Property'}
              </h3>
              <p className="text-[11px] text-white/35 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {booking.properties?.address || 'Address not available'}
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ color: status.color, background: status.bg }}
          >
            {status.label}
          </span>
        </div>

        {/* Fee + date grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/4 border border-white/6 rounded-xl p-3">
            <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider mb-1">
              Inspection Fee
            </p>
            <p className="text-[14px] font-black text-gold">
              {formatFee(booking.inspection_fee)}
            </p>
          </div>
          <div className="bg-white/4 border border-white/6 rounded-xl p-3">
            <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider mb-1">
              {booking.confirmed_date ? 'Confirmed Date' : 'Preferred Date'}
            </p>
            <p className="text-[13px] font-bold text-white">
              {booking.confirmed_date
                ? format(new Date(booking.confirmed_date), 'MMM d, yyyy')
                : booking.preferred_date
                ? format(new Date(booking.preferred_date), 'MMM d, yyyy')
                : 'TBD'
              }
            </p>
          </div>
        </div>

        {/* Decision window — inspection done */}
        {booking.status === 'inspection_done' && (
          <div className="bg-[#111a14] border border-white/8 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white/60">
                <Clock className="w-4 h-4" />
                <span className="text-[12px] font-semibold">
                  Decision deadline
                </span>
              </div>
              <span className="text-[13px] font-black text-gold">
                {timeLeft}
              </span>
            </div>
            <p className="text-[11px] text-white/35 mb-3 leading-relaxed">
              Did the property match what was advertised?
              You have 72 hours to decide.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowConfirm({ type: 'interested', show: true })}
                className="py-2.5 bg-gold text-white rounded-xl text-[12px] font-bold hover:bg-gold-dark transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Interested
              </button>
              <button
                onClick={() => setShowConfirm({ type: 'declined', show: true })}
                className="py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[12px] font-bold hover:bg-red-500/15 transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Not Interested
              </button>
            </div>
          </div>
        )}

        {/* Refunded */}
        {booking.status === 'refunded' && (
          <div className="flex items-center justify-between p-3 bg-white/4 border border-white/6 rounded-xl mb-4">
            <div className="flex items-center gap-2 text-white/40">
              <CheckCircle className="w-4 h-4 text-[#4ade80]" />
              <span className="text-[12px] font-semibold">Refund processed</span>
            </div>
            <span className="text-[13px] font-black text-[#4ade80]">
              {formatFee(booking.refund_amount || 0)}
            </span>
          </div>
        )}

        {/* Escrow started */}
        {booking.status === 'escrow_started' && (
          <div className="flex items-center gap-2 p-3 bg-gold/15 border border-gold/25 rounded-xl mb-4">
            <Shield className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
            <p className="text-[12px] text-[#4ade80] font-semibold">
              Escrow deal is active for this property
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[10px] text-white/20 font-mono">
            Ref: {booking.paystack_reference?.slice(-8) || '—'}
          </span>
          <button className="text-[12px] font-semibold text-gold/50 hover:text-gold transition-colors flex items-center gap-1">
            View Details <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm.show && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(prev => ({ ...prev, show: false }))}
              className="fixed inset-0 bg-black z-[120]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed inset-x-5 bottom-8 sm:inset-0 sm:m-auto sm:w-full sm:max-w-sm sm:h-fit bg-ink border border-white/8 rounded-2xl z-[130] p-6 shadow-2xl"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                showConfirm.type === 'interested'
                  ? 'bg-gold/20'
                  : 'bg-red-500/15'
              }`}>
                {showConfirm.type === 'interested'
                  ? <CheckCircle className="w-7 h-7 text-[#4ade80]" />
                  : <XCircle className="w-7 h-7 text-red-400" />
                }
              </div>
              <h3 className="text-[17px] font-black text-white text-center mb-2">
                {showConfirm.type === 'interested'
                  ? 'Confirm Interest'
                  : 'Decline Property'
                }
              </h3>
              <p className="text-[12px] text-white/45 text-center mb-6 leading-relaxed">
                {showConfirm.type === 'interested'
                  ? "The landlord will be notified. You have 72 hours to start escrow before your priority expires."
                  : "You will receive a 70% refund of your inspection fee. This cannot be undone."
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-3 rounded-xl font-semibold text-[13px] text-white/50 bg-white/5 hover:bg-white/8 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision(showConfirm.type === 'interested')}
                  disabled={loading}
                  className={`flex-1 py-3 rounded-xl font-bold text-[13px] text-white transition-colors flex items-center justify-center gap-2 ${
                    showConfirm.type === 'interested'
                      ? 'bg-gold hover:bg-gold-dark'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Confirm'
                  }
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
