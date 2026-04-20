import React, { useEffect, useState } from 'react';
import { 
  History, 
  User, 
  Calendar, 
  Clock, 
  Search, 
  Filter,
  Loader2,
  AlertCircle,
  ArrowRight,
  Shield,
  Activity,
  X
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';

export default function AdminLogs() {
  const { logs, setLogs, loading, fetchLogs, isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term) {
      fetchLogs();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*, actor:actor_id (*)')
        .ilike('actor.full_name', `%${term}%`)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const filteredLogs = logs; // We use server-side search now

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-zinc-100 shadow-sm">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2">Access Restricted</h3>
        <p className="text-zinc-500 font-bold">Only administrators can view system logs.</p>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading system logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search by moderator or admin name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a6b3c]/20 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#1a6b3c]/10 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#1a6b3c]" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">System Activity</h3>
          </div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Showing last 100 actions</p>
        </div>

        <div className="divide-y divide-zinc-50">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-zinc-50 transition-colors flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                <History className="w-6 h-6" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    log.action.includes('approve') ? 'bg-emerald-50 text-emerald-600' :
                    log.action.includes('reject') ? 'bg-red-50 text-red-600' :
                    log.action.includes('moderate') ? 'bg-amber-50 text-amber-600' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-zinc-300">•</span>
                  <p className="text-sm font-bold text-zinc-900 truncate">
                    {log.actor?.full_name} <span className="text-zinc-400 font-medium">performed action on</span> {log.target_id || 'system'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(log.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="hidden md:block text-right shrink-0">
                <button 
                  onClick={() => {
                    setSelectedLog(log);
                    setShowModal(true);
                  }}
                  className="text-[#1a6b3c] hover:underline text-xs font-bold"
                >
                  Details
                </button>
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-zinc-400 font-bold">No logs found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
      <AnimatePresence>
        {showModal && selectedLog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-zinc-900">Log Details</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Actor</p>
                    <p className="font-bold text-zinc-900">{selectedLog.actor?.full_name}</p>
                    <p className="text-xs text-[#1a6b3c] font-bold uppercase tracking-wider">{selectedLog.actor?.role}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Timestamp</p>
                    <p className="font-bold text-zinc-900">
                      {new Date(selectedLog.created_at).toLocaleString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Action</p>
                    <p className="font-bold text-zinc-900 capitalize">{selectedLog.action.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Target ID</p>
                    <p className="font-mono text-xs text-zinc-500">{selectedLog.target_id || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Parameters Logged</p>
                  <div className="bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-zinc-200">
                        {Object.entries(selectedLog.details).map(([key, value]) => (
                          <tr key={key}>
                            <td className="px-4 py-3 font-bold text-zinc-600 bg-zinc-100/50 w-1/3 capitalize">{key.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 text-zinc-900 font-medium">{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
