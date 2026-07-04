import React, { useState, useEffect } from 'react';
import {
  Shield, CheckCircle, Calendar, Loader2,
  AlertCircle, ArrowRight, Info, Clock, MessageCircle
} from 'lucide-react';
import { Property, InspectionBooking } from '../../types';
import { calculateInspectionFee, formatFee } from '../../utils/inspectionFee';
import { useAuth } from '../../context/AuthContext';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { BookInspectionModal } from './BookInspectionModal';
import { useNavigate } from 'react-router-dom';
import { useConversationsContext } from '../../context/ConversationsContext';

interface InspectionFeeDisplayProps {
  property: Property;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

const STATUS_INFO: Record<string, { label: string; description: string; color: string }> = {
  pending_payment: {
    label: 'Payment Pending',
    description: 'Your booking is waiting for payment confirmation.',
    color: 'text-[#f0c040]',
  },
  payment_confirmed: {
    label: 'Payment Confirmed',
    description: 'Your inspection fee has been received. The landlord will confirm your inspection date shortly.',
    color: 'text-[#4ade80]',
  },
  inspection_scheduled: {
    label: 'Inspection Scheduled',
    description: 'Your inspection has been confirmed. Check your dashboard for the date and time.',
    color: 'text-[#4ade80]',
  },
  inspection_done: {
    label: 'Inspection Completed',
    description: 'You have completed your inspection. Please let us know if you want to proceed.',
    color: 'text-[#f0c040]',
  },
  tenant_interested: {
    label: 'Interested — Awaiting Escrow',
    description: 'You expressed interest. The landlord will initiate the escrow deal within 72 hours.',
    color: 'text-[#f0c040]',
  },
  escrow_started: {
    label: 'Escrow Started',
    description: 'The deal is in progress. Go to your dashboard to complete the payment.',
    color: 'text-[#4ade80]',
  },
  tenant_declined: {
    label: 'Inspection Declined',
    description: 'You declined after inspection. A 70% refund has been processed.',
    color: 'text-white/40',
  },
  refunded: {
    label: 'Refunded',
    description: 'Your inspection fee has been refunded.',
    color: 'text-white/40',
  },
  dispute_raised: {
    label: 'Dispute Raised',
    description: 'A dispute is under review by our moderation team.',
    color: 'text-red-400',
  },
  dispute_resolved: {
    label: 'Dispute Resolved',
    description: 'The dispute has been resolved. Check your dashboard for details.',
    color: 'text-white/40',
  },
};

export const InspectionFeeDisplay: React.FC<InspectionFeeDisplayProps> = ({ property }) => {
  const { user, profile } = useAuth();
  const { checkExistingBooking } = useInspectionBooking();
  const { findOrCreateConversation, conversations } = useConversationsContext();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingBooking, setExistingBooking] = useState<InspectionBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  const inspectionFee = calculateInspectionFee(
    property.price,
    property.price_period || null,
    property.listing_type,
    property.transaction_type
  );

  // Platform fee (2%) and processing
  const platformFee = Math.round(property.price * 0.02);
  const paystackFee = Math.min(Math.round(property.price * 0.015) + 100, 2000);
  const totalTenantPays = property.price;

