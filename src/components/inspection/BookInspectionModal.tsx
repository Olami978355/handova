import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, MessageSquare, Shield,
  Loader2, AlertCircle, CheckCircle, Info,
  MapPin, User, CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { Property, InspectionBooking } from '../../types';
import { calculateInspectionFee, formatFee } from '../../utils/inspectionFee';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PaystackButton } from '../payment/PaystackButton';

interface BookInspectionModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

const formatNaira = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(n);

const StepDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-1.5 mb-5">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all ${
          i + 1 === current
            ? 'w-5 h-1.5 bg-gold'
            : i + 1 < current
            ? 'w-1.5 h-1.5 bg-gold'
            : 'w-1.5 h-1.5 bg-white/15'
        }`}
      />
    ))}
  </div>
);

export const BookInspectionModal: React.FC<BookInspectionModalProps> = ({
  property, isOpen, onClose,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // ✅ Use createAndConfirmBooking instead of createBooking
  const { checkExistingBooking, createAndConfirmBooking } = useInspectionBooking();

  const [step, setStep] = useState(1);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [existingBooking, setExistingBooking] = useState<InspectionBooking | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  const paymentProcessedRef = useRef(false);

  const inspectionFee = calculateInspectionFee(
    property.price,
    property.price_period || null,
    property.listing_type,
    property.transaction_type
  );

  useEffect(() => {
    if (isOpen && user) {
      setCheckingBooking(true);
      paymentProcessedRef.current = false;
      checkExistingBooking(property.id).then(booking => {
        setExistingBooking(booking);
        setCheckingBooking(false);
      });
    }
  }, [isOpen, user, property.id]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setPreferredDate('');
        setPreferredTime('');
        setError(null);
        setProcessingPayment(false);
        paymentProcessedRef.current = false;
      }, 300);
    }
  }, [isOpen]);

  if (profile?.id === property.owner_id) return null;

  if (property.has_active_deal || property.status !== 'active') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Not Available">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-gold" />
          </div>
          <h3 className="text-[18px] font-bold text-white mb-2">
            {property.has_active_deal ? 'Deal In Progress' : 'No Longer Available'}
          </h3>
          <p className="text-[13px] text-white/45 mb-6 max-w-xs mx-auto leading-relaxed">
            {property.has_active_deal
              ? 'This property currently has an active escrow deal.'
              : 'This property is no longer accepting bookings.'
            }
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gold text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors"
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
        message = 'This property was taken and your fee was fully refunded.';
        actionLabel = 'Browse Listings';
        actionFn = () => { onClose(); navigate('/listings'); };
      } else {
        canRebook = true;
      }
    } else if (
      ['payment_confirmed', 'inspection_scheduled'].includes(existingBooking.status)
    ) {
      message = 'You already have an active inspection booking. Check your dashboard.';
      actionLabel = 'View in Dashboard';
      actionFn = () => { onClose(); navigate('/dashboard'); };
    } else if (existingBooking.status === 'inspection_done') {
      message = 'You have already completed your inspection. Go to your dashboard to decide.';
      actionLabel = 'Go to Dashboard';
      actionFn = () => { onClose(); navigate('/dashboard'); };
    } else if (
      existingBooking.status === 'tenant_interested' ||
      existingBooking.status === 'escrow_started'
    ) {
      message = 'A deal is being prepared. Check your dashboard.';
      actionLabel = 'Go to Dashboard';
      actionFn = () => { onClose(); navigate('/dashboard'); };
    }

    if (!canRebook && message) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title="Booking Status">
          <div className="p-6 text-center">
            <Info className="w-14 h-14 text-gold mx-auto mb-4" />
            <p className="text-[13px] text-white/50 mb-6 max-w-xs mx-auto leading-relaxed">
              {message}
            </p>
            <button
              onClick={actionFn}
              className="w-full bg-gold text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        </Modal>
      );
    }
  }

  const startChat = async () => {
    if (!user) { navigate('/login'); return; }
    setStartingChat(true);
    try {
      // Navigate to messages with property context
      // Conversation created on first message send
      onClose();
      navigate(`/messages?property=${property.id}&recipient=${property.owner_id}`);
    } catch {
      setError('Could not open chat. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  const handlePaymentSuccess = async (reference: string) => {
    if (paymentProcessedRef.current) return;
    paymentProcessedRef.current = true;
    setProcessingPayment(true);
    setError(null);

    try {
      // ✅ createAndConfirmBooking creates the record AND
      // immediately sets status to payment_confirmed
      // It also sends notifications to both landlord and tenant
      await createAndConfirmBooking(
        property,
        preferredDate,
        preferredTime,
        inspectionFee,
        reference
      );

      // Non-blocking edge function call — does not affect booking
      supabase.functions.invoke('process-inspection-payment', {
        body: {
          event: 'charge.success',
          data: {
            reference,
            metadata: {
              property_id: property.id,
              tenant_id: user?.id,
              type: 'inspection_payment',
            },
          },
        },
      }).catch(err =>
        console.warn('Edge function notification failed (non-critical):', err)
      );

      setStep(4);
    } catch (err: unknown) {
      paymentProcessedRef.current = false;
      const msg = err instanceof Error ? err.message : 'Booking failed after payment.';
      setError(
        `${msg} Please contact support with reference: ${reference}`
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const totalSteps = 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={step < 4 ? onClose : undefined}
      title={
        step === 1 ? 'Book an Inspection' :
        step === 2 ? 'Choose a Date & Time' :
        step === 3 ? 'Confirm & Pay' :
        'Booking Confirmed!'
      }
    >
      <div className="p-5">
        {checkingBooking ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-white/40">Checking your bookings...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* Step 1 — Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <StepDots current={1} total={totalSteps} />

                <div className="flex items-center gap-3 p-3 bg-white/4 border border-white/6 rounded-xl">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    {property.images?.[0] ? (
                      <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{property.title}</p>
                    <p className="text-[11px] text-white/40">{property.lga}, {property.state}</p>
                  </div>
                </div>

                <div className="bg-white/4 border border-white/6 p-4 rounded-xl space-y-2.5">
                  <p className="text-[12px] font-bold text-white">What is an inspection fee?</p>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    A small fee that confirms your serious interest and secures your slot.
                    It protects both you and the landlord's time.
                  </p>
                  <div className="pt-1 space-y-1.5">
                    {[
                      'Your slot is guaranteed once paid',
                      'Full refund if you cancel before the inspection date',
                      'Fee auto-releases on the inspection date, non-refundable after',
                      'Disputes reviewed by a moderator if something goes wrong',
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-[#4ade80] flex-shrink-0" />
                        <span className="text-[11px] text-white/45">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3 bg-gold/10 border border-gold/20 rounded-xl">
                  <span className="text-[13px] text-white/60">Inspection fee</span>
                  <span className="text-[18px] font-black text-gold">
                    {formatFee(inspectionFee)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={startChat}
                    disabled={startingChat}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-white/10 text-white/50 rounded-xl text-[13px] font-semibold hover:border-gold/40 hover:text-white hover:bg-gold/5 transition-all disabled:opacity-50"
                  >
                    {startingChat
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <MessageSquare className="w-4 h-4" />
                    }
                    Chat with {property.profiles?.role === 'agent' ? 'Agent' : 'Landlord'} First
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-gold text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
                  >
                    Book Inspection — {formatFee(inspectionFee)}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Date & Time */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <StepDots current={2} total={totalSteps} />

                <div className="space-y-1 mb-1">
                  <h3 className="text-[15px] font-bold text-white">
                    When would you like to visit?
                  </h3>
                  <p className="text-[12px] text-white/35">
                    The {property.profiles?.role === 'agent' ? 'agent' : 'landlord'} will
                    confirm or suggest an alternative time.
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                    <Calendar className="w-3.5 h-3.5 text-gold" />
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white text-[13px] outline-none focus:border-gold/60 transition-colors"
                  />
                  <p className="text-[10px] text-white/25 mt-1 ml-1">
                    Must be at least 1 day from today
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                    <Clock className="w-3.5 h-3.5 text-gold" />
                    Preferred Time
                  </label>
                  <select
                    value={preferredTime}
                    onChange={e => setPreferredTime(e.target.value)}
                    className="w-full px-4 py-3 bg-ink border border-white/8 rounded-xl text-white text-[13px] outline-none focus:border-gold/60 transition-colors"
                  >
                    <option value="" className="bg-ink">Select a time window</option>
                    <option value="Morning (9AM - 12PM)" className="bg-ink">
                      Morning (9AM – 12PM)
                    </option>
                    <option value="Afternoon (12PM - 3PM)" className="bg-ink">
                      Afternoon (12PM – 3PM)
                    </option>
                    <option value="Late Afternoon (3PM - 6PM)" className="bg-ink">
                      Late Afternoon (3PM – 6PM)
                    </option>
                  </select>
                </div>

                <div className="flex items-start gap-2 p-3 bg-gold/5 border border-gold/10 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-gold/50 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/35 leading-relaxed">
                    The landlord may confirm a different time. You'll be notified immediately.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!preferredDate || !preferredTime}
                    className="flex-1 bg-gold text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors disabled:opacity-40"
                  >
                    Review & Pay
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Confirm & Pay */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <StepDots current={3} total={totalSteps} />

                <div className="space-y-1 mb-1">
                  <h3 className="text-[15px] font-bold text-white">Confirm your booking</h3>
                  <p className="text-[12px] text-white/35">
                    Review the details below before paying.
                  </p>
                </div>

                <div className="bg-white/4 border border-white/6 rounded-xl divide-y divide-white/5">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[12px] text-white/40 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Property
                    </span>
                    <span className="text-[12px] font-semibold text-white truncate ml-4 max-w-[160px]">
                      {property.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[12px] text-white/40 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Date
                    </span>
                    <span className="text-[12px] font-semibold text-white">
                      {new Date(preferredDate).toLocaleDateString('en-NG', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[12px] text-white/40 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </span>
                    <span className="text-[12px] font-semibold text-white">{preferredTime}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[12px] text-white/40 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Listed by
                    </span>
                    <span className="text-[12px] font-semibold text-white capitalize">
                      {property.profiles?.role || 'Owner'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-white/3">
                    <span className="text-[13px] font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-gold" /> You pay
                    </span>
                    <span className="text-[18px] font-black text-gold">
                      {formatFee(inspectionFee)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-gold/8 border border-gold/15 rounded-xl">
                  <Shield className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    <span className="text-white/60 font-semibold">Your money is protected. </span>
                    Full refund if you cancel before the inspection date. Once that date passes, the fee auto-releases and can only be refunded via a dispute review.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-red-400 leading-relaxed">{error}</p>
                  </div>
                )}

                {processingPayment ? (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    <p className="text-[13px] text-white/50">Confirming your booking...</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <PaystackButton
                      amount={inspectionFee}
                      email={user?.email || ''}
                      reference={`INSP_${property.id.slice(0, 8)}_${Date.now()}`}
                      label={`Pay ${formatFee(inspectionFee)}`}
                      className="flex-[2]"
                      onSuccess={reference => handlePaymentSuccess(reference)}
                      onClose={() =>
                        setError(
                          'Payment was cancelled. Your inspection slot has not been booked yet.'
                        )
                      }
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4 — Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 12 }}
                  className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-[20px] font-bold text-white mb-2">Booking Confirmed!</h3>
                <p className="text-[13px] text-white/45 mb-2 max-w-xs mx-auto leading-relaxed">
                  Your inspection fee has been received and your slot is secured.
                </p>
                <p className="text-[12px] text-white/30 mb-8 max-w-xs mx-auto leading-relaxed">
                  The {property.profiles?.role === 'agent' ? 'agent' : 'landlord'} will
                  confirm your date and time shortly. You will receive a notification.
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={() => { onClose(); navigate('/dashboard'); }}
                    className="w-full bg-gold text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
                  >
                    View in Dashboard
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-3 text-white/35 text-[13px] hover:text-white transition-colors"
                  >
                    Stay on this page
                  </button>
                </div>
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
        />
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.97 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-md h-fit bg-ink border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">{title}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
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