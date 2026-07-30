import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, User, Phone, MoreVertical, Flag, Ban, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Conversation } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useConversationsContext } from '../context/ConversationsContext';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, loading } = useConversationsContext();

  const conversationId = searchParams.get('id');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const otherId = selectedConversation?.participants?.[0]?.id;

  const handleBlock = async () => {
    if (!otherId || !user) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('block_user', { p_blocked_id: otherId });
      if (error) throw error;
      alert('User blocked.');
      setShowChatMenu(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to block user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!otherId || !user || !reportReason.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('report_user', { p_reported_id: otherId, p_reason: reportReason });
      if (error) throw new Error(error.message);
      alert('Report submitted. Our team will review it.');
      setShowReportModal(false);
      setShowChatMenu(false);
      setReportReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setActionLoading(false);
    }
  };
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) setSelectedConversation(conv);
    }
  }, [conversationId, conversations]);

  const handleSelect = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSearchParams({ id: conv.id });
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

 
 const urlPropertyId = searchParams.get('property') || undefined;
const urlRecipientId = searchParams.get('recipient') || undefined;
// ✅ Use conversationId from URL directly, not from selectedConversation
const chatWindowProps = {
  conversationId: conversationId || undefined,
  otherParticipantName: selectedConversation?.participants?.[0]?.full_name,
  propertyId: selectedConversation?.property_id || urlPropertyId,
  otherParticipantId: selectedConversation?.participants?.[0]?.id || urlRecipientId,
};

  if (!user) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-5 text-center"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="w-14 h-14 bg-[#0a1f11] border border-white/6 rounded-2xl flex items-center justify-center mb-5">
          <User className="w-7 h-7 text-white/20" />
        </div>
        <h2 className="text-[20px] font-bold text-white mb-2">Sign in to view messages</h2>
        <p className="text-[13px] text-white/40 mb-6 max-w-xs">
          You need to be logged in to access your conversations.
        </p>
        <Link
          to="/login"
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-xl font-semibold text-[14px] hover:bg-[#0f4a2a] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div
      className="h-[calc(100vh-64px)] bg-[#0a0a0a] flex overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {isMobile ? (
        <div className="flex-1 flex flex-col w-full h-full">
          {conversationId ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Mobile chat header */}
              <div className="px-4 py-3 bg-[#0a1f11] border-b border-white/5 flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleBack}
                  className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-bold text-white truncate flex items-center gap-1">
                    <Link to={selectedConversation?.participants?.[0]?.username ? `/u/${selectedConversation.participants[0].username}` : '#'} onClick={(e) => { if (!selectedConversation?.participants?.[0]?.username) e.preventDefault(); }} className="truncate hover:underline">{selectedConversation?.participants?.[0]?.full_name || 'Chat'}</Link>
                    <VerifiedBadge status={selectedConversation?.participants?.[0]?.verification_status} size={13} />
                  </h3>
                  <p className="text-[11px] text-[#1a6b3c] font-medium truncate">
                    {selectedConversation?.properties?.title || 'Property'}
                  </p>
                </div>
                {selectedConversation?.participants?.[0]?.phone && (
                  
                    <a
                    href={`tel:${selectedConversation.participants[0].phone}`}
                    className="w-8 h-8 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center text-[#1a6b3c] hover:bg-[#1a6b3c]/25 transition-colors flex-shrink-0"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0 relative"
                >
                  <MoreVertical className="w-4 h-4" />
                  {showChatMenu && (
                    <div onClick={(e) => e.stopPropagation()} className="absolute top-9 right-0 w-44 bg-[#0a1f11] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                      <button onClick={handleBlock} disabled={actionLoading} className="w-full flex items-center gap-2 px-4 py-3 text-[12px] text-white/70 hover:bg-white/5 transition-colors text-left">
                        <Ban className="w-3.5 h-3.5" /> Block user
                      </button>
                      <button onClick={() => { setShowReportModal(true); setShowChatMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors text-left">
                        <Flag className="w-3.5 h-3.5" /> Report user
                      </button>
                    </div>
                  )}
                </button>
              </div>
              <ChatWindow {...chatWindowProps} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="px-5 py-4 bg-[#0a1f11] border-b border-white/5 flex-shrink-0">
                <h2 className="text-[18px] font-bold text-white">Messages</h2>
                <p className="text-[12px] text-white/35 mt-0.5">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ChatList onSelect={handleSelect} selectedId={conversationId || undefined} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex h-full max-w-7xl mx-auto w-full my-4 px-5 gap-4 overflow-hidden">

          {/* Left panel */}
          <div className="w-80 flex-shrink-0 flex flex-col bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex-shrink-0">
              <h2 className="text-[16px] font-bold text-white">Messages</h2>
              <p className="text-[12px] text-white/35 mt-0.5">
                {loading
                  ? 'Loading...'
                  : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatList onSelect={handleSelect} selectedId={conversationId || undefined} />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
            {conversationId ? (
              <>
                {/* Desktop chat header */}
                <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
                  <div className="w-8 h-8 bg-[#1a6b3c] rounded-xl flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                    {(selectedConversation?.participants?.[0]?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-bold text-white truncate flex items-center gap-1">
                      <Link to={selectedConversation?.participants?.[0]?.username ? `/u/${selectedConversation.participants[0].username}` : '#'} onClick={(e) => { if (!selectedConversation?.participants?.[0]?.username) e.preventDefault(); }} className="truncate hover:underline">{selectedConversation?.participants?.[0]?.full_name || 'Chat'}</Link>
                      <VerifiedBadge status={selectedConversation?.participants?.[0]?.verification_status} size={13} />
                    </h3>
                    <p className="text-[11px] text-[#1a6b3c] font-medium truncate">
                      {selectedConversation?.properties?.title || 'Property'}
                    </p>
                  </div>
                  {selectedConversation?.participants?.[0]?.phone && (
                    
                    <a
                      href={`tel:${selectedConversation.participants[0].phone}`}
                      className="w-8 h-8 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center text-[#1a6b3c] hover:bg-[#1a6b3c]/25 transition-colors flex-shrink-0"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0 relative"
                  >
                    <MoreVertical className="w-4 h-4" />
                    {showChatMenu && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute top-9 right-0 w-44 bg-[#0a1f11] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                        <button onClick={handleBlock} disabled={actionLoading} className="w-full flex items-center gap-2 px-4 py-3 text-[12px] text-white/70 hover:bg-white/5 transition-colors text-left">
                          <Ban className="w-3.5 h-3.5" /> Block user
                        </button>
                        <button onClick={() => { setShowReportModal(true); setShowChatMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors text-left">
                          <Flag className="w-3.5 h-3.5" /> Report user
                        </button>
                      </div>
                    )}
                  </button>
                </div>
                <ChatWindow {...chatWindowProps} />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-14 h-14 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-white/15" />
                </div>
                <h3 className="text-[16px] font-bold text-white mb-2">Select a conversation</h3>
                <p className="text-[13px] text-white/35 max-w-xs">
                  Choose a conversation from the left to start messaging.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
      {showReportModal && (
        <>
          <div onClick={() => setShowReportModal(false)} className="fixed inset-0 bg-black/70 z-[100]" />
          <div className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-sm h-fit bg-[#0a1f11] border border-white/10 rounded-2xl z-[110] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-white">Report User</h3>
              <button onClick={() => setShowReportModal(false)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="What happened?"
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-red-500/40 transition-colors resize-none"
              />
              <button
                onClick={handleReport}
                disabled={!reportReason.trim() || actionLoading}
                className="w-full bg-red-500 text-white py-3 rounded-xl font-bold text-[13px] hover:bg-red-600 transition-all disabled:opacity-40"
              >
                {actionLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </>
      )}
}