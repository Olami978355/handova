import { useState, useCallback, useRef } from 'react';

export interface ToastState {
  message: string;
  isError: boolean;
  persistent?: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, isError: boolean = false, persistent: boolean = false) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, isError, persistent });
    if (!persistent) {
      timeoutRef.current = setTimeout(() => setToast(null), isError ? 4000 : 3000);
    }
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
