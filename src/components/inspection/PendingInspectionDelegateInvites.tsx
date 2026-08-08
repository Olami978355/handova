import React, { useEffect, useState } from 'react';
import { Users, Check, X, Loader2 } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface PendingInvite {
  id: string;
  booking_id: string;
  principal_id: string;
  principal_name: string;
  property_title: string;
}

export const PendingInspectionDelegateInvites: React.FC = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchInvites = async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from('inspection_delegates')
      .select('id, booking_id, principal_id, inspection_bookings(properties(title))')
      .eq('delegate_id', user.id)
      .eq('status', 'pending');
    if (!rows || rows.length === 0) { setInvites([]); return; }

    const principalIds = [...new Set(rows.map((r: any) => r.principal_id))];
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, full_name')
      .in('id', principalIds);
    const nameById = new Map((profiles || []).map(p => [p.id, p.full_name]));

    setInvites(rows.map((r: any) => ({
      id: r.id,
      booking_id: r.booking_id,
      principal_id: r.principal_id,
      principal_name: nameById.get(r.principal_id) || 'Someone',
      property_title: r.inspection_bookings?.properties?.title || 'a property',
    })));
  };

  useEffect(() => { fetchInvites(); }, [user?.id]);

  const respond = async (inviteId: string, accept: boolean) => {
    setResponding(inviteId);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke('respond-to-inspection-delegate-invite', {
        body: { inviteId, accept },
      });
      if (error) throw error;
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to respond');
    } finally {
      setResponding(null);
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {invites.map(invite => (
        <div key={invite.id} className="bg-slate/20 border border-gold/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-gold/12 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-paper">
              {invite.principal_name} wants you to attend an inspection for them
            </p>
            <p className="text-[11px] text-paper/40 mt-0.5">{invite.property_title}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => respond(invite.id, true)}
                disabled={responding === invite.id}
                className="flex items-center gap-1.5 bg-gold text-ink px-3 py-1.5 rounded-lg font-bold text-[11px] hover:bg-gold-dark transition-colors disabled:opacity-40"
              >
                {responding === invite.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Accept
              </button>
              <button
                onClick={() => respond(invite.id, false)}
                disabled={responding === invite.id}
                className="flex items-center gap-1.5 bg-white/5 text-paper/50 px-3 py-1.5 rounded-lg font-bold text-[11px] hover:text-paper transition-colors disabled:opacity-40"
              >
                <X className="w-3 h-3" /> Decline
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
