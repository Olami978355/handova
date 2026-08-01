import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, Shield, Home } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';

interface DealDelegatePreviewProps {
  preview: {
    delegate_row_id: string;
    status: string;
    property_title: string;
    duration: string;
    transaction_type: string;
    principal_full_name: string;
    can_sign: boolean;
    can_pay: boolean;
    can_confirm_movein: boolean;
  };
  onResponded: () => void;
}

export const DealDelegatePreview: React.FC<DealDelegatePreviewProps> = ({ preview, onResponded }) => {
  const navigate = useNavigate();
  const [responding, setResponding] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const permissionLabels = () => {
    const perms: string[] = [];
    if (preview.can_sign) perms.push('Sign the agreement');
    if (preview.can_pay) perms.push('Pay on their behalf');
    if (preview.can_confirm_movein) perms.push('Confirm move-in');
    return perms;
  };

  const handleRespond = async (accept: boolean) => {
    setResponding(true);
    setLocalError(null);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke('respond-to-delegate-invite', {
        body: { inviteId: preview.delegate_row_id, accept },
      });
      if (error) throw error;
      if (accept) {
        onResponded();
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to respond to invite');
    } finally {
      setResponding(false);
    }
  };

  const isSale = preview.transaction_type === 'sell';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-md bg-[#0a1f11] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="w-5 h-5 text-[#1a6b3c]" />
          <h1 className="text-[16px] font-bold text-white">Delegate Invitation</h1>
        </div>

        <p className="text-[13px] text-white/60 mb-5">
          <span className="font-bold text-white">{preview.principal_full_name}</span> wants you to act on their behalf for this {isSale ? 'sale' : 'tenancy'}.
        </p>

        <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-[#f0c040]/70 flex-shrink-0" />
            <p className="text-[13px] font-semibold text-white">{preview.property_title}</p>
          </div>
          {preview.duration && (
            <p className="text-[11px] text-white/40 ml-6">Duration: {preview.duration}</p>
          )}
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">You'll be able to</p>
          <ul className="space-y-1.5">
            {permissionLabels().map(label => (
              <li key={label} className="text-[12px] text-white/70 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {localError && (
          <p className="text-[12px] text-red-400 mb-4">{localError}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleRespond(true)}
            disabled={responding}
            className="flex-1 bg-[#1a6b3c] text-white py-3 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {responding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
          </button>
          <button
            onClick={() => handleRespond(false)}
            disabled={responding}
            className="flex-1 bg-white/5 text-white/50 py-3 rounded-xl font-bold text-[13px] hover:bg-white/8 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> Decline
          </button>
        </div>
      </div>
    </div>
  );
};
