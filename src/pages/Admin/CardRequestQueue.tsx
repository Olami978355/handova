import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function CardRequestQueue() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from('agent_card_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (reqs && reqs.length > 0) {
      const agentIds = [...new Set(reqs.map(r => r.agent_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, agent_id, landlord_id, avatar_url')
        .in('id', agentIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      setRequests(reqs.map(r => ({ ...r, profile: profileMap[r.agent_id] })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId: string, agentId: string) => {
    setActionLoading(requestId);
    try {
      const cardId = `RE-CARD-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const { error } = await supabase
        .from('agent_card_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
          card_id: cardId,
        })
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: agentId,
        title: 'Digital ID Card Approved! 🎉',
        body: 'Your Handova Verified Agent Digital ID is now ready. View it on your profile.',
        type: 'verification_approved',
        link: '/profile',
      });

      await fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string, agentId: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('agent_card_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
          rejection_reason: reason,
        })
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: agentId,
        title: 'ID Card Request Update',
        body: `Your request was not approved. Reason: ${reason}`,
        type: 'verification_rejected',
        link: '/profile',
      });

      await fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={font}>
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 bg-ink border border-white/6 rounded-2xl" style={font}>
        <CreditCard className="w-10 h-10 text-white/15 mx-auto mb-4" />
        <h3 className="text-[16px] font-bold text-white mb-2">No pending requests</h3>
        <p className="text-[12px] text-white/35">Digital ID card requests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" style={font}>
      {requests.map((req) => (
        <div key={req.id} className="bg-ink border border-white/6 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/20 rounded-xl overflow-hidden flex items-center justify-center text-gold font-bold text-[13px] flex-shrink-0">
              {req.profile?.avatar_url
                ? <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (req.profile?.full_name || 'A').charAt(0).toUpperCase()
              }
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">{req.profile?.full_name}</p>
              <p className="text-[11px] text-white/35 capitalize">{req.profile?.role} · {req.profile?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleReject(req.id, req.agent_id)}
              disabled={actionLoading === req.id}
              className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-[12px] hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => handleApprove(req.id, req.agent_id)}
              disabled={actionLoading === req.id}
              className="px-4 py-2 bg-gold text-black rounded-xl font-bold text-[12px] hover:bg-[#e0b030] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}