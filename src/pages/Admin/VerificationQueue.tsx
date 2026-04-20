import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  Eye, 
  Loader2, 
  AlertCircle,
  FileText,
  User,
  Calendar,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';

export default function VerificationQueue() {
  const { 
    pendingVerifications, 
    loading, 
    fetchPendingVerifications, 
    approveVerification, 
    rejectVerification 
  } = useAdmin();
  
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && pendingVerifications.length === 0) {
        setError('Taking too long. Please refresh.');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading, pendingVerifications.length]);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const handleApprove = async (requestId: string, userId: string) => {
    const result = await approveVerification(requestId, userId);
    if (result.success) {
      setSelectedRequest(null);
      showToast('Verification approved successfully', 'success');
    } else {
      showToast(result.error || 'Failed to approve verification', 'error');
    }
  };

  const handleReject = async (requestId: string, userId: string) => {
    if (!rejectionNotes || rejectionNotes.length < 20) {
      showToast('Please provide a detailed reason (at least 20 characters)', 'error');
      return;
    }
    const result = await rejectVerification(requestId, userId, rejectionNotes);
    if (result.success) {
      setSelectedRequest(null);
      setIsRejecting(false);
      setRejectionNotes('');
      showToast('Verification rejected', 'success');
    } else {
      showToast(result.error || 'Failed to reject verification', 'error');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-zinc-100 shadow-sm text-center px-6">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Failed to load queue</h3>
        <p className="text-zinc-500 mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => { setError(null); fetchPendingVerifications(); }}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors shadow-lg shadow-[#1a6b3c]/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading && pendingVerifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading verification queue...</p>
      </div>
    );
  }

  if (pendingVerifications.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[40px] border border-zinc-100 shadow-sm">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-2">No pending verifications</h3>
        <p className="text-zinc-500 font-bold mb-6">All pending verifications have been processed.</p>
        <button 
          onClick={() => fetchPendingVerifications()}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors shadow-lg shadow-[#1a6b3c]/20"
        >
          Refresh Queue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast UI fixed at bottom right */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className={`fixed bottom-4 right-4 z-50 px-6 py-3 
              rounded-lg text-white font-medium shadow-lg
              ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Pending Requests ({pendingVerifications.length})</h3>
        <button 
          onClick={() => fetchPendingVerifications()}
          className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-[#1a6b3c] font-bold text-xs flex items-center gap-2"
        >
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request List */}
        <div className="lg:col-span-1 space-y-4">
          {pendingVerifications.map((request) => (
            <button
              key={request.id}
              onClick={() => setSelectedRequest(request.id)}
              className={`w-full text-left p-6 rounded-3xl border transition-all ${
                selectedRequest === request.id 
                  ? 'bg-[#1a6b3c] border-[#1a6b3c] text-white shadow-xl shadow-[#1a6b3c]/20' 
                  : 'bg-white border-zinc-100 text-zinc-900 hover:border-[#1a6b3c]/20'
              }`}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 overflow-hidden border-2 border-white shadow-sm">
                  <img src={request.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${request.profiles?.full_name}`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedRequest === request.id ? 'text-white' : 'text-zinc-900'}`}>{request.profiles?.full_name}</p>
                  <p className={`text-xs font-bold uppercase tracking-wider ${selectedRequest === request.id ? 'text-white/70' : 'text-[#1a6b3c]'}`}>{request.profiles?.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-70">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  NIN Provided
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Request Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedRequest ? (
              <motion.div
                key={selectedRequest}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden"
              >
                {(() => {
                  const request = pendingVerifications.find(r => r.id === selectedRequest);
                  if (!request) return null;

                  return (
                    <div className="p-10">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center space-x-6">
                          <div className="w-20 h-20 rounded-3xl bg-zinc-100 overflow-hidden border-4 border-white shadow-lg">
                            <img src={request.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${request.profiles?.full_name}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-zinc-900 mb-1">{request.profiles?.full_name}</h3>
                            <p className="text-zinc-500 font-bold flex items-center">
                              <User className="w-4 h-4 mr-2" /> {request.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => setIsRejecting(true)}
                            className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(request.id, request.user_id)}
                            className="px-6 py-3 bg-[#1a6b3c] text-white rounded-2xl font-bold text-sm hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20"
                          >
                            Approve Verification
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <div>
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Identity Information</h4>
                            <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs font-bold text-zinc-400 mb-1">National Identity Number (NIN)</p>
                                  <p className="text-lg font-black text-zinc-900 tracking-widest">
                                    {request.profiles_private?.nin 
                                      ? `${request.profiles_private.nin.slice(0, 3)}XXXXXX${request.profiles_private.nin.slice(-3)}`
                                      : 'Not Provided'}
                                  </p>
                                </div>
                                {request.profiles?.lasrera_id && (
                                  <div>
                                    <p className="text-xs font-bold text-zinc-400 mb-1">LASRERA ID</p>
                                    <p className="text-lg font-black text-zinc-900">{request.profiles.lasrera_id}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Verification Documents</h4>
                            <div className="grid grid-cols-1 gap-4">
                              {request.profiles_private?.nin_doc_url && (
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-zinc-400">NIN Document</p>
                                  <div className="rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50 aspect-video relative group">
                                    <img 
                                      src={request.profiles_private.nin_doc_url} 
                                      alt="NIN Document" 
                                      className="w-full h-full object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                    <a 
                                      href={request.profiles_private.nin_doc_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2"
                                    >
                                      <ExternalLink className="w-5 h-5" /> View Full Size
                                    </a>
                                  </div>
                                </div>
                              )}
                              
                              {request.profiles?.role === 'agent' && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                  <div className="flex items-center gap-3 text-blue-700 mb-2">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="font-bold text-sm">Agent Verification Required</span>
                                  </div>
                                  <p className="text-xs text-blue-600 font-medium">
                                    Verify Business Registration and LASRERA credentials before approving.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div>
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Moderator Checklist</h4>
                            <div className="space-y-3">
                              {[
                                'NIN matches the full name on profile',
                                'Document is clear and legible',
                                'Document is not expired',
                                'LASRERA ID verified (if applicable)'
                              ].map((item, i) => (
                                <label key={i} className="flex items-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-all">
                                  <input type="checkbox" className="w-5 h-5 rounded-lg border-zinc-300 text-[#1a6b3c] focus:ring-[#1a6b3c]/20" />
                                  <span className="ml-4 text-sm font-bold text-zinc-700">{item}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rejection Modal */}
                      <AnimatePresence>
                        {isRejecting && (
                          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl"
                            >
                              <div className="flex items-center space-x-4 mb-8">
                                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                                  <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-black text-zinc-900">Reject Verification</h3>
                              </div>
                              
                              <div className="mb-8">
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Reason for Rejection</label>
                                <textarea 
                                  value={rejectionNotes}
                                  onChange={(e) => setRejectionNotes(e.target.value)}
                                  placeholder="Explain why the verification was rejected (e.g., blurry document, name mismatch)..."
                                  className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-3xl outline-none focus:ring-2 focus:ring-red-500/20 min-h-[150px] text-sm font-bold"
                                />
                              </div>

                              <div className="flex gap-4">
                                <button 
                                  onClick={() => setIsRejecting(false)}
                                  className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleReject(request.id, request.user_id)}
                                  disabled={!rejectionNotes || rejectionNotes.length < 20}
                                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Confirm Rejection
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-zinc-100 border-dashed">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                  <Eye className="w-10 h-10 text-zinc-200" />
                </div>
                <h3 className="text-xl font-bold text-zinc-400">Select a request to review</h3>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
