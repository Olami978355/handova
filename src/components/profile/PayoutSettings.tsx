import React, { useState } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';
import { parseFunctionError } from '../../lib/parseFunctionError';
import { NIGERIAN_BANKS } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const PayoutSettings: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const hasExisting = !!(profile?.bank_account_number && profile?.bank_code);

  const [editing, setEditing] = useState(!hasExisting);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedBankName = NIGERIAN_BANKS.find(b => b.code === bankCode)?.name;

  const handleVerify = async () => {
    setError(null);
    setResolvedName(null);
    if (!bankCode) {
      setError('Select a bank first.');
      return;
    }
    if (accountNumber.length !== 10) {
      setError('Account number should be 10 digits.');
      return;
    }
    setResolving(true);
    try {
      if (!(await requireValidSession())) return;
      const { data, error: fnError } = await supabase.functions.invoke('resolve-bank-account', {
        body: { accountNumber, bankCode },
      });
      if (fnError) throw fnError;
      setResolvedName(data.accountName);
    } catch (err: unknown) {
      setError(await parseFunctionError(err, 'Could not verify this account.'));
    } finally {
      setResolving(false);
    }
  };

  const handleSave = async () => {
    if (!resolvedName) return;
    setSaving(true);
    setError(null);
    try {
      if (!(await requireValidSession())) return;
      const { error: fnError } = await supabase.functions.invoke('save-bank-details', {
        body: { accountNumber, bankCode, accountName: resolvedName },
      });
      if (fnError) throw fnError;
      await refreshProfile();
      setSuccess(true);
      setEditing(false);
      setResolvedName(null);
      setAccountNumber('');
      setBankCode('');
    } catch (err: unknown) {
      setError(await parseFunctionError(err, 'Failed to save bank details.'));
    } finally {
      setSaving(false);
    }
  };

  if (!editing && hasExisting) {
    return (
      <div>
        <h2 className="text-[16px] font-bold text-paper mb-5">Payments & Payouts</h2>
        <div className="p-4 bg-gold/6 border border-gold/20 rounded-xl mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-gold" />
            <p className="text-[13px] font-bold text-gold">Payout account on file</p>
          </div>
          <div className="space-y-1.5 pl-6">
            <p className="text-[13px] text-paper">{profile?.bank_account_name}</p>
            <p className="text-[12px] text-paper/50 tabular-nums">
              {NIGERIAN_BANKS.find(b => b.code === profile?.bank_code)?.name || 'Bank'} &middot; ****{profile?.bank_account_number?.slice(-4)}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-paper/35 leading-relaxed mb-4">
          Funds released to you from escrow are sent to this account. Update it if your bank details change.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-[13px] font-bold text-gold hover:text-gold-dark transition-colors"
        >
          Update payout account
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[16px] font-bold text-paper mb-2">Payments & Payouts</h2>
      <p className="text-[12px] text-paper/40 mb-5 leading-relaxed">
        Add the bank account funds should be released to when a deal completes. We verify the account holder's name with your bank before saving.
      </p>

      {success && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-gold/8 border border-gold/20 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
          <p className="text-[12px] text-gold">Payout account saved.</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-danger/8 border border-danger/20 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-danger">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider mb-2">
            Bank
          </label>
          <div className="relative">
            <select
              value={bankCode}
              onChange={(e) => { setBankCode(e.target.value); setResolvedName(null); }}
              className="w-full appearance-none px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper outline-none focus:border-gold transition-colors"
            >
              <option value="" className="bg-ink">Select your bank</option>
              {NIGERIAN_BANKS.map(b => (
                <option key={b.code} value={b.code} className="bg-ink">{b.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/30 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider mb-2">
            Account Number
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setResolvedName(null); }}
            placeholder="0123456789"
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper tabular-nums placeholder:text-paper/20 outline-none focus:border-gold transition-colors"
          />
        </div>

        {!resolvedName ? (
          <button
            onClick={handleVerify}
            disabled={resolving || !bankCode || accountNumber.length !== 10}
            className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-paper py-3.5 rounded-xl font-bold text-[14px] hover:bg-white/8 transition-colors disabled:opacity-40"
          >
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {resolving ? 'Verifying...' : 'Verify Account'}
          </button>
        ) : (
          <>
            <div className="p-4 bg-gold/6 border border-gold/20 rounded-xl">
              <p className="text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-1.5">Account holder</p>
              <p className="text-[15px] font-bold text-gold">{resolvedName}</p>
              <p className="text-[12px] text-paper/40 mt-0.5">{selectedBankName}</p>
            </div>
            <p className="text-[11px] text-paper/35 leading-relaxed">
              Is this you? Funds will be sent to this exact name and account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResolvedName(null)}
                className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-paper/40 hover:bg-white/5 transition-colors"
              >
                Not me, edit
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-gold text-ink py-3.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Save'}
              </button>
            </div>
          </>
        )}

        {hasExisting && editing && (
          <button
            onClick={() => { setEditing(false); setResolvedName(null); setError(null); }}
            className="text-[12px] text-paper/35 hover:text-paper/60 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
