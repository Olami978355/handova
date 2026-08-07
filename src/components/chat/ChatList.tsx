import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Home, Trash2 } from 'lucide-react';
import { useConversationsContext } from '../../context/ConversationsContext';
import { VerifiedBadge } from '../VerifiedBadge';
import { formatRelativeTime } from '../../utils/format';
import { Conversation } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ChatListProps {
  onSelect: (conversation: Conversation) => void;
  selectedId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelect, selectedId }) => {
  const navigate = useNavigate();
  const { conversations, loading, refresh } = useConversationsContext();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLongPressStart = (conv: Conversation) => {
    longPressTimer.current = setTimeout(() => {
      setDeleteTarget(conv);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('messages').delete().eq('conversation_id', deleteTarget.id);
      await supabase.from('conversations').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = conversations
    .filter(conv => !!conv.last_message) // hide ghost conversations with no messages
    .filter(conv => {
      const title = conv.properties?.title?.toLowerCase() || '';
      const name = conv.participants?.[0]?.full_name?.toLowerCase() || '';
      const q = search.toLowerCase();
      return title.includes(q) || name.includes(q);
    })
    .sort((a, b) =>
      new Date(b.last_message_at || b.created_at).getTime() -
      new Date(a.last_message_at || a.created_at).getTime()
    );

  const handleSelect = async (conv: Conversation) => {
    onSelect(conv);
    if (conv.unread_count && conv.unread_count > 0 && user) {
      try {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .eq('read', false);
        refresh();
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border-b border-white/5">
            <div className="w-12 h-12 bg-white/5 rounded-xl animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
              <div className="h-2.5 bg-white/5 rounded animate-pulse w-1/2" />
              <div className="h-2.5 bg-white/5 rounded animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Search */}
      <div className="p-3 border-b border-white/5 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/6 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-gold/50 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="w-12 h-12 bg-white/4 rounded-2xl flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-white/15" />
            </div>
            <p className="text-[13px] font-semibold text-white/30 mb-1">
              No conversations
            </p>
            <p className="text-[11px] text-white/20 mb-3">
              {search ? 'No results found.' : 'Start from a property page.'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/listings')}
                className="text-[12px] font-semibold text-gold hover:text-[#e0b030] transition-colors"
              >
                Browse Properties
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {filtered.map(conv => {
              const other = conv.participants?.[0];
              const prop = conv.properties;
              const isSelected = selectedId === conv.id;
              // Only show badge when count is a real number > 0
              const unreadCount = conv.unread_count && conv.unread_count > 0
                ? conv.unread_count
                : null;
              const hasUnread = unreadCount !== null && !isSelected;

              return (
                <div key={conv.id} className="relative">
                <button
                  onClick={() => handleSelect(conv)}
                  onMouseDown={() => handleLongPressStart(conv)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(conv)}
                  onTouchEnd={handleLongPressEnd}
                  className={`w-full px-4 py-3.5 flex items-start gap-3 text-left transition-colors relative ${
                    isSelected
                      ? 'bg-gold/15 border-l-2 border-gold'
                      : 'hover:bg-white/4'
                  }`}
                >
                  {/* Property image */}
                  <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/6">
                    {prop?.images?.[0] ? (
                      <img
                        src={prop.images[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Home className="w-5 h-5 text-white/20" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className={`text-[13px] truncate ${
                          hasUnread
                            ? 'font-bold text-white'
                            : 'font-semibold text-white/70'
                        }`}>
                          {other?.full_name || 'User'}
                        </span>
                        <VerifiedBadge status={other?.verification_status} size={12} />
                      </span>
                      <span className="text-[10px] text-white/25 whitespace-nowrap ml-2 flex-shrink-0">
                        {formatRelativeTime(conv.last_message_at || conv.created_at)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gold font-bold uppercase tracking-wider mb-0.5 truncate">
                      {prop?.title || 'Property'}
                    </p>
                    <p className={`text-[11px] truncate ${
                      hasUnread
                        ? 'text-white/60 font-medium'
                        : 'text-white/30'
                    }`}>
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread badge — only show when count > 0 and not selected */}
                  {hasUnread && (
                    <div className="absolute top-3.5 right-3.5 w-5 h-5 bg-gold text-black text-[9px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                      {unreadCount! > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div className="bg-ink border border-white/10 rounded-2xl p-6 max-w-xs w-full">
            <div className="w-11 h-11 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-[15px] font-black text-white mb-1">Delete Conversation?</h3>
            <p className="text-[12px] text-white/60 mb-1">
              With <span className="font-bold text-white">{deleteTarget.participants?.[0]?.full_name || 'this user'}</span>
              {deleteTarget.properties?.title ? <> · <span className="text-gold font-semibold">{deleteTarget.properties.title}</span></> : null}
            </p>
            <p className="text-[12px] text-white/40 mb-5">This will permanently delete all messages in this conversation.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-white/50 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500/80 rounded-xl text-[13px] font-bold text-white hover:bg-red-500 transition-all disabled:opacity-40"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};