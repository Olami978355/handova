import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';

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
    <div className={className} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {configError && (
        <div className="flex items-start gap-2 mb-2 p-2.5 bg-danger/8 border border-danger/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
          <span className="text-[11px] text-danger">{configError}</span>
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={disabled || isProcessing}
        className="w-full flex items-center justify-center gap-2 bg-gold text-ink py-3.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 flex-shrink-0" />
            <span>{label} <span className="tabular-nums">{formattedAmount}</span></span>
          </>
        )}
      </button>
    </div>
  );
};
