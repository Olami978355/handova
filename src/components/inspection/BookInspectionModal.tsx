import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  MapPin,
  User,
  CreditCard,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { Property, InspectionBooking } from '../../types';
import { getInspectionFee, formatFee } from '../../utils/inspectionFee';
import { useNavigate } from 'react-router-dom';
import { PaystackButton } from '../payment/PaystackButton';

interface BookInspectionModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

const StepDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2 mb-6">
    {Array.from({ length: total }).map((_, index) => (
      <div
        key={index}
        className={`h-1 transition-all duration-300 ${
          index + 1 === current
            ? 'w-8 bg-[#B18A28]'
            : index + 1 < current
              ? 'w-5 bg-[#B18A28]/50'
              : 'w-5 bg-gray-200'
        }`}
      />
    ))}
    <span className="ml-auto text-[11px] text-gray-400">
      Step {current} of {total}
    </span>
  </div>
);

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const BookInspectionModal: React.FC<BookInspectionModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const {
    checkExistingBooking,
    createAndConfirmBooking,
    createFreeBooking,
  } = useInspectionBooking();

  const [step, setStep] = useState(1);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [existingBooking, setExistingBooking] =
    useState<InspectionBooking | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [nonRefundableAcknowledged, setNonRefundableAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  const paymentProcessedRef = useRef(false);

  const inspectionFee = getInspectionFee(property);
  const feeLabel = inspectionFee > 0 ? formatFee(inspectionFee) : 'Free';
  const contactRole =
    property.profiles?.role === 'agent' ? 'agent' : 'landlord';

  useEffect(() => {
    let active = true;

    if (isOpen && user) {
      setCheckingBooking(true);
      paymentProcessedRef.current = false;

      checkExistingBooking(property.id)
        .then((booking) => {
          if (active) {
            setExistingBooking(booking);
            setCheckingBooking(false);
          }
        })
        .catch(() => {
          if (active) {
            setCheckingBooking(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, user, property.id]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPreferredDate('');
      setPreferredTime('');
      setError(null);
      setProcessingPayment(false);
      setNonRefundableAcknowledged(false);
      paymentProcessedRef.current = false;
    }
  }, [isOpen]);

  if (profile?.id === property.owner_id) return null;

  const handleClose = () => {
    if (processingPayment) return;
    onClose();
  };

  if (property.has_active_deal || property.status !== 'active') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Inspection unavailable">
        <div className="p-7 text-center">
          <div className="w-14 h-14 bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-6 h-6 text-gray-500" />
          </div>
          <h3
            className="text-2xl text-gray-900 mb-2"
            style={{ fontFamily: "'Newsreader', serif" }}
          >
            {property.has_active_deal
              ? 'Deal in progress'
              : 'Property unavailable'}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            {property.has_active_deal
              ? 'A transaction is already in progress for this property. New inspection bookings are paused.'
              : 'This property is no longer accepting inspection bookings.'}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#0B0D10] text-white py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (!checkingBooking && existingBooking) {
    let message = '';
    let actionLabel = 'Close';
    let actionFn = onClose;
    let canRebook = false;

    if (existingBooking.status === 'tenant_declined') {
      message = 'You already inspected this property and chose not to proceed.';
    } else if (existingBooking.status === 'refunded') {
      if (existingBooking.notes?.includes('active deal')) {
        message = 'This property was taken and your fee was refunded.';
        actionLabel = 'Browse listings';
        actionFn = () => {
          onClose();
          navigate('/listings');
        };
      } else {
        canRebook = true;
      }
    } else if (
      ['payment_confirmed', 'inspection_scheduled'].includes(existingBooking.status)
    ) {
      message = 'You already have an active inspection booking.';
      actionLabel = 'View booking';
      actionFn = () => {
        onClose();
        navigate('/dashboard');
      };
    } else if (existingBooking.status === 'inspection_done') {
      message = 'Your inspection has been completed. Visit your dashboard to decide what to do next.';
      actionLabel = 'Go to dashboard';
      actionFn = () => {
        onClose();
        navigate('/dashboard');
      };
    } else if (
      ['tenant_interested', 'escrow_started'].includes(existingBooking.status)
    ) {
      message = 'A deal is already being prepared for this property.';
      actionLabel = 'Go to dashboard';
      actionFn = () => {
        onClose();
        navigate('/dashboard');
      };
    }

    if (!canRebook && message) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title="Your booking">
          <div className="p-7 text-center">
            <div className="w-14 h-14 bg-[#F7F5EF] flex items-center justify-center mx-auto mb-5">
              <Info className="w-6 h-6 text-[#9A7624]" />
            </div>
            <h3
              className="text-2xl text-gray-900 mb-2"
              style={{ fontFamily: "'Newsreader', serif" }}
            >
              You already have a booking
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              {message}
            </p>
            <button
              onClick={actionFn}
              className="w-full bg-[#0B0D10] text-white py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              {actionLabel}
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          </div>
        </Modal>
      );
    }
  }

  const startChat = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setStartingChat(true);
    setError(null);

    try {
      onClose();
      navigate(
        `/messages?property=${property.id}&recipient=${property.agent_id || property.owner_id}`
      );
    } catch {
      setError('Could not open chat. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  const handleFreeBooking = async () => {
    if (paymentProcessedRef.current) return;

    paymentProcessedRef.current = true;
    setProcessingPayment(true);
    setError(null);

    try {
      await createFreeBooking(property, preferredDate, preferredTime);
      setStep(4);
    } catch (err: unknown) {
      paymentProcessedRef.current = false;
      setError(
        err instanceof Error
          ? err.message
          : 'Booking failed. Please try again.'
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (reference: string) => {
    if (paymentProcessedRef.current) return;

    paymentProcessedRef.current = true;
    setProcessingPayment(true);
    setError(null);

    try {
      await createAndConfirmBooking(
        property,
        preferredDate,
        preferredTime,
        inspectionFee,
        reference
      );


      setStep(4);
    } catch (err: unknown) {
      paymentProcessedRef.current = false;

      const message =
        err instanceof Error ? err.message : 'Booking failed after payment.';

      setError(
        `${message} Please contact support with payment reference: ${reference}`
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const totalSteps = 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={step < 4 ? handleClose : undefined}
      title={
        step === 1
          ? 'Book an inspection'
          : step === 2
            ? 'Choose a date'
            : step === 3
              ? 'Review booking'
              : 'Booking confirmed'
      }
    >
      <div className="max-h-[78vh] overflow-y-auto">
        {checkingBooking ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-[#B18A28] animate-spin" />
            <p className="text-sm text-gray-500">Checking your bookings...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="p-5 sm:p-6"
              >
                <StepDots current={1} total={totalSteps} />

                <div className="flex gap-3 items-center pb-5 border-b border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 flex-shrink-0 overflow-hidden">
                    {property.images?.[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      Property
                    </p>
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {property.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {property.lga}, {property.state}
                    </p>
                  </div>
                </div>

                <div className="py-5">
                  <p className="text-xs uppercase tracking-[0.15em] font-semibold text-[#9A7624] mb-2">
                    Before you book
                  </p>
                  <h3
                    className="text-2xl text-gray-900 mb-2"
                    style={{ fontFamily: "'Newsreader', serif" }}
                  >
                    See it for yourself.
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Choose a convenient time to visit the property. The {contactRole}
                    will coordinate with you to confirm the arrangements.
                  </p>
                </div>

                <div className="bg-[#F8F7F3] p-4 mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Inspection fee</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {feeLabel}
                      </p>
                    </div>
                    <Calendar className="w-5 h-5 text-[#9A7624]" />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      Select your preferred date and time.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      The {contactRole} will coordinate the visit with you.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">
                      The inspection fee is non-refundable once payment is completed.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={startChat}
                    disabled={startingChat}
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {startingChat ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    Speak with the {contactRole} first
                  </button>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-[#0B0D10] text-white py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Choose inspection date
                    <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="p-5 sm:p-6"
              >
                <StepDots current={2} total={totalSteps} />

                <div className="mb-6">
                  <p className="text-xs uppercase tracking-[0.15em] font-semibold text-[#9A7624] mb-2">
                    Your preferred visit
                  </p>
                  <h3
                    className="text-2xl text-gray-900 mb-2"
                    style={{ fontFamily: "'Newsreader', serif" }}
                  >
                    When works for you?
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Choose your preferred date and time. The {contactRole} will
                    confirm the arrangements or suggest another time.
                  </p>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Preferred date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      min={getTomorrow()}
                      value={preferredDate}
                      onChange={(event) => setPreferredDate(event.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#B18A28] transition-colors"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Select a date at least one day from today.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Preferred time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={preferredTime}
                      onChange={(event) => setPreferredTime(event.target.value)}
                      className="w-full appearance-none pl-11 pr-4 py-3.5 bg-white border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#B18A28] transition-colors"
                    >
                      <option value="">Choose a time window</option>
                      <option value="Morning (9AM - 12PM)">
                        Morning · 9 AM – 12 PM
                      </option>
                      <option value="Afternoon (12PM - 3PM)">
                        Afternoon · 12 PM – 3 PM
                      </option>
                      <option value="Late Afternoon (3PM - 6PM)">
                        Late afternoon · 3 PM – 6 PM
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#F8F7F3] p-4 mb-6">
                  <Info className="w-4 h-4 text-[#9A7624] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">
                    This is your preferred time, not a confirmed appointment.
                    Wait for the {contactRole} to confirm the arrangements.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 border border-gray-200 text-gray-600 py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!preferredDate || !preferredTime}
                    className="flex-[2] bg-[#0B0D10] text-white py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Review booking
                    <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="p-5 sm:p-6"
              >
                <StepDots current={3} total={totalSteps} />

                <div className="mb-6">
                  <p className="text-xs uppercase tracking-[0.15em] font-semibold text-[#9A7624] mb-2">
                    Final review
                  </p>
                  <h3
                    className="text-2xl text-gray-900 mb-2"
                    style={{ fontFamily: "'Newsreader', serif" }}
                  >
                    Check your details.
                  </h3>
                  <p className="text-sm text-gray-500">
                    Make sure everything is correct before proceeding.
                  </p>
                </div>

                <div className="border border-gray-200 divide-y divide-gray-100 mb-5">
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Property</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {property.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {property.lga}, {property.state}
                    </p>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="p-4 border-r border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Preferred date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(`${preferredDate}T12:00:00`).toLocaleDateString(
                          'en-NG',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400 mb-1">Preferred time</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {preferredTime}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Listed by</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 capitalize">
                      {contactRole}
                    </span>
                  </div>

                  <div className="p-4 flex items-center justify-between bg-[#F8F7F3]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#9A7624]" />
                      <span className="text-sm font-semibold text-gray-800">
                        Inspection fee
                      </span>
                    </div>
                    <span className="text-xl font-semibold text-gray-900">
                      {feeLabel}
                    </span>
                  </div>
                </div>

                <div className="border border-amber-200 bg-amber-50 p-4 mb-5">
  <div className="flex items-start gap-3 mb-3">
    <ShieldCheck className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs font-semibold text-gray-900 mb-1">
        Inspection fee is strictly non-refundable
      </p>
      <p className="text-xs text-gray-700 leading-relaxed">
        Once paid, the inspection fee will not be refunded under any circumstances,
        including cancellation, a missed appointment, the agent or landlord
        failing to attend, or the property being unavailable. Handova does not
        refund inspection fees. Confirm the inspection date, time, property
        details and availability with the {contactRole} before paying. Your
        preferred date and time still require confirmation.
      </p>
    </div>
  </div>
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={nonRefundableAcknowledged}
      onChange={(event) => setNonRefundableAcknowledged(event.target.checked)}
      className="mt-0.5 h-4 w-4 accent-[#9A7624] flex-shrink-0"
    />
    <span className="text-xs font-semibold text-gray-800 leading-relaxed">
      I understand that the inspection fee is non-refundable once payment is completed.
    </span>
  </label>
</div>

                {error && (
                  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 mb-5">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-relaxed">{error}</p>
                  </div>
                )}

                {processingPayment ? (
                  <div className="flex items-center justify-center gap-3 py-5">
                    <Loader2 className="w-5 h-5 text-[#B18A28] animate-spin" />
                    <p className="text-sm text-gray-500">
                      Confirming your booking...
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 border border-gray-200 text-gray-600 py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>

                    {inspectionFee > 0 ? (
                      <PaystackButton
                        amount={inspectionFee}
                        email={user?.email || ''}
                        reference={`INSP_${property.id.slice(0, 8)}_${Date.now()}`}
                        label={`Pay ${feeLabel}`}
                        className="flex-[2]"
                        disabled={!nonRefundableAcknowledged}
                        onSuccess={(reference) => handlePaymentSuccess(reference)}
                        onClose={() =>
                          setError(
                            'Payment was cancelled. Your inspection booking has not been completed.'
                          )
                        }
                      />
                    ) : (
                      <button
                        onClick={handleFreeBooking}
                        className="flex-[2] bg-[#0B0D10] text-white py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
                      >
                        Confirm free booking
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 sm:p-8 text-center"
              >
                <div className="w-16 h-16 bg-[#F2F5EF] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-green-700" />
                </div>

                <p className="text-xs uppercase tracking-[0.16em] font-semibold text-green-700 mb-2">
                  Booking submitted
                </p>

                <h3
                  className="text-3xl text-gray-900 mb-3"
                  style={{ fontFamily: "'Newsreader', serif" }}
                >
                  You're one step closer.
                </h3>

                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto mb-3">
                  {inspectionFee > 0
                    ? 'Your inspection payment has been received and your booking has been recorded.'
                    : 'Your free inspection booking has been recorded.'}
                </p>

                <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto mb-7">
                  The {contactRole} will coordinate with you to confirm the
                  inspection date and time. Check your dashboard for updates.
                </p>

                <button
                  onClick={() => {
                    onClose();
                    navigate('/dashboard');
                  }}
                  className="w-full bg-[#0B0D10] text-white py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  View booking in dashboard
                  <ArrowRight className="w-4 h-4 inline ml-2" />
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 mt-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Return to property
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </Modal>
  );
};

const Modal: React.FC<{
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/55 z-[100]"
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-3 bottom-3 sm:inset-0 sm:m-auto w-auto sm:w-full sm:max-w-xl h-fit max-h-[90vh] bg-white z-[110] overflow-hidden shadow-2xl"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7624] mb-0.5">
                HANDOVA · INSPECTIONS
              </p>
              <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Close inspection booking"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
