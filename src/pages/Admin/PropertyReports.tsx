import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, Eye, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface PropertyReport {
  id: string;
  property_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  properties?: { title: string; status: string };
  reporter?: { full_name: string };
}

export default function PropertyReports() {
  const [reports, setReports] = useState<PropertyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('property_reports')
        .select('*, properties(title, status), reporter:profiles!reporter_id(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching property reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await supabase.from('property_reports').update({ status: 'dismissed' }).eq('id', id);
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
      await supabase.from('property_reports').update({ status: 'reviewed' }).eq('id', id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-paper/30">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={font}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[16px] font-black text-paper">Reported Listings</h3>
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
                  <h4 className="text-[13px] font-bold text-paper">{report.properties?.title || 'Unknown property'}</h4>
                  <p className="text-[11px] text-paper/30">
                    Reported by {report.reporter?.full_name || 'a user'} · {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <Link
                to={`/property/${report.property_id}`}
                target="_blank"
                className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors flex-shrink-0"
              >
                <Eye className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white/4 border border-white/5 rounded-xl p-3 mb-4">
              <p className="text-[11px] font-bold text-gold uppercase tracking-wider mb-1">{report.reason}</p>
              {report.details && <p className="text-[12px] text-paper/50">{report.details}</p>}
            </div>
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
                className="flex-1 flex items-center justify-center gap-2 bg-gold py-2.5 rounded-xl text-[12px] font-bold text-paper hover:bg-gold-dark transition-colors disabled:opacity-50"
              >
                {actionLoading === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Mark Reviewed
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
