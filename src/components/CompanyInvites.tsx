import React, { useCallback, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Invite {
  id: string;
  company_id: string;
  company_name: string;
}

export const CompanyInvites: React.FC = () => {
  const { user, profile } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || profile?.role !== 'agent') return;
    const { data: rows } = await supabase
      .from('company_members')
      .select('id, company_id')
      .eq('member_id', user.id)
      .eq('status', 'invited');
    const list = rows || [];
    if (list.length === 0) { setInvites([]); return; }
    const { data: cos } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', list.map(r => r.company_id));
    setInvites(list.map(r => ({
      ...r,
      company_name: cos?.find(c => c.id === r.company_id)?.name || 'A company',
    })));
  }, [user, profile?.role]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, status: 'active' | 'removed') => {
    setBusyId(id);
    setError(null);
    const { error: err } = await supabase
      .from('company_members')
      .update({ status })
      .eq('id', id);
    setBusyId(null);
    if (err) {
      setError(err.message.includes('uq_company_members_one_active')
        ? 'You already work with another company. Leave it first.'
        : err.message);
      return;
    }
    load();
  };

  if (invites.length === 0) return null;

  return (
    <div className="space-y-3">
      {invites.map(inv => (
        <div
          key={inv.id}
          className="bg-slate/20 border border-gold/20 rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate">
              {inv.company_name} invited you to join their team
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              You can leave at any time.
            </p>
          </div>
          <button
            onClick={() => respond(inv.id, 'removed')}
            disabled={busyId === inv.id}
            className="text-[12px] text-white/50 font-semibold disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={() => respond(inv.id, 'active')}
            disabled={busyId === inv.id}
            className="px-4 py-2 bg-gold text-ink text-[12px] font-bold rounded-xl disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      ))}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
};
