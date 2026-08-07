import React, { useEffect, useState, useRef } from 'react';
import { UserPlus, Loader2, X } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface DelegateRow {
  id: string;
  delegate_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  delegate?: { full_name: string };
}

export const InspectionDelegateInvite: React.FC<{ bookingId: string; isTenant: boolean }> = ({ bookingId, isTenant }) => {
  const { user } = useAuth();
  const [delegates, setDelegates] = useState<DelegateRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDelegates = async () => {
    const { data: rows } = await supabase
      .from('inspection_delegates')
      .select('id, delegate_id, status')
      .eq('booking_id', bookingId)
      .in('status', ['pending', 'accepted']);
    if (!rows || rows.length === 0) { setDelegates([]); return; }
    const ids = [...new Set(rows.map(r => r.delegate_id))];
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', ids);
    const nameById = new Map((profiles || []).map(p => [p.id, p.full_name]));
    setDelegates(rows.map(r => ({ ...r, delegate: { full_name: nameById.get(r.delegate_id) || 'Delegate' } })));
  };

  useEffect(() => { fetchDelegates(); }, [bookingId]);

  const handleInvite = async () => {
    if (!username.trim()) return;
    setInviting(true);
    setError(null);
    try {
      if (!(await requireValidSession())) return;
      const cleaned = (username.startsWith('@') ? username.slice(1) : username).trim().toLowerCase();
      const { error: fnError } = await supabase.functions.invoke('invite-inspection-delegate', {
        body: { bookingId, delegateUsername: cleaned },
      });
      if (fnError) throw fnError;
      setUsername('');
      setShowForm(false);
      await fetchDelegates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  if (!isTenant && delegates.length === 0) return null;

  return (
    <div className="mt-2">
      {delegates.map(d => (
        <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-white/4 rounded-xl mb-1.5">
          <span className="text-[11px] text-paper/60">{d.delegate?.full_name || 'Delegate'} attending on your behalf</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
            d.status === 'accepted' ? 'bg-gold/10 text-gold' : 'bg-white/8 text-paper/50'
          }`}>
            {d.status}
          </span>
        </div>
      ))}
      {isTenant && !showForm && delegates.length === 0 && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-gold/70 hover:text-gold transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> Let someone attend for you
        </button>
      )}
      {showForm && (
        <div className="p-3 bg-white/4 border border-white/8 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-paper/50 uppercase tracking-wider">Invite by username</span>
            <button onClick={() => setShowForm(false)} className="text-paper/30 hover:text-paper/60">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full px-3 py-2 bg-white/5 border border-white/8 rounded-lg text-[12px] text-paper placeholder-paper/25 outline-none focus:border-gold/50 transition-colors"
          />
          {error && <p className="text-[11px] text-danger">{error}</p>}
          <button
            onClick={handleInvite}
            disabled={inviting || !username.trim()}
            className="w-full bg-gold text-ink py-2 rounded-lg font-bold text-[12px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Invite'}
          </button>
        </div>
      )}
    </div>
  );
};
