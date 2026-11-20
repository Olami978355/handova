import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Loader2,
  ArrowRight,
  MessageCircle,
  Clock,
  CheckCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Property, InspectionBooking } from '../../types';
import { getInspectionFee, formatFee } from '../../utils/inspectionFee';
import { useAuth } from '../../context/AuthContext';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { BookInspectionModal } from './BookInspectionModal';
import { useNavigate } from 'react-router-dom';
import { useConversationsContext } from '../../context/ConversationsContext';

interface InspectionFeeDisplayProps {
  property: Property;
  ownerLikelySuspended?: boolean;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);

const STATUS_INFO: Record<
  string,
  { label: string; description: string; color: string }
> = {
  pending_payment: {
    label: 'Payment pending',
    description: 'Complete your payment to confirm this inspection booking.',
    color: 'text-amber-600',
  },
  payment_confirmed: {
    label: 'Payment confirmed',
    description: 'Your inspection fee has been received. Check your dashboard for scheduling updates.',
    color: 'text-green-700',
  },
  inspection_scheduled: {
    label: 'Inspection scheduled',
    description: 'Your inspection date has been confirmed. Keep the details handy.',
    color: 'text-green-700',
  },
  inspection_done: {
    label: 'Inspection completed',
    description: 'Your visit is complete. You can now discuss the next steps with the owner.',
    color: 'text-green-700',
  },
  tenant_interested: {
    label: 'Interested in the property',
    description: 'You expressed interest. Check your dashboard for the next step.',
    color: 'text-amber-700',
  },
  escrow_started: {
    label: 'Deal in progress',
    description: 'A deal has been started for this property. Continue from your dashboard.',
    color: 'text-green-700',
  },
  tenant_declined: {
    label: 'Inspection completed',
    description: 'You declined to proceed after the inspection.',
    color: 'text-gray-500',
  },
  refunded: {
    label: 'Refund recorded',
    description: 'A refund has been recorded for this booking. Check your dashboard for details.',
    color: 'text-gray-500',
  },
  dispute_raised: {
    label: 'Dispute raised',
    description: 'A dispute has been submitted. Check your dashboard for updates.',
    color: 'text-red-600',
  },
  dispute_resolved: {
    label: 'Dispute resolved',
    description: 'Your dispute has been resolved. Check your dashboard for details.',
    color: 'text-gray-500',
  },
};

