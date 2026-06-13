import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, User } from 'lucide-react';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Conversation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useConversationsContext } from '../context/ConversationsContext';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { conversations, loading } = useConversationsContext();

  const conversationId = searchParams.get('id');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
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
                  <h3 className="text-[14px] font-bold text-white truncate">
                    {selectedConversation?.participants?.[0]?.full_name || 'Chat'}
                  </h3>
                  <p className="text-[11px] text-[#1a6b3c] font-medium truncate">
                    {selectedConversation?.properties?.title || 'Property'}
                  </p>
                </div>
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
                    <h3 className="text-[14px] font-bold text-white truncate">
                      {selectedConversation?.participants?.[0]?.full_name || 'Chat'}
                    </h3>
                    <p className="text-[11px] text-[#1a6b3c] font-medium truncate">
                      {selectedConversation?.properties?.title || 'Property'}
                    </p>
                  </div>
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
}