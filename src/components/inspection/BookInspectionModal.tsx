import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, MessageSquare, Shield,
  Loader2, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { useConversationsContext } from '../../context/ConversationsContext';
import { Property, InspectionBooking } from '../../types';
import { calculateInspectionFee, toKobo, formatFee } from '../../utils/inspectionFee';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PaystackButton } from '../payment/PaystackButton';

interface BookInspectionModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const BookInspectionModal: React.FC<BookInspectionModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { checkExistingBooking, createBooking } = useInspectionBooking();
  const { findOrCreateConversation } = useConversationsContext();

  const [step, setStep] = useState(1);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [existingBooking, setExistingBooking] = useState<InspectionBooking | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  const inspectionFee = calculateInspectionFee(
    property.price,
    property.price_period || null,
    property.listing_type,
    property.transaction_type
  );

  useEffect(() => {
    if (isOpen && user) {
      setCheckingBooking(true);
      checkExistingBooking(property.id).then(booking => {
        setExistingBooking(booking);
        setCheckingBooking(false);
      });
    }
  }, [isOpen, user, property.id]);

  if (profile?.id === property.owner_id) return null;

  if (property.has_active_deal || property.status !== 'active') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Property Unavailable">
        <div className="p-6 text-center">
          <AlertCircle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h3 className="text-[18px] font-bold text-white mb-2">Deal In Progress</h3>
          <p className="text-[13px] text-white/45 mb-6 max-w-xs mx-auto">
            This property has an active deal and is not accepting new inspection bookings.
          </p>
          <button onClick={onClose} className="w-full bg-[#1a6b3c] text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors">
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (existingBooking) {
    let message = '';
    let canRebook = false;

    if (existingBooking.status === 'tenant_declined') {
      message = 'You have already inspected this property and declined. You cannot book again.';
    } else if (existingBooking.status === 'refunded') {
      if (existingBooking.notes?.includes('active deal')) {
        message = 'This property was taken by another tenant. Browse similar properties.';
      } else {
        canRebook = true;
      }
    } else if (['payment_confirmed', 'inspection_scheduled', 'inspection_done'].includes(existingBooking.status)) {
      message = 'You already have an active booking for this property.';
    }

    if (!canRebook && message) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title="Booking Status">
          <div className="p-6 text-center">
            <Info className="w-14 h-14 text-[#f0c040] mx-auto mb-4" />
            <h3 className="text-[18px] font-bold text-white mb-2">Existing Booking</h3>
            <p className="text-[13px] text-white/45 mb-6 max-w-xs mx-auto">{message}</p>
            <button onClick={onClose} className="w-full bg-[#1a6b3c] text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors">
              Close
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
      const conversationId = await findOrCreateConversation(
        property.id,
        user.id,
        property.owner_id
      );
      navigate(`/messages?id=${conversationId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('Failed to start conversation. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Inspection">
      <div className="p-5">
        {checkingBooking ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-white/40">Checking availability...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* Step 1 — Chat first or continue */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-white/4 border border-white/6 p-4 rounded-xl">
                  <h3 className="text-[13px] font-bold text-white mb-1.5">Before you book...</h3>
                  <p className="text-[12px] text-white/45 leading-relaxed">
                    We recommend chatting with the owner or agent first to ask any quick questions about the property.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <button
                    onClick={startChat}
                    disabled={startingChat}
                    className="w-full flex items-center justify-center gap-2 bg-transparent text-[#1a6b3c] border-2 border-[#1a6b3c] py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#1a6b3c]/10 transition-colors disabled:opacity-50"
                  >
                    {startingChat
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <MessageSquare className="w-5 h-5" />
                    }
                    Chat with Owner First
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
                  >
                    Continue to Booking
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Pick date & time */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="flex items-center gap-1.5 text-[12px] font-bold text-white/60 uppercase tracking-wider mb-2">
                    <Calendar className="w-3.5 h-3.5 text-[#1a6b3c]" />
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white text-[13px] outline-none focus:border-[#1a6b3c]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[12px] font-bold text-white/60 uppercase tracking-wider mb-2">
                    <Clock className="w-3.5 h-3.5 text-[#1a6b3c]" />
                    Preferred Time
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-white text-[13px] outline-none focus:border-[#1a6b3c]/60 transition-colors"
                  >
                    <option value="" className="bg-[#0a1f11]">Select a time</option>
                    <option value="Morning (9AM - 12PM)" className="bg-[#0a1f11]">Morning (9AM – 12PM)</option>
                    <option value="Afternoon (12PM - 3PM)" className="bg-[#0a1f11]">Afternoon (12PM – 3PM)</option>
                    <option value="Evening (3PM - 6PM)" className="bg-[#0a1f11]">Evening (3PM – 6PM)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!preferredDate || !preferredTime}
                    className="flex-1 bg-[#1a6b3c] text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Pay */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-[#1a6b3c]/10 border border-[#1a6b3c]/20 p-5 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[13px] text-white/50 font-medium">Inspection Fee</span>
                    <span className="text-[24px] font-black text-[#f0c040]">{formatFee(inspectionFee)}</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      '70% refundable if you decline after inspection',
                      '100% refundable if property is taken by someone else',
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Shield className="w-3.5 h-3.5 text-[#1a6b3c] flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-white/40">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-[12px] text-red-400">{error}</p>
                  </div>
                )}

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
                    label="Pay Now"
                    className="flex-1"
                    onSuccess={async (reference) => {
                      setCheckingBooking(true);
                      try {
                        await createBooking(
                          property,
                          preferredDate,
                          preferredTime,
                          inspectionFee,
                          reference
                        );
                        const { error: fnError } = await supabase.functions.invoke('process-inspection-payment', {
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
                        });
                        if (fnError) throw fnError;
                        setStep(4);
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Payment successful but booking failed. Please contact support.';
                        setError(msg);
                      } finally {
                        setCheckingBooking(false);
                      }
                    }}
                    onClose={() => setError('Payment was cancelled. Please try again.')}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4 — Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-[#1a6b3c] rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-[20px] font-bold text-white mb-2">Booking Confirmed!</h3>
                <p className="text-[13px] text-white/45 mb-8 max-w-xs mx-auto">
                  Your inspection fee has been received. The owner will confirm the date and time shortly.
                </p>
                <button
                  onClick={() => { onClose(); navigate('/dashboard'); }}
                  className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
                >
                  Go to Dashboard
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </Modal>
  );
};

// ── Modal shell ────────────────────────────────────────────────────
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
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
          className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);