  useEffect(() => {
    if (user) {
      checkExistingBooking(property.id).then(booking => {
        setExistingBooking(booking);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, property.id]);

  const handleStartChat = async () => {
    if (!user) { navigate('/login'); return; }
    setStartingChat(true);
    try {
      const conversationId = await findOrCreateConversation(
        property.id, user.id, property.owner_id
      );
      navigate(`/messages?id=${conversationId}`);
    } catch {
      // silent
    } finally {
      setStartingChat(false);
    }
  };

  // Hide for property owner
  if (profile?.id === property.owner_id) return null;

  // Property no longer available
  if (property.status === 'rented' || property.status === 'sold') {
    return (
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 text-center"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-[13px] font-semibold text-white/40 mb-1">
          {property.status === 'rented' ? 'This property has been rented' : 'This property has been sold'}
        </p>
        <p className="text-[11px] text-white/25 mb-4">It is no longer accepting new bookings.</p>
        <button
          onClick={() => navigate('/listings')}
          className="text-[12px] text-[#f0c040]/60 hover:text-[#f0c040] transition-colors flex items-center gap-1 mx-auto"
        >
          Browse similar properties <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Active escrow deal on property
  if (property.has_active_deal) {
    return (
      <div className="bg-[#0a1f11] border border-[#f0c040]/15 rounded-2xl p-5 text-center"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="w-10 h-10 bg-[#f0c040]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Clock className="w-5 h-5 text-[#f0c040]" />
        </div>
        <p className="text-[12px] font-bold text-[#f0c040] uppercase tracking-wider mb-1">
          Deal In Progress
        </p>
        <p className="text-[12px] text-white/40 leading-relaxed">
          A tenant is currently in escrow for this property. New inspection bookings are paused.
        </p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-[#1a6b3c]" />
          <p className="text-[13px] font-bold text-white">Book an Inspection</p>
        </div>
        <p className="text-[12px] text-white/40 mb-4 leading-relaxed">
          Sign in to book a viewing or proceed to rent this property securely via escrow.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-[#f0c040] text-black py-3 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
        >
          Sign In to Continue
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-8 flex items-center justify-center"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Loader2 className="w-6 h-6 text-[#1a6b3c] animate-spin" />
      </div>
    );
  }

  // Has existing booking — show status
  if (existingBooking) {
    const statusInfo = STATUS_INFO[existingBooking.status] || {
      label: existingBooking.status.replace(/_/g, ' '),
      description: 'Check your dashboard for details.',
      color: 'text-white/50',
    };

    const canGoToDeal = existingBooking.status === 'escrow_started';
    const isPending = ['payment_confirmed', 'inspection_scheduled', 'inspection_done', 'tenant_interested'].includes(existingBooking.status);

    return (
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="px-5 pt-5 pb-4 border-b border-white/5">
          <h3 className="text-[14px] font-bold text-white">Your Inspection</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Status card */}
          <div className={`p-4 rounded-xl border ${
            isPending ? 'bg-[#1a6b3c]/8 border-[#1a6b3c]/20' :
            canGoToDeal ? 'bg-[#f0c040]/8 border-[#f0c040]/20' :
            'bg-white/4 border-white/8'
          }`}>
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
            <p className="text-[12px] text-white/50 leading-relaxed">
              {statusInfo.description}
            </p>
            {existingBooking.confirmed_date && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/8">
                <Calendar className="w-3.5 h-3.5 text-[#1a6b3c]" />
                <span className="text-[12px] font-semibold text-white">
                  {new Date(existingBooking.confirmed_date).toLocaleDateString('en-NG', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                  {existingBooking.confirmed_time && ` · ${existingBooking.confirmed_time}`}
                </span>
              </div>
            )}
          </div>

          {/* Refund info if applicable */}
          {existingBooking.refund_amount && existingBooking.refund_amount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-white/4 border border-white/6 rounded-xl">
              <CheckCircle className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0" />
              <p className="text-[12px] text-white/50">
                Refund of {formatNaira(existingBooking.refund_amount)} processed
                ({existingBooking.refund_percentage}%)
              </p>
            </div>
          )}

          <button
            onClick={() => navigate(canGoToDeal ? '/dashboard' : '/dashboard')}
            className={`w-full py-3 rounded-xl font-bold text-[13px] transition-colors flex items-center justify-center gap-2 ${
              canGoToDeal
                ? 'bg-[#f0c040] text-black hover:bg-[#e0b030]'
                : 'bg-white/5 border border-white/8 text-white hover:bg-white/8'
            }`}
          >
            {canGoToDeal ? 'Complete Your Deal' : 'Manage in Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // No booking yet — show options
  return (
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="px-5 pt-5 pb-4 border-b border-white/5">
        <h3 className="text-[15px] font-bold text-white mb-0.5">Ready to proceed?</h3>
        <p className="text-[12px] text-white/40">
          How would you like to move forward with this property?
        </p>
      </div>

      <div className="p-5 space-y-3">

        {/* Chat first — subtle suggestion */}
        <button
          onClick={handleStartChat}
          disabled={startingChat}
          className="w-full flex items-center gap-3 p-3 bg-white/3 border border-white/6 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50 text-left"
        >
          {startingChat
            ? <Loader2 className="w-4 h-4 text-[#1a6b3c] animate-spin flex-shrink-0" />
            : <MessageCircle className="w-4 h-4 text-white/30 flex-shrink-0" />
          }
          <div>
            <p className="text-[12px] font-semibold text-white/60">Have questions?</p>
            <p className="text-[11px] text-white/30">Chat with the {property.profiles?.role || 'owner'} first — it's free</p>
          </div>
        </button>

        {/* OPTION 1 — Book inspection */}
        <div className="bg-[#111a14] border border-[#1a6b3c]/25 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-[#f0c040] bg-[#f0c040]/10 px-2 py-0.5 rounded-full">
                Recommended
              </span>
              <h4 className="text-[14px] font-bold text-white mt-1.5 mb-0.5">
                Book an Inspection
              </h4>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Visit the property before committing. Pay a small fee — mostly refundable.
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[18px] font-black text-[#f0c040]">{formatFee(inspectionFee)}</div>
              <div className="text-[10px] text-white/30">fee</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 mb-4">
            {[
              { text: '70% refund if you decline after visiting', icon: '↩' },
              { text: '100% refund if taken by another tenant', icon: '✓' },
              { text: '100% refund if property is misrepresented', icon: '✓' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[#4ade80] text-[11px] flex-shrink-0">{item.icon}</span>
                <span className="text-[11px] text-white/45">{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-[#1a6b3c] text-white py-3 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Book Inspection — {formatFee(inspectionFee)}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/6" />
          <span className="text-[11px] text-white/20 font-medium">or</span>
          <div className="flex-1 h-px bg-white/6" />
        </div>

        {/* OPTION 2 — Skip inspection */}
        <div className="bg-white/3 border border-white/6 rounded-xl p-4">
          <h4 className="text-[13px] font-bold text-white mb-1">
            Already seen this property?
          </h4>
          <p className="text-[11px] text-white/35 mb-3 leading-relaxed">
            Skip the inspection and pay rent directly. Your money is still held in escrow and only released after you confirm move-in.
          </p>

          <div className="bg-[#0a1f11] border border-white/6 rounded-xl p-3 mb-3 space-y-1.5">
            {[
              { label: `Rent (${property.price_period || 'outright'})`, value: formatNaira(property.price) },
              
              
            ].map((row, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-[11px] text-white/35">{row.label}</span>
                <span className="text-[11px] text-white/60">{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 border-t border-white/5">
              <span className="text-[12px] font-bold text-white">Total</span>
              <span className="text-[13px] font-black text-[#f0c040]">{formatNaira(totalTenantPays)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 mb-3 p-3 bg-[#f0c040]/5 border border-[#f0c040]/10 rounded-xl">
            <Info className="w-3.5 h-3.5 text-[#f0c040]/50 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/35 mb-3 leading-relaxed">
  Already viewed this property? Contact the owner via chat. They can send you a custom deal offer which you can accept and pay securely via escrow.
</p>
          </div>

       <button
  onClick={handleStartChat}
  disabled={startingChat}
  className="w-full bg-white/5 border border-white/10 text-white/60 py-3 rounded-xl font-semibold text-[13px] hover:bg-white/8 hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
>
  {startingChat
    ? <Loader2 className="w-4 h-4 animate-spin" />
    : <MessageCircle className="w-4 h-4" />
  }
  Contact Owner to Arrange Payment
</button>
        </div>
      </div>

      <BookInspectionModal
        property={property}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
