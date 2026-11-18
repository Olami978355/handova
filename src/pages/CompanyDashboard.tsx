import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

interface CompanyRow {
  id: string;
  name: string;
  verification_status: string;
}
interface Suggestion {
  id: string;
  full_name: string | null;
  username: string | null;
}
interface ListingRow {
  id: string;
  title: string;
  status: string;
}
interface MemberRow {
  id: string;
  member_id: string;
  status: 'invited' | 'active' | 'removed';
  full_name: string | null;
  username: string | null;
}

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const STATUS_LABEL: Record<string, string> = {
  unverified: 'Not verified',
  pending_verification: 'Verification pending',
  verified: 'Verified business',
  rejected: 'Verification rejected',
};

export default function CompanyDashboard() {
  const { user, profile } = useAuth();
  const { toast, showToast } = useToast();
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [username, setUsername] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: c } = await supabase
      .from('companies')
      .select('id, name, verification_status')
      .eq('id', user.id)
      .maybeSingle();
    setCompany(c);

    const { data: props } = await supabase
      .from('properties')
      .select('id, title, status')
      .eq('company_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setListings(props || []);

    const { data: rows } = await supabase
      .from('company_members')
      .select('id, member_id, status')
      .eq('company_id', user.id)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    const ids = (rows || []).map(r => r.member_id);
    let people: { id: string; full_name: string | null; username: string | null }[] = [];
    if (ids.length > 0) {
      const { data } = await supabase
        .from('public_profiles')
        .select('id, full_name, username')
        .in('id', ids);
      people = data || [];
    }
    setMembers(
      (rows || []).map(r => {
        const p = people.find(x => x.id === r.member_id);
        return {
          ...r,
          full_name: p?.full_name ?? null,
          username: p?.username ?? null,
        } as MemberRow;
      })
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = username.trim().replace(/^@/, '').replace(/[%_,()*]/g, '');
    if (q.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('public_profiles')
        .select('id, full_name, username')
        .eq('role', 'agent')
        .or('username.ilike.' + q + '%,full_name.ilike.%' + q + '%')
        .limit(8);
      setSuggestions(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [username]);

  const requestVerification = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from('companies')
      .update({ verification_status: 'pending_verification' })
      .eq('id', user.id);
    setBusy(false);
    if (error) { showToast(error.message, true); return; }
    showToast('Verification requested');
    load();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const handle = username.trim().replace(/^@/, '');
    if (!handle) return;
    setBusy(true);
    try {
      const { data: person } = await supabase
        .from('public_profiles')
        .select('id, role')
        .eq('username', handle)
        .maybeSingle();
      if (!person || person.role !== 'agent') {
        showToast('No agent found with that username', true);
        return;
      }
      const existing = await supabase
        .from('company_members')
        .select('id, status')
        .eq('company_id', user.id)
        .eq('member_id', person.id)
        .maybeSingle();
      if (existing.data?.status === 'invited' || existing.data?.status === 'active') {
        showToast('Already on your team or invited', true);
        return;
      }
      const result = existing.data
        ? await supabase
            .from('company_members')
            .update({ status: 'invited' })
            .eq('id', existing.data.id)
        : await supabase.from('company_members').insert({
            company_id: user.id,
            member_id: person.id,
            status: 'invited',
            invited_by: user.id,
          });
      if (result.error) { showToast(result.error.message, true); return; }
      setUsername('');
      showToast('Invite sent');
      load();
    } finally {
      setBusy(false);
    }
  };

  const createCompany = async () => {
    if (!user) return;
    setBusy(true);
    const name = (profile?.full_name || '').trim();
    const { error } = await supabase.from('companies').upsert(
      { id: user.id, name: name.length >= 2 ? name : 'My Company' },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    setBusy(false);
    if (error) { showToast(error.message, true); return; }
    load();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const { error } = await supabase
      .from('company_members')
      .update({ status: 'removed' })
      .eq('id', id);
    setBusy(false);
    if (error) { showToast(error.message, true); return; }
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center" style={font}>
        <p className="text-[15px] font-bold text-white mb-2">Company not set up</p>
        <p className="text-[13px] text-white/40 mb-4">
          Create your company record to continue.
        </p>
        <button
          onClick={createCompany}
          disabled={busy}
          className="px-4 py-2 bg-gold text-ink text-[12px] font-bold rounded-xl disabled:opacity-50"
        >
          Create company
        </button>
        <Toast toast={toast} />
      </div>
    );
  }

  const typed = username.trim().replace(/^@/, '');
  const statusOf = (id: string): string | null => {
    const m = members.find(x => x.member_id === id);
    if (!m) return null;
    return m.status === 'active' ? 'On your team' : 'Invite pending';
  };
  const shown = suggestions.filter(
    p => p.username && (p.username !== typed || statusOf(p.id))
  );

  const canRequest =
    company.verification_status === 'unverified' ||
    company.verification_status === 'rejected';

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6" style={font}>
      <div className="bg-ink border border-white/6 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gold/10 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-black text-white truncate">{company.name}</h1>
            <p className="text-[12px] text-white/40 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {STATUS_LABEL[company.verification_status] || company.verification_status}
            </p>
            {profile?.username ? (
              <Link
                to={'/u/' + profile.username}
                className="text-[12px] text-gold mt-0.5 inline-block"
              >
                @{profile.username} · View public page
              </Link>
            ) : (
              <Link to="/profile" className="text-[12px] text-gold mt-0.5 inline-block">
                Set a username to get your public page
              </Link>
            )}
          </div>
          {canRequest && (
            <Link
              to="/company/verification"
              className="px-4 py-2 bg-gold text-ink text-[12px] font-bold rounded-xl"
            >
              Get verified
            </Link>
          )}
        </div>
      </div>

      <div className="bg-ink border border-white/6 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-white">Your listings</h2>
        </div>
        {listings.length === 0 ? (
          <p className="text-[13px] text-white/25 text-center py-4">No listings yet. They appear here when your agents publish under your company.</p>
        ) : (
          <div className="divide-y divide-white/6">
            {listings.map(l => (
              <Link
                key={l.id}
                to={'/property/' + l.id}
                className="flex items-center justify-between py-3"
              >
                <span className="text-[13px] font-semibold text-white truncate">{l.title}</span>
                <span className="text-[11px] text-white/40 capitalize">{l.status.replace('_', ' ')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-ink border border-white/6 rounded-2xl p-6">
        <h2 className="text-[15px] font-bold text-white mb-1">Your team</h2>
        <p className="text-[12px] text-white/40 mb-4">
          Invite agents by their Handova username. They must accept before joining.
        </p>
        <form onSubmit={invite} className="flex gap-2 mb-5">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Search agent by name or username"
            className="flex-1 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-[13px] text-white outline-none focus:border-gold/40"
          />
          <button
            type="submit"
            disabled={busy || !username.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gold text-ink text-[12px] font-bold rounded-xl disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" /> Invite
          </button>
        </form>

        {shown.length > 0 && (
          <div className="mb-4 -mt-3 bg-white/4 border border-white/8 rounded-xl overflow-hidden">
            {shown.map(p => (
              <button
                type="button"
                key={p.id}
                disabled={!!statusOf(p.id)}
                onClick={() => setUsername(p.username || '')}
                className="w-full text-left px-4 py-2.5 hover:bg-white/6 flex items-center justify-between disabled:opacity-60 disabled:hover:bg-transparent"
              >
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold text-white">{p.full_name || 'Agent'}</span>
                  <span className="text-[11px] text-white/35">@{p.username}</span>
                </span>
                <span className="text-[11px] text-gold font-semibold">{statusOf(p.id)}</span>
              </button>
            ))}
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-[13px] text-white/25 text-center py-6">No agents yet.</p>
        ) : (
          <div className="divide-y divide-white/6">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {m.full_name || 'Agent'}
                  </p>
                  <p className="text-[11px] text-white/30">
                    {m.username ? `@${m.username} · ` : ''}
                    {m.status === 'active' ? 'Active' : 'Invite pending'}
                  </p>
                </div>
                <button
                  onClick={() => remove(m.id)}
                  disabled={busy}
                  className="text-[12px] text-danger font-semibold disabled:opacity-50"
                >
                  {m.status === 'active' ? 'Remove' : 'Cancel'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
