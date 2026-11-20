import { useEffect, useState } from 'react';
import { Building2, Loader2, Save, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export function CompanyInspectionFee() {
  const { user } = useAuth();
  const [fee, setFee] = useState('0');
  const [savedFee, setSavedFee] = useState('0');
  const [loaded, setLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadFee = async () => {
      setLoaded(false);
      setLoadingError(false);

      const { data, error } = await supabase
        .from('companies')
        .select('inspection_fee')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setLoadingError(true);
        setLoaded(true);
        return;
      }

      const currentFee = String(data.inspection_fee ?? 0);
      setFee(currentFee);
      setSavedFee(currentFee);
      setLoaded(true);
    };

    loadFee();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const save = async () => {
    setMsg(null);

    const n = Math.round(Number(fee));

    if (!Number.isFinite(n) || n < 0 || n > 15000) {
      setMsg({
        ok: false,
        text: 'Enter a valid amount between ₦0 and ₦15,000.',
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc('set_my_inspection_fee', {
        p_fee: n,
      });

      if (error) throw error;

      setFee(String(n));
      setSavedFee(String(n));
      setMsg({
        ok: true,
        text: n === 0
          ? 'Your company inspection fee is now set to free.'
          : 'Your company inspection fee has been updated.',
      });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to save your inspection fee.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="mt-4 flex items-center gap-2 py-4 text-[11px] text-[#89867d]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading company inspection settings...
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-[11px] text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        Unable to load your company inspection fee settings.
      </div>
    );
  }

  return (
    <section
      className="mt-4 overflow-hidden rounded-2xl border border-[#e9e4d9] bg-white"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex items-start gap-3 border-b border-[#eeeae2] px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3efe5] text-[#9c8247]">
          <Building2 className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#25251f]">
            Company inspection fee
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#858177]">
            Set the amount tenants pay when booking an inspection on your company's listings.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl bg-[#f8f7f4] p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a18a50]" />
            <div className="text-[10px] leading-relaxed text-[#716e64]">
              <p>
                This fee applies to your company's listings. Set it to ₦0 to offer free inspections.
              </p>
              <p className="mt-1 font-medium text-[#55534d]">
                Maximum permitted fee: ₦15,000.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="company-inspection-fee"
            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#77746b]"
          >
            Inspection fee
          </label>

          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-[#e5e1d8] bg-white transition-colors focus-within:border-[#b69a55]">
              <span className="border-r border-[#eeeae2] px-3 py-3 text-[13px] font-semibold text-[#8b7849]">
                ₦
              </span>
              <input
                id="company-inspection-fee"
                type="number"
                min={0}
                max={15000}
                step={100}
                value={fee}
                onChange={event => {
                  setFee(event.target.value);
                  setMsg(null);
                }}
                disabled={saving}
                className="w-full min-w-0 bg-transparent px-3 py-3 text-[13px] font-semibold text-[#25251f] outline-none disabled:opacity-60"
                placeholder="0"
              />
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving || fee.trim() === '' || fee.trim() === savedFee}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#b69a55] px-4 py-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#9e8240] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>

          <p className="mt-2 text-[10px] text-[#969187]">
            Enter an amount from ₦0 to ₦15,000.
          </p>
        </div>

        {msg && (
          <div
            className={`flex items-start gap-2 rounded-xl p-3 text-[11px] ${
              msg.ok
                ? 'border border-[#e4eadc] bg-[#f4f7f0] text-[#526b43]'
                : 'border border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {msg.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}
      </div>
    </section>
  );
}
