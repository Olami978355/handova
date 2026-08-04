import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, Shield, Home, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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

const parseFunctionError = async (error: unknown, fallback: string): Promise<string> => {
  const err = error as { context?: { json?: () => Promise<{ error?: string }> }; message?: string };
  try {
    if (err?.context?.json) {
      const body = await err.context.json();
      if (body?.error) return body.error;
    }
  } catch {
    // fall through to generic message below
  }
  return err?.message || fallback;
};

export const DealDelegatePreview: React.FC<DealDelegatePreviewProps> = ({ preview, onResponded }) => {
  const navigate = useNavigate();
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const permissionLabels = () => {
    const perms: string[] = [];
    if (preview.can_sign) perms.push('Sign the agreement');
    if (preview.can_pay) perms.push('Pay on their behalf');
    if (preview.can_confirm_movein) perms.push('Confirm move-in');
    return perms;
  };

  const handleRespond = async (accept: boolean) => {
    setResponding(accept ? 'accept' : 'decline');
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
      setLocalError(await parseFunctionError(err, 'Failed to respond to invite'));
    } finally {
      setResponding(null);
    }
  };

  const isSale = preview.transaction_type === 'sell';
  const alreadyResponded = preview.status !== 'pending';

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-md bg-slate/20 border border-white/8 rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 bg-gold/12 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-gold" />
          </div>
          <h1 className="font-serif text-[18px] font-semibold text-paper">Delegate invitation</h1>
        </div>

        <p className="text-[13px] text-paper/60 mb-5 leading-relaxed">
          <span className="font-bold text-paper">{preview.principal_full_name}</span>{' '}
          wants you to act on their behalf for this {isSale ? 'sale' : 'tenancy'}.
        </p>

        <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Home className="w-4 h-4 text-gold/70 flex-shrink-0" />
            <p className="text-[13px] font-semibold text-paper">{preview.property_title}</p>
          </div>
          {preview.duration && (
            <p className="text-[11px] text-paper/40 mt-1.5 ml-[26px]">Duration: {preview.duration}</p>
          )}
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2.5">You'll be able to</p>
          <ul className="space-y-2">
            {permissionLabels().map(label => (
              <li key={label} className="text-[12px] text-paper/70 flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {alreadyResponded ? (
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            preview.status === 'accepted' ? 'bg-gold/8 border border-gold/20' : 'bg-white/4 border border-white/8'
          }`}>
            {preview.status === 'accepted' ? (
              <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-paper/40 flex-shrink-0" />
            )}
            <div>
              <p className="text-[13px] font-bold text-paper">
                {preview.status === 'accepted' ? 'You accepted this invitation' : 'You declined this invitation'}
              </p>
              <p className="text-[11px] text-paper/40 mt-0.5">This invite can no longer be responded to.</p>
            </div>
          </div>
        ) : (
          <>
            {localError && (
              <div className="flex items-start gap-2 mb-4 p-3 bg-danger/8 border border-danger/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-danger">{localError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleRespond(true)}
                disabled={responding !== null}
                className="flex-1 bg-gold text-ink py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {responding === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
              </button>
              <button
                onClick={() => handleRespond(false)}
                disabled={responding !== null}
                className="flex-1 bg-white/5 text-paper/60 border border-white/10 py-3 rounded-xl font-bold text-[13px] hover:bg-white/8 hover:text-paper transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {responding === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Decline
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
