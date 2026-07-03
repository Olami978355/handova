import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Loader2, FileText, Building2, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface VerificationRequestRow {
  id: string;
  user_id: string;
  nin_doc_url: string | null;
  business_reg_url: string | null;
  lasrera_id: string | null;
  lasrera_doc_url: string | null;
  status: string;
  submitted_at: string;
  profiles?: { full_name: string; email: string; role: string; avatar_url?: string };
  profiles_private?: { nin: string | null };
}

export default function VerificationReview() {
  const [requests, setRequests] = useState<VerificationRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [rejectModalFor, setRejectModalFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data: reqs, error } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching verification requests:', error);
      setLoading(false);
      return;
    }

    if (reqs && reqs.length > 0) {
      const userIds = [...new Set(reqs.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .in('id', userIds);

      const { data: privateData } = await supabase
        .from('profiles_private')
        .select('id, nin')
        .in('id', userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const privateMap = Object.fromEntries((privateData || []).map(p => [p.id, p]));

      setRequests(reqs.map(r => ({
        ...r,
        profiles: profileMap[r.user_id],
        profiles_private: privateMap[r.user_id],
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  const viewDocument = async (requestId: string, docType: string) => {
    setDocLoading(`${requestId}-${docType}`);
    try {
      const { data, error } = await supabase.functions.invoke('admin-view-verification-doc', {
        body: { requestId, docType },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setDocLoading(null);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('review-verification-request', {
        body: { requestId, decision: 'approve' },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      await fetchRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const submitReject = async () => {
    if (!rejectModalFor || !rejectReason.trim()) return;
    setActionLoading(rejectModalFor);
    try {
      const { data, error } = await supabase.functions.invoke('review-verification-request', {
        body: { requestId: rejectModalFor, decision: 'reject', rejectionReason: rejectReason.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setRejectModalFor(null);
      setRejectReason('');
      await fetchRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={font}>
        <Loader2 className="w-6 h-6 text-[#1a6b3c] animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 bg-[#0a1f11] border border-white/6 rounded-2xl" style={font}>
        <ShieldCheck className="w-10 h-10 text-white/15 mx-auto mb-4" />
        <h3 className="text-[16px] font-bold text-white mb-2">No pending verifications</h3>
        <p className="text-[12px] text-white/35">Identity verification requests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={font}>
      {requests.map((req) => (
        <div key={req.id} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1a6b3c]/20 rounded-xl overflow-hidden flex items-center justify-center text-[#1a6b3c] font-bold text-[13px] flex-shrink-0">
              {req.profiles?.avatar_url
                ? <img src={req.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                : (req.profiles?.full_name || req.profiles?.email || '?').charAt(0).toUpperCase()
              }
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">{req.profiles?.full_name || 'Unnamed User'}</p>
              <p className="text-[11px] text-white/35 capitalize">{req.profiles?.role} · {req.profiles?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-white/3 rounded-xl">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">NIN</p>
              <p className="text-[13px] font-mono text-white">{req.profiles_private?.nin || 'Not provided'}</p>
            </div>

            <button
              onClick={() => viewDocument(req.id, 'nin_doc_url')}
              disabled={!req.nin_doc_url || docLoading === `${req.id}-nin_doc_url`}
              className="flex items-center justify-between p-3 bg-white/3 rounded-xl hover:bg-white/6 transition-colors disabled:opacity-40 text-left"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-white/70">
                <FileText className="w-3.5 h-3.5 text-[#1a6b3c]" /> Government ID
              </span>
              {docLoading === `${req.id}-nin_doc_url`
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
                : <ExternalLink className="w-3.5 h-3.5 text-white/30" />}
            </button>

            {req.business_reg_url && (
              <button
                onClick={() => viewDocument(req.id, 'business_reg_url')}
                disabled={docLoading === `${req.id}-business_reg_url`}
                className="flex items-center justify-between p-3 bg-white/3 rounded-xl hover:bg-white/6 transition-colors disabled:opacity-40 text-left"
              >
                <span className="flex items-center gap-2 text-[12px] font-semibold text-white/70">
                  <Building2 className="w-3.5 h-3.5 text-[#1a6b3c]" /> CAC Certificate
                </span>
                {docLoading === `${req.id}-business_reg_url`
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
                  : <ExternalLink className="w-3.5 h-3.5 text-white/30" />}
              </button>
            )}

            {req.lasrera_id && (
              <div className="p-3 bg-white/3 rounded-xl">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">LASRERA ID</p>
                <p className="text-[13px] text-white">{req.lasrera_id}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setRejectModalFor(req.id)}
              disabled={actionLoading === req.id}
              className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-[12px] hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => handleApprove(req.id)}
              disabled={actionLoading === req.id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a6b3c] text-white rounded-xl font-bold text-[12px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-50"
            >
              {actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve Verification
            </button>
          </div>
        </div>
      ))}

      {rejectModalFor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a1f11] border border-white/10 rounded-2xl p-6 max-w-sm w-full" style={font}>
            <h3 className="text-[16px] font-black text-white mb-3">Reject Verification</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. ID document is blurry, NIN doesn't match name on file..."
              className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-red-500/40 transition-colors resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModalFor(null); setRejectReason(''); }}
                className="flex-1 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-white/50 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || actionLoading === rejectModalFor}
                className="flex-1 py-2.5 bg-red-500 rounded-xl text-[13px] font-bold text-white hover:bg-red-600 transition-all disabled:opacity-40"
              >
                {actionLoading === rejectModalFor ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
