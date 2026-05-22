import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, XCircle, CheckCircle2, Eye,
  Loader2, AlertCircle, FileText, User,
  Calendar, ExternalLink, X
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function VerificationQueue() {
  const { pendingVerifications, loading, fetchPendingVerifications, approveVerification, rejectVerification } = useAdmin();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchPendingVerifications();
    const timer = setTimeout(() => {
      if (loading && pendingVerifications.length === 0) setError('Taking too long. Please refresh.');
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleApprove = async (requestId: string, userId: string) => {
    const result = await approveVerification(requestId, userId);
    if (result.success) { setSelectedRequest(null); setChecklist([false, false, false, false]); showToast('Verification approved', 'success'); }
    else showToast(result.error || 'Failed to approve', 'error');
  };

  const handleReject = async (requestId: string, userId: string) => {
    if (!rejectionNotes || rejectionNotes.length < 20) { showToast('Please provide a detailed reason (min 20 characters)', 'error'); return; }
    const result = await rejectVerification(requestId, userId, rejectionNotes);
    if (result.success) { setSelectedRequest(null); setIsRejecting(false); setRejectionNotes(''); setChecklist([false, false, false, false]); showToast('Verification rejected', 'success'); }
    else showToast(result.error || 'Failed to reject', 'error');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0a1f11] border border-white/6 rounded-2xl text-center" style={font}>
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h3 className="text-[16px] font-bold text-white mb-2">Failed to load queue</h3>
        <p className="text-[12px] text-white/35 mb-5">{error}</p>
        <button onClick={() => { setError(null); fetchPendingVerifications(); }} className="bg-[#1a6b3c] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (loading && pendingVerifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading verification queue...</p>
      </div>
    );
  }

  if (pendingVerifications.length === 0) {
    return (
      <div className="text-center py-20 bg-[#0a1f11] border border-white/6 rounded-2xl" style={font}>
        <div className="w-14 h-14 bg-[#1a6b3c]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-[#1a6b3c]" />
        </div>
        <h3 className="text-[16px] font-bold text-white mb-2">Queue is empty</h3>
        <p className="text-[12px] text-white/35 mb-5">All verifications have been processed.</p>
        <button onClick={() => fetchPendingVerifications()} className="bg-[#1a6b3c] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={font}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl text-[13px] font-bold shadow-xl ${
              toast.type === 'success' ? 'bg-[#1a6b3c] text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-white">Pending Requests ({pendingVerifications.length})</h3>
        <button onClick={() => fetchPendingVerifications()} className="flex items-center gap-1.5 text-[12px] font-bold text-[#1a6b3c] hover:text-white transition-colors">
          <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* List */}
        <div className="space-y-3">
          {pendingVerifications.map((request) => (
            <button
              key={request.id}
              onClick={() => { setSelectedRequest(request.id); setChecklist([false, false, false, false]); }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedRequest === request.id
                  ? 'bg-[#1a6b3c] border-[#1a6b3c]'
                  : 'bg-[#0a1f11] border-white/6 hover:border-white/12'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
                  {request.profiles?.avatar_url
                    ? <img src={request.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (request.profiles?.full_name || 'U').charAt(0).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-bold truncate ${selectedRequest === request.id ? 'text-white' : 'text-white'}`}>
                    {request.profiles?.full_name}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedRequest === request.id ? 'text-white/60' : 'text-[#1a6b3c]'}`}>
                    {request.profiles?.role}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider opacity-60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> NIN Provided
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedRequest ? (() => {
              const request = pendingVerifications.find(r => r.id === selectedRequest);
              if (!request) return null;
              return (
                <motion.div
                  key={selectedRequest}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#1a6b3c]/20 rounded-xl overflow-hidden flex items-center justify-center text-[#1a6b3c] font-bold text-[16px]">
                        {request.profiles?.avatar_url
                          ? <img src={request.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (request.profiles?.full_name || 'U').charAt(0).toUpperCase()
                        }
                      </div>
                      <div>
                        <h3 className="text-[16px] font-bold text-white">{request.profiles?.full_name}</h3>
                        <p className="text-[12px] text-white/40 flex items-center gap-1">
                          <User className="w-3 h-3" />{request.profiles?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setIsRejecting(true)}
                        className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-[12px] hover:bg-red-500/20 transition-colors">
                        Reject
                      </button>
                      <button onClick={() => handleApprove(request.id, request.user_id)}
                        className="px-4 py-2 bg-[#f0c040] text-black rounded-xl font-bold text-[12px] hover:bg-[#e0b030] transition-colors">
                        Approve
                      </button>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Identity */}
                    <div className="space-y-4">
                      <div className="bg-white/4 border border-white/5 rounded-xl p-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Identity Information</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[11px] text-white/30 mb-1">NIN (masked)</p>
                            <p className="text-[16px] font-black text-white tracking-widest font-mono">
                              {request.profiles_private?.nin
                                ? `${request.profiles_private.nin.slice(0, 3)}XXXXX${request.profiles_private.nin.slice(-3)}`
                                : 'Not Provided'}
                            </p>
                          </div>
                          {request.profiles?.lasrera_id && (
                            <div>
                              <p className="text-[11px] text-white/30 mb-1">LASRERA ID</p>
                              <p className="text-[14px] font-bold text-white">{request.profiles.lasrera_id}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NIN doc */}
                      {request.profiles_private?.nin_doc_url && (
                        <div>
                          <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">NIN Document</p>
                          <div className="rounded-xl overflow-hidden border border-white/8 bg-white/5 aspect-video relative group">
                            <img src={request.profiles_private.nin_doc_url} alt="NIN Document" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            <a href={request.profiles_private.nin_doc_url} target="_blank" rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-[12px] font-bold">
                              <ExternalLink className="w-4 h-4" /> View Full Size
                            </a>
                          </div>
                        </div>
                      )}

                      {request.profiles?.role === 'agent' && (
                        <div className="p-4 bg-[#f0c040]/6 border border-[#f0c040]/15 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="w-4 h-4 text-[#f0c040]" />
                            <span className="text-[12px] font-bold text-[#f0c040]">Agent Verification Required</span>
                          </div>
                          <p className="text-[11px] text-white/40">Verify Business Registration and LASRERA credentials before approving.</p>
                        </div>
                      )}
                    </div>

                    {/* Checklist */}
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Moderator Checklist</p>
                      <div className="space-y-2.5">
                        {[
                          'NIN matches the full name on profile',
                          'Document is clear and legible',
                          'Document is not expired',
                          'LASRERA ID verified (if applicable)',
                        ].map((item, i) => (
                          <label key={i} className="flex items-center gap-3 p-3.5 bg-white/4 border border-white/5 rounded-xl cursor-pointer hover:bg-white/6 transition-colors">
                            <input
                              type="checkbox"
                              checked={checklist[i]}
                              onChange={(e) => {
                                const updated = [...checklist];
                                updated[i] = e.target.checked;
                                setChecklist(updated);
                              }}
                              className="accent-[#1a6b3c] w-4 h-4 flex-shrink-0"
                            />
                            <span className="text-[12px] font-semibold text-white/65">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rejection modal */}
                  <AnimatePresence>
                    {isRejecting && (
                      <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          onClick={() => setIsRejecting(false)}
                          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] p-6 shadow-2xl" style={font}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              </div>
                              <h3 className="text-[15px] font-bold text-white">Reject Verification</h3>
                            </div>
                            <button onClick={() => setIsRejecting(false)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[12px] text-white/40 mb-4">Provide a clear reason so the user can resubmit correctly.</p>
                          <textarea
                            value={rejectionNotes}
                            onChange={(e) => setRejectionNotes(e.target.value)}
                            placeholder="e.g. Blurry document, name mismatch, expired ID..."
                            className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-red-500/40 resize-none mb-4 transition-colors"
                          />
                          <p className="text-[10px] text-white/25 mb-4">{rejectionNotes.length}/20 minimum characters</p>
                          <div className="flex gap-3">
                            <button onClick={() => setIsRejecting(false)} className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors">
                              Cancel
                            </button>
                            <button onClick={() => handleReject(request.id, request.user_id)} disabled={!rejectionNotes || rejectionNotes.length < 20}
                              className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-red-600 transition-colors disabled:opacity-40">
                              Confirm Rejection
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })() : (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-[#0a1f11] border border-white/6 border-dashed rounded-2xl">
                <Eye className="w-10 h-10 text-white/10 mb-3" />
                <p className="text-[13px] font-semibold text-white/25">Select a request to review</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}