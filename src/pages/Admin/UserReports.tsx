import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, MessageSquare, XCircle, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';
import { format } from 'date-fns';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const REASON_LABELS: Record<string, string> = {
  requested_off_platform_payment: 'Asked for payment outside Handova',
  harassment: 'Harassment',
  scam_or_fraud: 'Scam or fraud',
  other: 'Other',
};

interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  conversation_id: string | null;
  deal_id: string | null;
  status: string;
  created_at: string;
  reporter?: { full_name: string };
  reported?: { full_name: string; account_status?: string };
}

export default function UserReports() {
  const { suspendUser } = useAdmin();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [suspendPromptId, setSuspendPromptId] = useState<string | null>(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*, reporter:profiles!reporter_id(full_name), reported:profiles!reported_id(full_name, account_status)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching user reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await supabase.from('user_reports').update({ status: 'dismissed' }).eq('id', id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReviewed = async (id: string) => {
    setActionLoading(id);
    try {
      await supabase.from('user_reports').update({ status: 'reviewed' }).eq('id', id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
      setSuspendPromptId(null);
    }
  };

  const handleReviewAndSuspend = async (report: UserReport) => {
    setActionLoading(report.id);
    try {
      const result = await suspendUser(report.reported_id, `Report: ${REASON_LABELS[report.reason] || report.reason}${report.details ? ` — ${report.details}` : ''}`);
      if (!result.success) throw new Error(result.error || 'Failed to suspend user');
      await supabase.from('user_reports').update({ status: 'reviewed' }).eq('id', report.id);
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setActionLoading(null);
      setSuspendPromptId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-paper/30">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={font}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[16px] font-black text-paper">Reported Users</h3>
          <p className="text-[12px] text-paper/30 mt-0.5">{reports.length} pending report{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
          reports.length > 0 ? 'bg-danger/10 text-danger border-danger/20' : 'bg-gold/10 text-gold border-gold/20'
        }`}>
          {reports.length} Pending
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="bg-slate/20 border border-white/6 rounded-2xl p-12 text-center">
          <CheckCircle className="w-10 h-10 text-gold mx-auto mb-4" />
          <p className="text-[15px] font-bold text-paper">No pending reports</p>
        </div>
      ) : (
        reports.map((report) => (
          <div key={report.id} className="bg-slate/20 border border-white/6 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-danger/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-paper">
                    {report.reported?.full_name || 'Unknown user'}
                    {report.reported?.account_status === 'suspended' && (
                      <span className="ml-2 text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-lg align-middle">Already suspended</span>
                    )}
                  </h4>
                  <p className="text-[11px] text-paper/30">
                    Reported by {report.reporter?.full_name || 'a user'} · {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              {report.conversation_id && (
                <Link
                  to={`/messages?id=${report.conversation_id}`}
                  target="_blank"
                  className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors flex-shrink-0"
                >
                  <MessageSquare className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="bg-white/4 border border-white/5 rounded-xl p-3 mb-4">
              <p className="text-[11px] font-bold text-gold uppercase tracking-wider mb-1">
                {REASON_LABELS[report.reason] || report.reason}
              </p>
              {report.details && <p className="text-[12px] text-paper/50">{report.details}</p>}
            </div>

            {suspendPromptId === report.id ? (
              <div className="bg-danger/8 border border-danger/20 rounded-xl p-3 mb-3">
                <p className="text-[12px] text-paper/70 mb-3">Suspend this user's account? This also marks the report reviewed.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSuspendPromptId(null)}
                    disabled={actionLoading === report.id}
                    className="flex-1 py-2 rounded-lg text-[12px] font-bold text-paper/50 bg-white/5 hover:text-paper transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReviewAndSuspend(report)}
                    disabled={actionLoading === report.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold text-paper bg-danger hover:bg-danger-dark transition-colors disabled:opacity-50"
                  >
                    {actionLoading === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                    Confirm Suspend
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleDismiss(report.id)}
                  disabled={actionLoading === report.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/8 py-2.5 rounded-xl text-[12px] font-bold text-paper/50 hover:text-paper transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Dismiss
                </button>
                <button
                  onClick={() => handleMarkReviewed(report.id)}
                  disabled={actionLoading === report.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/8 py-2.5 rounded-xl text-[12px] font-bold text-paper/50 hover:text-paper transition-colors disabled:opacity-50"
                >
                  {actionLoading === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Mark Reviewed
                </button>
                {report.reported?.account_status !== 'suspended' && (
                  <button
                    onClick={() => setSuspendPromptId(report.id)}
                    disabled={actionLoading === report.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-danger py-2.5 rounded-xl text-[12px] font-bold text-paper hover:bg-danger-dark transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Suspend
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
