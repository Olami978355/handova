import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, User } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime } from '../../utils/format';

interface ChatWindowProps {
  conversationId?: string;
  otherParticipantName?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, otherParticipantName }) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, messagesEndRef } = useMessages(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <User size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a conversation</h3>
        <p className="max-w-xs">Select a conversation from the list to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a6b3c]/10 flex items-center justify-center text-[#1a6b3c] font-bold">
            {otherParticipantName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{otherParticipantName || 'User'}</h3>
            <p className="text-xs text-green-500 font-medium">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-[#1a6b3c] mb-2" />
            <p className="text-sm text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <Send size={32} />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">No messages yet</h4>
            <p className="text-sm text-gray-400">Say hello to start the conversation!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-[#1a6b3c] text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      {!isMe && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {msg.sender?.full_name || 'User'}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100 focus-within:border-[#1a6b3c] focus-within:ring-2 focus-within:ring-[#1a6b3c]/10 transition-all">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent border-none outline-none resize-none py-1 text-sm max-h-32"
              style={{ height: 'auto' }}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#1a6b3c] text-white flex items-center justify-center hover:bg-[#14522e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-lg shadow-[#1a6b3c]/20"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
        <p className="text-[10px] text-gray-400 mt-2 ml-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
