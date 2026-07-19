import React, { useEffect, useState } from 'react';
import { History, Calendar, Clock, Search, Loader2, Shield, Activity, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { AdminLog } from '../../types';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function AdminLogs() {
  const { logs, setLogs, loading, fetchLogs, isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  useEffect(() => { fetchLogs(); }, []);

  const applyFilters = (overrides?: { search?: string; dateFrom?: string; dateTo?: string }) => {
    fetchLogs({
      search: overrides?.search ?? searchTerm,
      dateFrom: overrides?.dateFrom ?? dateFrom,
      dateTo: overrides?.dateTo ?? dateTo,
    });
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters({ search: term });
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    applyFilters({ dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    applyFilters({ dateTo: value });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    fetchLogs();
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0a1f11] border border-white/6 rounded-2xl text-center" style={font}>
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-red-400" />
        </div>
        <h3 className="text-[16px] font-bold text-white mb-2">Access Restricted</h3>
        <p className="text-[13px] text-white/35">Only administrators can view system logs.</p>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading system logs...</p>
      </div>
    );
  }

  const actionColor = (action: string) => {
    if (action.includes('approve')) return 'bg-[#1a6b3c]/15 text-[#1a6b3c]';
    if (action.includes('reject')) return 'bg-red-500/15 text-red-400';
    if (action.includes('suspend') || action.includes('flag')) return 'bg-[#f0c040]/15 text-[#f0c040]';
    return 'bg-white/5 text-white/40';
  };

  return (
    <div className="space-y-5" style={font}>
      {/* Search + filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by action or target ID..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/50 transition-colors"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => handleDateFromChange(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#1a6b3c]/50 transition-colors"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => handleDateToChange(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#1a6b3c]/50 transition-colors"
        />
        {(searchTerm || dateFrom || dateTo) && (
          <button
            onClick={clearFilters}
            className="px-4 py-3 bg-white/5 text-white/40 rounded-xl text-[13px] font-semibold hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-[#1a6b3c]" />
            <h3 className="text-[14px] font-bold text-white">System Activity</h3>
          </div>
          <span className="text-[11px] text-white/25">Last 100 actions</span>
        </div>

        <div className="divide-y divide-white/4">
          {logs.map((log) => (
            <div key={log.id} className="px-5 py-4 hover:bg-white/4 transition-colors flex items-center gap-4">
              <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                <History className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${actionColor(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[12px] text-white/50 truncate">
                    by <span className="font-semibold text-white/70">{log.actor?.full_name || 'System'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/25">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(log.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(log)}
                className="text-[11px] font-bold text-[#f0c040]/50 hover:text-[#f0c040] transition-colors flex-shrink-0"
              >
                Details
              </button>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center py-12 text-[13px] text-white/25">No logs found.</p>
          )}
        </div>
      </div>

      {/* Log detail modal */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto w-full max-w-lg h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
              style={font}
            >
              <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-white">Log Details</h3>
                <button onClick={() => setSelectedLog(null)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Actor', value: selectedLog.actor?.full_name || 'System', sub: selectedLog.actor?.role },
                    { label: 'Timestamp', value: new Date(selectedLog.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                    { label: 'Action', value: selectedLog.action.replace(/_/g, ' ') },
                    { label: 'Target ID', value: selectedLog.target_id ? selectedLog.target_id.slice(0, 16) + '...' : 'N/A' },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-white/4 rounded-xl">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-[13px] font-bold text-white capitalize">{item.value}</p>
                      {item.sub && <p className="text-[10px] text-[#f0c040] font-bold uppercase">{item.sub}</p>}
                    </div>
                  ))}
                </div>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Details</p>
                    <div className="bg-white/4 rounded-xl overflow-hidden divide-y divide-white/5">
                      {Object.entries(selectedLog.details).map(([key, value]) => (
                        <div key={key} className="flex items-center px-4 py-2.5">
                          <span className="text-[11px] font-bold text-white/40 capitalize w-1/3">{key.replace(/_/g, ' ')}</span>
                          <span className="text-[11px] text-white/70 flex-1">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-white/5">
                <button onClick={() => setSelectedLog(null)} className="w-full py-3 bg-white/5 text-white/60 rounded-xl font-bold text-[13px] hover:bg-white/8 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}