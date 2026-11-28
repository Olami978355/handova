declare module '@paystack/inline-js' {
  interface PaystackTransaction {
    reference: string;
    id?: number;
    message?: string;
  }

  interface PaystackError {
    message: string;
  }

  interface PaystackTransactionOptions {
    key: string;
    email: string;
    amount: number;
    reference?: string;
    metadata?: Record<string, any>;
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: PaystackError) => void;
  }

  class PaystackPop {
    newTransaction(options: PaystackTransactionOptions): unknown;
  }

  export default PaystackPop;
}
