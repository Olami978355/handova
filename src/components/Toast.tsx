import React from 'react';
import { X } from 'lucide-react';
import type { ToastState } from '../hooks/useToast';

interface ToastProps {
  toast: ToastState | null;
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl border shadow-lg flex items-center gap-3 max-w-[90vw]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        backgroundColor: toast.isError ? 'rgba(229,72,77,0.12)' : 'rgba(212,175,55,0.12)',
        borderColor: toast.isError ? 'rgba(229,72,77,0.3)' : 'rgba(212,175,55,0.3)',
      }}
    >
      <p className={`text-[13px] font-semibold ${toast.isError ? 'text-danger' : 'text-gold'}`}>
        {toast.message}
      </p>
      {toast.persistent && onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 ${toast.isError ? 'text-danger/60 hover:text-danger' : 'text-gold/60 hover:text-gold'} transition-colors`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
