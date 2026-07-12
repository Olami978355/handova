import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { CreditCard, Loader2 } from 'lucide-react';

interface PaystackButtonProps {
  amount: number;
  email: string;
  reference: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void | Promise<void>;
  onClose: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({
  amount, email, reference, metadata, onSuccess, onClose,
  label, disabled = false, className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const config = {
    reference,
    email,
    amount: Math.round(amount * 100), // Convert to kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    metadata: { custom_fields: [], ...(metadata || {}) },
  };
  const initializePayment = usePaystackPayment(config);
  const handlePayment = () => {
    if (disabled || isProcessing) return;
    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY) {
      setConfigError('Payment is temporarily unavailable. Please contact support.');
      console.error('VITE_PAYSTACK_PUBLIC_KEY is not set.');
      return;
    }
    setConfigError(null);
    
    setIsProcessing(true);
    initializePayment({
      onSuccess: async (response: { reference: string }) => {
        try {
          await onSuccess(response.reference);
        } catch (err) {
          console.error('Payment success callback error:', err);
        } finally {
          setIsProcessing(false);
        }
      },
      onClose: () => {
        setIsProcessing(false);
        onClose();
      },
    });
  };
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(amount);
  return (
    <button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className={`flex items-center justify-center gap-2 bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${className}`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {configError && (
        <span className="block text-[11px] text-red-400 mb-1">{configError}</span>
      )}
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 flex-shrink-0" />
          <span>{label} — {formattedAmount}</span>
        </>
      )}
    </button>
  );
};