export const InspectionFeeDisplay: React.FC<InspectionFeeDisplayProps> = ({
  property,
  ownerLikelySuspended,
}) => {
  const { user, profile } = useAuth();
  const { checkExistingBooking } = useInspectionBooking();
  const { findOrCreateConversation } = useConversationsContext();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingBooking, setExistingBooking] =
    useState<InspectionBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  const isSuspendedOwner = !!ownerLikelySuspended;
  const inspectionFee = getInspectionFee(property);
  const feeLabel = inspectionFee > 0 ? formatFee(inspectionFee) : 'Free';

  useEffect(() => {
    let active = true;

    if (user) {
      setLoading(true);

      checkExistingBooking(property.id).then((booking) => {
        if (active) {
          setExistingBooking(booking);
          setLoading(false);
        }
      }).catch(() => {
        if (active) setLoading(false);
      });
    } else {
      setExistingBooking(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [user, property.id]);

  const handleStartChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setStartingChat(true);

    try {
      const conversationId = await findOrCreateConversation(
        property.id,
        user.id,
        property.owner_id
      );

      navigate(`/messages?id=${conversationId}`);
    } catch {
      // Keep the current page if a conversation cannot be opened.
    } finally {
      setStartingChat(false);
    }
  };

  if (profile?.id === property.owner_id) return null;

  if (property.has_active_deal) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-5 h-5 text-amber-700" />
          <h3 className="font-semibold text-gray-900">
            Deal in progress
          </h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          A transaction is currently in progress for this property.
          New inspection bookings are temporarily unavailable.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 mb-2">
          Next step
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mb-2"
          style={{ fontFamily: "'Newsreader', serif" }}>
          See the property before you decide.
        </h3>

        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          Sign in to arrange an inspection or speak directly with the owner.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-[#0B0D10] text-white py-3.5 px-4 text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Sign in to continue
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#B18A28] animate-spin" />
      </div>
    );
  }

  if (existingBooking) {
    const statusInfo = STATUS_INFO[existingBooking.status] || {
      label: existingBooking.status.replace(/_/g, ' '),
      description: 'Check your dashboard for the latest booking information.',
      color: 'text-gray-600',
    };

    const canGoToDeal = existingBooking.status === 'escrow_started';

    return (
      <div className="bg-white border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 mb-1">
            Your booking
          </p>
          <h3
            className="text-2xl text-gray-900"
            style={{ fontFamily: "'Newsreader', serif" }}
          >
            Inspection update
          </h3>
        </div>

        <div className="p-5">
          <div className="border-l-2 border-[#B18A28] bg-[#FAF9F6] p-4 mb-5">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${statusInfo.color}`}>
              {statusInfo.label}
            </p>

            <p className="text-sm text-gray-600 leading-relaxed">
              {statusInfo.description}
            </p>

            {existingBooking.confirmed_date && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
                <Calendar className="w-4 h-4 text-[#B18A28]" />
                <span className="text-sm font-medium text-gray-800">
                  {new Date(existingBooking.confirmed_date).toLocaleDateString(
                    'en-NG',
                    {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }
                  )}
                  {existingBooking.confirmed_time &&
                    ` · ${existingBooking.confirmed_time}`}
                </span>
              </div>
            )}
          </div>

          {existingBooking.refund_amount && existingBooking.refund_amount > 0 && (
            <div className="flex items-start gap-2 p-3 border border-gray-200 mb-5">
              <CheckCircle className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Refund of {formatNaira(existingBooking.refund_amount)} recorded
                {existingBooking.refund_percentage != null &&
                  ` (${existingBooking.refund_percentage}%)`}
              </p>
            </div>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 bg-[#0B0D10] text-white py-3.5 px-4 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            {canGoToDeal ? 'Continue to your deal' : 'Manage booking'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="p-5 border-b border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 mb-1">
          Take the next step
        </p>

        <h3
          className="text-2xl text-gray-900 mb-1"
          style={{ fontFamily: "'Newsreader', serif" }}
        >
          Interested in this property?
        </h3>

        <p className="text-sm text-gray-500 leading-relaxed">
          Speak with the owner or arrange a physical inspection before making a decision.
        </p>
      </div>

      <div className="p-5 space-y-5">
        <button
          onClick={handleStartChat}
          disabled={startingChat}
          className="w-full flex items-center justify-between gap-3 py-3 border-b border-gray-100 text-left group disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gray-50">
              {startingChat ? (
                <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 text-gray-600" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Have a question?
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Chat with the {property.profiles?.role || 'owner'} first.
              </p>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
        </button>

        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A7624] mb-2">
                Physical viewing
              </p>

              <h4
                className="text-xl text-gray-900 mb-1"
                style={{ fontFamily: "'Newsreader', serif" }}
              >
                Book an inspection
              </h4>

              <p className="text-sm text-gray-500 leading-relaxed">
                Arrange a visit and see the property for yourself before committing.
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-xl font-semibold text-gray-900">
                {feeLabel}
              </p>
              <p className="text-xs text-gray-400">Inspection fee</p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Agree on a convenient date and time with the owner.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Pay the disclosed inspection fee through Handova.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                Inspection fees are non-refundable once payment is completed.
              </p>
            </div>
          </div>

          <button
            onClick={() => !isSuspendedOwner && setIsModalOpen(true)}
            disabled={isSuspendedOwner}
            className="w-full flex items-center justify-center gap-2 bg-[#0B0D10] text-white py-3.5 px-4 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Calendar className="w-4 h-4" />
            {isSuspendedOwner
              ? 'Temporarily unavailable'
              : `Book inspection · ${feeLabel}`}
          </button>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2">
            Already viewed the property?
          </p>

          <h4
            className="text-lg text-gray-900 mb-1"
            style={{ fontFamily: "'Newsreader', serif" }}
          >
            Ready to proceed?
          </h4>

          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Contact the owner to discuss the terms. They can send you a deal offer to review and accept through Handova.
          </p>

          <button
            onClick={handleStartChat}
            disabled={startingChat || isSuspendedOwner}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-800 py-3.5 px-4 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <MessageCircle className="w-4 h-4" />
            Contact owner
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
