import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, Shield, AlertCircle, 
  CheckCircle, XCircle, Loader2, Info, ArrowRight 
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
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState<{ type: 'interested' | 'declined', show: boolean }>({ type: 'interested', show: false });

  useEffect(() => {
    if (booking.status === 'inspection_done' && booking.tenant_decision_deadline) {
      const timer = setInterval(() => {
        const now = new Date();
        const deadline = new Date(booking.tenant_decision_deadline!);
        const diff = differenceInSeconds(deadline, now);

        if (diff <= 0) {
          setTimeLeft('Expired');
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = diff % 60;
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [booking.status, booking.tenant_decision_deadline]);

  const handleDecision = async (interested: boolean) => {
    try {
      await submitDecision(booking.id, interested);
      setShowConfirm({ ...showConfirm, show: false });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error submitting decision:', err);
    }
  };

  const getStatusColor = () => {
    switch (booking.status) {
      case 'payment_confirmed': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'inspection_scheduled': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'inspection_done': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'tenant_interested': return 'bg-[#1a6b3c]/10 text-[#1a6b3c] border-[#1a6b3c]/20';
      case 'escrow_started': return 'bg-[#1a6b3c] text-white border-[#1a6b3c]';
      case 'tenant_declined': return 'bg-red-50 text-red-600 border-red-100';
      case 'refunded': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
      case 'dispute_raised': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-zinc-50 text-zinc-500 border-zinc-100';
    }
  };

  const getStatusLabel = () => {
    switch (booking.status) {
      case 'pending_payment': return 'Pending Payment';
      case 'payment_confirmed': return 'Payment Confirmed';
      case 'inspection_scheduled': return 'Inspection Scheduled';
      case 'inspection_done': return 'Inspection Done';
      case 'tenant_interested': return 'Interested';
      case 'tenant_declined': return 'Declined';
      case 'escrow_started': return 'Escrow Started';
      case 'refunded': return 'Refunded';
      case 'dispute_raised': return 'Dispute Raised';
      case 'dispute_resolved': return 'Dispute Resolved';
      default: return booking.status;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100">
              <img 
                src={booking.properties?.images[0]} 
                alt="" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 line-clamp-1">{booking.properties?.title}</h3>
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin size={12} />
                {booking.properties?.address}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor()}`}>
            {getStatusLabel()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-50 p-3 rounded-2xl">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Inspection Fee</p>
            <p className="text-sm font-bold text-zinc-900">{formatFee(booking.inspection_fee)}</p>
          </div>
          <div className="bg-zinc-50 p-3 rounded-2xl">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Scheduled For</p>
            <p className="text-sm font-bold text-zinc-900">
              {booking.confirmed_date ? format(new Date(booking.confirmed_date), 'MMM d, yyyy') : 'TBD'}
            </p>
          </div>
        </div>

        {booking.status === 'inspection_done' && (
          <div className="mb-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 text-purple-700">
                <Clock size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Decision Deadline</span>
              </div>
              <span className="text-sm font-black text-purple-700">{timeLeft}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowConfirm({ type: 'interested', show: true })}
                className="bg-[#1a6b3c] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#14522e] transition-colors"
              >
                I'm Interested
              </button>
              <button 
                onClick={() => setShowConfirm({ type: 'declined', show: true })}
                className="bg-white text-red-600 border border-red-200 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
              >
                Not Interested
              </button>
            </div>
          </div>
        )}

        {booking.status === 'refunded' && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-500">
              <AlertCircle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Refund Processed</span>
            </div>
            <span className="text-sm font-black text-zinc-900">{formatFee(booking.refund_amount || 0)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Ref: {booking.paystack_reference?.slice(-8)}
          </span>
          <button className="text-[#1a6b3c] text-xs font-bold flex items-center gap-1 hover:underline">
            View Details <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm.show && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm({ ...showConfirm, show: false })}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-white rounded-[32px] z-[130] p-8 shadow-2xl"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                showConfirm.type === 'interested' ? 'bg-[#1a6b3c]/10 text-[#1a6b3c]' : 'bg-red-50 text-red-600'
              }`}>
                {showConfirm.type === 'interested' ? <CheckCircle size={32} /> : <XCircle size={32} />}
              </div>
              <h3 className="text-xl font-bold text-zinc-900 text-center mb-2">
                {showConfirm.type === 'interested' ? 'Confirm Interest' : 'Decline Property'}
              </h3>
              <p className="text-sm text-zinc-500 text-center mb-8">
                {showConfirm.type === 'interested' 
                  ? "Great! We'll notify the landlord. You'll have 72 hours to start escrow before your priority expires."
                  : "You'll receive a 70% refund of your inspection fee. This action cannot be undone."}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm({ ...showConfirm, show: false })}
                  className="flex-1 py-3 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDecision(showConfirm.type === 'interested')}
                  disabled={loading}
                  className={`flex-1 py-3 rounded-2xl font-bold text-white shadow-lg transition-all ${
                    showConfirm.type === 'interested' 
                      ? 'bg-[#1a6b3c] shadow-[#1a6b3c]/20 hover:bg-[#14522e]' 
                      : 'bg-red-600 shadow-red-600/20 hover:bg-red-700'
                  }`}
                >
                  {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
