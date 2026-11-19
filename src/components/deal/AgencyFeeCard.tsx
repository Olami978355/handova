import React, { useState } from 'react';
import { BadgePercent, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatNaira } from '../../utils/format';

// The standard agency fee in Nigeria is commonly 10% of the rent. Handova only suggests it:
// the agent decides the amount (including none), and the tenant sees it itemised before paying.
const RECOMMENDED_AGENCY_FEE_RATE = 0.1;

interface AgencyFeeCardProps {
  dealId: string;
  amount: number;
  current: number;
  onSaved: () => void | Promise<void>;
}

export const AgencyFeeCard: React.FC<AgencyFeeCardProps> = ({ dealId, amount, current, onSaved }) => {
  const recommended = Math.round(amount * RECOMMENDED_AGENCY_FEE_RATE);
  const [value, setValue] = useState<string>(current > 0 ? String(current) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const parsed = value.trim() === '' ? 0 : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('deals')
      .update({ agency_fee: parsed })
      .eq('id', dealId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await onSaved();
  };

  return (
    <div className="p-5 bg-white/4 border border-white/8 rounded-xl">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 bg-gold/15 rounded-xl flex items-center justify-center flex-shrink-0">
          <BadgePercent className="w-4 h-4 text-gold" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-paper mb-1">Agency fee</h4>
          <p className="text-[12px] text-paper/45 leading-relaxed">
            Set the agency fee the tenant pays on top of the rent. 10% of the rent ({formatNaira(recommended)}) is the
            recommended standard, but the amount is up to you. The tenant sees it before they pay. You can change it
            until the tenant approves the agreement.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[14px] text-paper outline-none focus:border-gold/40"
        />
        <button
          type="button"
          onClick={() => setValue(String(recommended))}
          className="px-3 py-2.5 rounded-xl border border-gold/30 text-gold text-[12px] font-semibold hover:bg-gold/10 transition-colors"
        >
          Use 10%
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-gold text-ink text-[12px] font-bold hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
        </button>
      </div>
      {error && <p className="text-[11px] text-danger mt-2">{error}</p>}
    </div>
  );
};
