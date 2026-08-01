import { supabase, requireValidSession } from './supabase';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export const generateReference = () => {
  return `REASY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const formatAmountToKobo = (naira: number): number => {
  return Math.round(naira * 100);
};

export const verifyPayment = async (reference: string) => {
  try {
    if (!(await requireValidSession())) return { success: false, error: 'Session expired' };
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { reference },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

export const paystackConfig = (email: string, amount: number, onSuccess: (ref: any) => void, onClose: () => void) => ({
  reference: generateReference(),
  email,
  amount: formatAmountToKobo(amount),
  publicKey: PAYSTACK_PUBLIC_KEY,
  onSuccess,
  onClose,
});
