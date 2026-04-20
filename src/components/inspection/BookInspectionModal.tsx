import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Clock, MessageSquare, Shield, 
  CreditCard, Loader2, AlertCircle, CheckCircle, Info 
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../context/AuthContext';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { useConversations } from '../../hooks/useConversations';
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
  onClose 
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { checkExistingBooking, createBooking, loading: bookingLoading } = useInspectionBooking();
  const { findOrCreateConversation } = useConversations();
  
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

  // BUG FIX 11: Tenant cannot book own property
  if (profile?.id === property.owner_id) return null;

  // BUG FIX 5: Block bookings on active escrow
  if (property.has_active_deal || property.status !== 'active') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Property Unavailable">
        <div className="p-6 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Deal In Progress</h3>
          <p className="text-zinc-500 mb-6">
            This property currently has an active deal in progress and is not accepting new inspection bookings.
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  // BUG FIX 12: Unique booking enforcement
  if (existingBooking) {
    let message = '';
    let canRebook = false;

    if (existingBooking.status === 'tenant_declined') {
      message = "You have already inspected this property and declined. You cannot book again.";
    } else if (existingBooking.status === 'refunded') {
      // Check if refunded due to active deal
      if (existingBooking.notes?.includes('active deal')) {
        message = "This property was taken by another tenant. You can browse similar properties.";
      } else {
        canRebook = true;
      }
    } else if (existingBooking.status === 'payment_confirmed' || existingBooking.status === 'inspection_scheduled' || existingBooking.status === 'inspection_done') {
      message = "You already have an active booking for this property.";
    }

    if (!canRebook && message) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title="Existing Booking">
          <div className="p-6 text-center">
            <Info className="w-16 h-16 text-[#1a6b3c] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Booking Status</h3>
            <p className="text-zinc-500 mb-6">{message}</p>
            <button 
              onClick={onClose}
              className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold"
            >
              Close
            </button>
          </div>
        </Modal>
      );
    }
  }

  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: toKobo(inspectionFee),
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaymentSuccess = async (reference: any) => {
    try {
      await createBooking(
        property,
        preferredDate,
        preferredTime,
        inspectionFee,
        reference.reference
      );
      setStep(4); // Success step
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking');
    }
  };

  const handlePaymentClose = () => {
    setError('Payment was cancelled. Please try again to book your inspection.');
  };

  const startChat = async () => {
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
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('Failed to start conversation. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Inspection">
      <div className="p-6">
        {checkingBooking ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
            <p className="text-zinc-500 font-bold">Checking availability...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                  <h3 className="font-bold text-zinc-900 mb-2">Before you book...</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    We recommend chatting with the owner or agent first to ask any quick questions about the property.
                  </p>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={startChat}
                    disabled={startingChat}
                    className="w-full flex items-center justify-center gap-2 bg-white text-[#1a6b3c] border-2 border-[#1a6b3c] py-4 rounded-2xl font-bold hover:bg-[#1a6b3c]/5 transition-colors disabled:opacity-50"
                  >
                    {startingChat ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <MessageSquare size={20} />
                    )}
                    Chat with Owner First
                  </button>
                  <button 
                    onClick={() => setStep(2)}
                    className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold hover:bg-[#14522e] transition-colors shadow-lg shadow-[#1a6b3c]/20"
                  >
                    Continue to Booking
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-[#1a6b3c]" />
                      Preferred Date
                    </label>
                    <input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2 flex items-center gap-2">
                      <Clock size={16} className="text-[#1a6b3c]" />
                      Preferred Time
                    </label>
                    <select 
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                    >
                      <option value="">Select a time</option>
                      <option value="Morning (9AM - 12PM)">Morning (9AM - 12PM)</option>
                      <option value="Afternoon (12PM - 3PM)">Afternoon (12PM - 3PM)</option>
                      <option value="Evening (3PM - 6PM)">Evening (3PM - 6PM)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    disabled={!preferredDate || !preferredTime}
                    className="flex-1 bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold hover:bg-[#14522e] transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-[#1a6b3c]/5 p-6 rounded-3xl border border-[#1a6b3c]/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-zinc-500 font-medium">Inspection Fee</span>
                    <span className="text-2xl font-black text-[#1a6b3c]">{formatFee(inspectionFee)}</span>
                  </div>
                  <div className="space-y-3 text-xs text-zinc-500 leading-relaxed">
                    <div className="flex gap-2">
                      <Shield size={14} className="text-[#1a6b3c] flex-shrink-0" />
                      <p>70% refundable if you decline after inspection.</p>
                    </div>
                    <div className="flex gap-2">
                      <Shield size={14} className="text-[#1a6b3c] flex-shrink-0" />
                      <p>100% refundable if the property is taken by someone else.</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-50"
                  >
                    Back
                  </button>
                  <PaystackButton 
                    amount={inspectionFee}
                    email={user?.email || ''}
                    reference={`INSP_${property.id.slice(0, 8)}_${Date.now()}`}
                    label="Pay"
                    className="flex-1"
                    onSuccess={async (reference) => {
                      setCheckingBooking(true);
                      try {
                        // 1. Create the booking record first
                        await createBooking(
                          property,
                          preferredDate,
                          preferredTime,
                          inspectionFee,
                          reference
                        );

                        // 2. Call the edge function to process the payment
                        const { error } = await supabase.functions.invoke('process-inspection-payment', {
                          body: { 
                            event: 'charge.success',
                            data: {
                              reference,
                              metadata: {
                                property_id: property.id,
                                tenant_id: user?.id,
                                type: 'inspection_payment'
                              }
                            }
                          }
                        });
                        
                        if (error) throw error;
                        setStep(4); // Success step
                      } catch (err: any) {
                        console.error('Inspection payment processing error:', err);
                        setError(err.message || 'Payment successful but booking failed. Please contact support.');
                      } finally {
                        setCheckingBooking(false);
                      }
                    }}
                    onClose={() => {
                      setError('Payment was cancelled. Please try again to book your inspection.');
                    }}
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-[#1a6b3c] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#1a6b3c]/20">
                  <CheckCircle size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-2">Booking Confirmed!</h3>
                <p className="text-zinc-500 mb-8 max-w-xs mx-auto">
                  Your inspection fee has been received. The owner will confirm the date and time shortly.
                </p>
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/dashboard');
                  }}
                  className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold hover:bg-[#14522e] transition-colors"
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

const Modal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode 
}> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-lg h-fit bg-white rounded-[40px] z-[110] overflow-hidden shadow-2xl"
          >
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
