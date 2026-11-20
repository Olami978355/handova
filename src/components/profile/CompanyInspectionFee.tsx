import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export function CompanyInspectionFee() {
  const { user } = useAuth();
  const [fee, setFee] = useState('0');
  const [savedFee, setSavedFee] = useState('0');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('companies')
      .select('inspection_fee')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFee(String(data.inspection_fee ?? 0));
          setSavedFee(String(data.inspection_fee ?? 0));
          setLoaded(true);
        }
      });
  }, [user]);

  if (!loaded) return null;

  const save = async () => {
    setMsg(null);
    const n = Math.round(Number(fee));
    if (!Number.isFinite(n) || n < 0 || n > 15000) {
      setMsg({ ok: false, text: 'Enter an amount between 0 and 15,000.' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('set_my_inspection_fee', { p_fee: n });
    setSaving(false);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setFee(String(n));
      setSavedFee(String(n));
      setMsg({ ok: true, text: n === 0 ? 'Saved. Inspections on your listings are free.' : 'Saved. This fee now applies to all your listings.' });
    }
  };

  return (
    <div className="mt-4 p-4 bg-white/5 border border-white/8 rounded-2xl space-y-3">
      <div>
        <p className="text-[13px] font-bold text-paper">Inspection fee</p>
        <p className="text-[11px] text-paper/40 leading-relaxed mt-0.5">
          Tenants pay this when they book an inspection on any of your listings. It goes to your company account.
          Leave it at 0 for free inspections. Maximum 15,000.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          max={15000}
          value={fee}
          onChange={e => setFee(e.target.value)}
          className="flex-1 px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper outline-none focus:border-gold/50"
        />
        <button
          onClick={save}
          disabled={saving || fee.trim() === '' || fee.trim() === savedFee}
          className="px-4 bg-gold text-black rounded-xl font-bold text-[13px] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {msg && <p className={'text-[11px] ' + (msg.ok ? 'text-gold' : 'text-danger')}>{msg.text}</p>}
    </div>
  );
}
