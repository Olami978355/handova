import React from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Loader2, CreditCard } from 'lucide-react';

interface PaystackButtonProps {
  amount: number; // in Naira
  email: string;
  reference: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({
  amount,
  email,
  reference,
  onSuccess,
  onClose,
  label,
  disabled = false,
  className = '',
}) => {
  const config = {
    reference,
    email,
    amount: Math.round(amount * 100), // convert to kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayment = () => {
    if (disabled) return;
    initializePayment({
      onSuccess: (response: any) => {
        // response.reference is the transaction reference
        onSuccess(response.reference);
      },
      onClose: () => {
        onClose();
      },
    });
  };

  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || !import.meta.env.VITE_PAYSTACK_PUBLIC_KEY}
      className={`flex items-center justify-center gap-2 bg-[#1a6b3c] text-white py-4 px-8 rounded-2xl font-black text-lg hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${className}`}
    >
      <CreditCard className="w-6 h-6" />
      <span>{label} ({formattedAmount})</span>
      {!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY && (
        <span className="text-[10px] block opacity-70">Key Missing</span>
      )}
    </button>
  );
};
