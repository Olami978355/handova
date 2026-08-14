import React, { useEffect, useState } from 'react';
import { Scale, CheckCircle2, Loader2, FileText, ExternalLink } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface LawyerVerificationRow {
  id: string;
  user_id: string;
  nba_number: string;
  cert_url: string | null;
  specialty: string;
  states_covered: string[];
  status: string;
  submitted_at: string;
  profiles?: { full_name: string; email: string; avatar_url?: string };
}

export default function LawyerVerificationReview() {
  const [requests, setRequests] = useState<LawyerVerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [rejectModalFor, setRejectModalFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data: reqs, error } = await supabase
      .from('lawyer_verifications')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching lawyer verification requests:', error);
      setLoading(false);
      return;
    }

    if (reqs && reqs.length > 0) {
      const userIds = [...new Set(reqs.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      setRequests(reqs.map(r => ({ ...r, profiles: profileMap[r.user_id] })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  // Admins have direct RLS read access to lawyer-certs, so instead of trusting
  // the cert_url captured at upload time (a 7-day signed URL that may have
  // expired by review time), list the applicant's folder and sign fresh.
  const viewCertificate = async (req: LawyerVerificationRow) => {
    setDocLoading(req.id);
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('lawyer-certs')
        .list(req.user_id);
      if (listError) throw listError;
      if (!files || files.length === 0) throw new Error('No certificate file found');

      const filePath = `${req.user_id}/${files[0].name}`;
      const { data: signedData, error: signedError } = await supabase.storage
        .from('lawyer-certs')
        .createSignedUrl(filePath, 60 * 10);
      if (signedError) throw signedError;

      window.open(signedData.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load certificate');
    } finally {
      setDocLoading(null);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      if (!(await requireValidSession())) return;
      const { data, error } = await supabase.functions.invoke('review-lawyer-verification', {
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
      if (!(await requireValidSession())) return;
      const { data, error } = await supabase.functions.invoke('review-lawyer-verification', {
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

  const specialtyLabel = (s: string) =>
    s === 'property_title' ? 'Property / Title' : s === 'both' ? 'Tenancy + Property' : 'Tenancy';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={font}>
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 bg-slate/20 border border-white/6 rounded-2xl" style={font}>
        <Scale className="w-10 h-10 text-paper/15 mx-auto mb-4" />
        <h3 className="text-[16px] font-bold text-paper mb-2">No pending lawyer applications</h3>
        <p className="text-[12px] text-paper/35">Lawyer verification requests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={font}>
      {requests.map((req) => (
        <div key={req.id} className="bg-slate/20 border border-white/6 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gold/20 rounded-xl overflow-hidden flex items-center justify-center text-gold font-bold text-[13px] flex-shrink-0">
              {req.profiles?.avatar_url
                ? <img src={req.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                : (req.profiles?.full_name || req.profiles?.email || '?').charAt(0).toUpperCase()
              }
            </div>
            <div>
              <p className="text-[13px] font-bold text-paper">{req.profiles?.full_name || 'Unnamed User'}</p>
              <p className="text-[11px] text-paper/35">{req.profiles?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-white/3 rounded-xl">
              <p className="text-[10px] font-bold text-paper/30 uppercase tracking-wider mb-1">NBA Number</p>
              <p className="text-[13px] font-mono text-paper">{req.nba_number}</p>
            </div>

            <div className="p-3 bg-white/3 rounded-xl">
              <p className="text-[10px] font-bold text-paper/30 uppercase tracking-wider mb-1">Specialty</p>
              <p className="text-[13px] text-paper">{specialtyLabel(req.specialty)}</p>
            </div>

            <div className="p-3 bg-white/3 rounded-xl sm:col-span-2">
              <p className="text-[10px] font-bold text-paper/30 uppercase tracking-wider mb-1">States Covered</p>
              <p className="text-[13px] text-paper">{req.states_covered.join(', ') || 'None specified'}</p>
            </div>

            <button
              onClick={() => viewCertificate(req)}
              disabled={docLoading === req.id}
              className="flex items-center justify-between p-3 bg-white/3 rounded-xl hover:bg-white/6 transition-colors disabled:opacity-40 text-left sm:col-span-2"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-paper/70">
                <FileText className="w-3.5 h-3.5 text-gold" /> Call-to-Bar / Practicing Certificate
              </span>
              {docLoading === req.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-paper/40" />
                : <ExternalLink className="w-3.5 h-3.5 text-paper/30" />}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setRejectModalFor(req.id)}
              disabled={actionLoading === req.id}
              className="px-4 py-2.5 bg-danger/10 text-danger border border-danger/20 rounded-xl font-bold text-[12px] hover:bg-danger/20 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => handleApprove(req.id)}
              disabled={actionLoading === req.id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-paper rounded-xl font-bold text-[12px] hover:bg-gold-dark transition-colors disabled:opacity-50"
            >
              {actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve Lawyer
            </button>
          </div>
        </div>
      ))}

      {rejectModalFor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate/20 border border-white/10 rounded-2xl p-6 max-w-sm w-full" style={font}>
            <h3 className="text-[16px] font-black text-paper mb-3">Reject Lawyer Application</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. NBA number could not be verified, certificate is unclear..."
              className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-paper/25 outline-none focus:border-danger/40 transition-colors resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModalFor(null); setRejectReason(''); }}
                className="flex-1 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-paper/50 hover:text-paper transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || actionLoading === rejectModalFor}
                className="flex-1 py-2.5 bg-danger rounded-xl text-[13px] font-bold text-paper hover:bg-danger-dark transition-all disabled:opacity-40"
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
