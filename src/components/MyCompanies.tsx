import React, { useCallback, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Membership {
  company_id: string;
  name: string;
}

export const MyCompanies: React.FC = () => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Membership[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || profile?.role !== 'agent') return;
    const { data: rows } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('member_id', user.id)
      .eq('status', 'active');
    const ids = (rows || []).map(r => r.company_id);
    if (ids.length === 0) { setItems([]); return; }
    const { data: cos } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', ids);
    setItems((cos || []).map(c => ({ company_id: c.id, name: c.name })));
  }, [user, profile?.role]);

  useEffect(() => { load(); }, [load]);

  const askToLeave = async (companyId: string) => {
    setBusyId(companyId);
    setError(null);
    const { error: err } = await supabase.rpc('request_company_leave', {
      p_company: companyId,
    });
    setBusyId(null);
    if (err) { setError(err.message); return; }
    setAsked(prev => [...prev, companyId]);
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-slate/20 border border-white/8 rounded-2xl p-5">
      <p className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-3">
        Your companies
      </p>
      <div className="space-y-3">
        {items.map(c => (
          <div key={c.company_id} className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gold" />
            </div>
            <p className="flex-1 min-w-0 text-[13px] font-semibold text-white truncate">
              {c.name}
            </p>
            {asked.includes(c.company_id) ? (
              <span className="text-[11px] text-white/40">Request sent</span>
            ) : (
              <button
                onClick={() => askToLeave(c.company_id)}
                disabled={busyId === c.company_id}
                className="text-[12px] text-white/50 font-semibold disabled:opacity-50"
              >
                Ask to leave
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-white/30 mt-3">
        Only the company can remove you. Asking to leave sends them a request.
      </p>
      {error && <p className="text-[12px] text-danger mt-2">{error}</p>}
    </div>
  );
};
