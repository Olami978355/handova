import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, User } from 'lucide-react';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { Conversation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../hooks/useConversations';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversations, loading } = useConversations();
  const [searchParams, setSearchParams] = searchParamsHook();
  const conversationId = searchParams.get('id');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSearchParams({ id: conv.id });
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-gray-200">
          <User size={40} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view messages</h2>
        <p className="text-gray-500 mb-8 max-w-xs">You need to be logged in to access your conversations.</p>
        <button
          onClick={() => navigate('/login')}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-all shadow-lg shadow-[#1a6b3c]/20"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex overflow-hidden">
      {/* Mobile View Logic */}
      {isMobileView ? (
        <div className="flex-1 flex flex-col w-full h-full">
          {conversationId ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3 sticky top-0 z-20">
                <button
                  onClick={handleBackToList}
                  className="p-2 hover:bg-gray-50 rounded-full transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">
                    {selectedConversation?.participants?.[0]?.full_name || 'Chat'}
                  </h3>
                  <p className="text-[10px] text-[#1a6b3c] font-bold uppercase tracking-wider truncate">
                    {selectedConversation?.properties?.title || 'Property'}
                  </p>
                </div>
              </div>
              <ChatWindow
                conversationId={conversationId}
                otherParticipantName={selectedConversation?.participants?.[0]?.full_name}
              />
            </div>
          ) : (
            <ChatList
              onSelect={handleSelectConversation}
              selectedId={conversationId || undefined}
            />
          )}
        </div>
      ) : (
        /* Desktop View */
        <div className="flex-1 flex h-full max-w-7xl mx-auto w-full bg-white shadow-2xl shadow-gray-200/50 my-4 rounded-3xl overflow-hidden border border-gray-100">
          <div className="w-[40%] border-r border-gray-100">
            <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-400 mt-1">Manage your property conversations</p>
            </div>
            <ChatList
              onSelect={handleSelectConversation}
              selectedId={conversationId || undefined}
            />
          </div>
          <div className="flex-1 flex flex-col bg-gray-50/30">
            {conversationId ? (
              <ChatWindow
                conversationId={conversationId}
                otherParticipantName={selectedConversation?.participants?.[0]?.full_name}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-gray-100">
                  <MessageSquare size={48} className="text-gray-200" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Inbox</h3>
                <p className="text-gray-400 max-w-xs">
                  Select a conversation from the left to view messages and manage your property deals.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to fix searchParams hook name in template
function searchParamsHook() {
  return useSearchParams();
}

export default MessagesPage;
