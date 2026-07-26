import React, { useEffect, useState, useRef } from 'react';
import { UserPlus, Check, X, Loader2, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface DelegateRow {
  id: string;
  deal_id: string;
  principal_id: string;
  delegate_id: string;
  can_sign: boolean;
  can_pay: boolean;
  can_confirm_movein: boolean;
  status: 'pending' | 'accepted' | 'declined';
  principal?: { full_name: string };
  delegate?: { full_name: string };
}

interface UsernameSuggestion {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface DelegatesSectionProps {
  dealId: string;
  isPrincipal: boolean;
}

export const DelegatesSection: React.FC<DelegatesSectionProps> = ({ dealId, isPrincipal }) => {
  const { user } = useAuth();
  const [delegates, setDelegates] = useState<DelegateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [username, setUsername] = useState('');
  const [canSign, setCanSign] = useState(false);
  const [canPay, setCanPay] = useState(false);
  const [canConfirmMovein, setCanConfirmMovein] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<UsernameSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionBoxRef = useRef<HTMLDivElement | null>(null);

  const fetchDelegates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('deal_delegates')
      .select('*, principal:principal_id(full_name), delegate:delegate_id(full_name)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });
    setDelegates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDelegates(); }, [dealId]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUsernameChange = (raw: string) => {
    // Strip a leading @ if the user typed it
    const value = raw.startsWith('@') ? raw.slice(1) : raw;
    setUsername(value);
    setInviteError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim().toLowerCase();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('public_profiles')
        .select('id, username, full_name, avatar_url')
        .ilike('username', `${query}%`)
        .neq('id', user?.id || '')
        .limit(6);
      setSuggestions(data || []);
      setShowSuggestions(true);
      setSearching(false);
    }, 250);
  };

  const handleSelectSuggestion = (s: UsernameSuggestion) => {
    setUsername(s.username);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInvite = async () => {
    if (!username.trim()) return;
    if (!canSign && !canPay && !canConfirmMovein) {
      setInviteError('Grant at least one permission.');
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      const { error } = await supabase.functions.invoke('invite-deal-delegate', {
        body: {
          dealId,
          delegateUsername: username.trim().toLowerCase(),
          canSign, canPay, canConfirmMovein,
        },
      });
      if (error) throw error;
      setUsername('');
      setCanSign(false);
      setCanPay(false);
      setCanConfirmMovein(false);
      setShowInviteForm(false);
      setSuggestions([]);
      setShowSuggestions(false);
      await fetchDelegates();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRespond = async (inviteId: string, accept: boolean) => {
    setRespondingId(inviteId);
    try {
      const { error } = await supabase.functions.invoke('respond-to-delegate-invite', {
        body: { inviteId, accept },
      });
      if (error) throw error;
      await fetchDelegates();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to respond to invite');
    } finally {
      setRespondingId(null);
    }
  };

  const permissionLabels = (d: DelegateRow) => {
    const perms = [];
    if (d.can_sign) perms.push('Sign');
    if (d.can_pay) perms.push('Pay');
    if (d.can_confirm_movein) perms.push('Confirm move-in');
    return perms.join(' · ');
  };

  if (loading) return null;

  const myPendingInvites = delegates.filter(d => d.delegate_id === user?.id && d.status === 'pending');
  const otherDelegates = delegates.filter(d => !(d.delegate_id === user?.id && d.status === 'pending'));

  if (delegates.length === 0 && !isPrincipal) return null;

  return (
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#1a6b3c]" />
          <h3 className="text-[13px] font-bold text-white">Delegates</h3>
        </div>
        {isPrincipal && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#f0c040]/70 hover:text-[#f0c040] transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {myPendingInvites.map(inv => (
        <div key={inv.id} className="p-3 mb-3 bg-[#f0c040]/8 border border-[#f0c040]/20 rounded-xl">
          <p className="text-[12px] text-white/70 mb-1">
            <span className="font-bold text-white">{inv.principal?.full_name || 'Someone'}</span> wants you to act on their behalf
          </p>
          <p className="text-[11px] text-white/40 mb-3">{permissionLabels(inv)}</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleRespond(inv.id, true)}
              disabled={respondingId === inv.id}
              className="flex-1 bg-[#1a6b3c] text-white py-2 rounded-lg font-bold text-[11px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {respondingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Accept
            </button>
            <button
              onClick={() => handleRespond(inv.id, false)}
              disabled={respondingId === inv.id}
              className="flex-1 bg-white/5 text-white/50 py-2 rounded-lg font-bold text-[11px] hover:bg-white/8 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" /> Decline
            </button>
          </div>
        </div>
      ))}

      {showInviteForm && (
        <div className="p-3 mb-3 bg-white/4 border border-white/8 rounded-xl space-y-3">
          <div className="relative" ref={suggestionBoxRef}>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder="Their username (or @username)"
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/8 rounded-lg text-[12px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/50 transition-colors"
            />
            {searching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30 absolute right-3 top-1/2 -translate-y-1/2" />
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-[#0f2416] border border-white/10 rounded-lg overflow-hidden shadow-xl">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/8 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#1a6b3c]/20 flex items-center justify-center text-[10px] font-bold text-[#1a6b3c] flex-shrink-0 overflow-hidden">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        s.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">@{s.username}</p>
                      <p className="text-[10px] text-white/35 truncate">{s.full_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && !searching && suggestions.length === 0 && username.trim().length >= 2 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-[#0f2416] border border-white/10 rounded-lg px-3 py-2">
                <p className="text-[11px] text-white/30">No matching username.</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Can sign the agreement', checked: canSign, set: setCanSign },
              { label: 'Can pay on my behalf', checked: canPay, set: setCanPay },
              { label: 'Can confirm move-in', checked: canConfirmMovein, set: setCanConfirmMovein },
            ].map(opt => (
              <label key={opt.label} className="flex items-center gap-2 text-[11px] text-white/60">
                <input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} />
                {opt.label}
              </label>
            ))}
          </div>
          {inviteError && <p className="text-[11px] text-red-400">{inviteError}</p>}
          <button
            onClick={handleInvite}
            disabled={inviting || !username.trim()}
            className="w-full bg-[#1a6b3c] text-white py-2.5 rounded-lg font-bold text-[12px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40"
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      )}

      {otherDelegates.length === 0 ? (
        !showInviteForm && myPendingInvites.length === 0 && (
          <p className="text-[12px] text-white/25 text-center py-2">No delegates on this deal.</p>
        )
      ) : (
        <div className="space-y-2">
          {otherDelegates.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
              <div>
                <p className="text-[12px] font-semibold text-white">{d.delegate?.full_name || 'Unknown'}</p>
                <p className="text-[10px] text-white/35">on behalf of {d.principal?.full_name} · {permissionLabels(d)}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                d.status === 'accepted' ? 'bg-[#4ade80]/10 text-[#4ade80]' :
                d.status === 'declined' ? 'bg-red-500/10 text-red-400' :
                'bg-[#f0c040]/10 text-[#f0c040]'
              }`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
