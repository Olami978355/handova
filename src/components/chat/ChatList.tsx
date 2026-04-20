import React, { useState } from 'react';
import { Search, MessageSquare, Loader2, Home } from 'lucide-react';
import { useConversations } from '../../hooks/useConversations';
import { formatRelativeTime } from '../../utils/format';
import { Conversation } from '../../types';

interface ChatListProps {
  onSelect: (conversation: Conversation) => void;
  selectedId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelect, selectedId }) => {
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState('');

  const filteredConversations = conversations
    .filter((conv) => {
      const propertyTitle = conv.properties?.title?.toLowerCase() || '';
      const otherPartyName = conv.participants?.[0]?.full_name?.toLowerCase() || '';
      return propertyTitle.includes(search.toLowerCase()) || otherPartyName.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const dateA = new Date(a.last_message_at || a.created_at).getTime();
      const dateB = new Date(b.last_message_at || b.created_at).getTime();
      return dateB - dateA;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white h-full">
        <Loader2 className="animate-spin text-[#1a6b3c] mb-2" />
        <p className="text-sm text-gray-400">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-[#1a6b3c] transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] transition-all text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <MessageSquare size={32} />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">No conversations</h4>
            <p className="text-sm text-gray-400">
              {search ? 'No results found for your search.' : 'Start a conversation from a property page.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredConversations.map((conv) => {
              const otherParty = conv.participants?.[0];
              const property = conv.properties;
              const isSelected = selectedId === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={`w-full p-4 flex items-start gap-4 hover:bg-gray-50 transition-all text-left relative ${
                    isSelected ? 'bg-gray-50 border-l-4 border-[#1a6b3c]' : ''
                  }`}
                >
                  {/* Property Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                    {property?.images?.[0] ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Home className="text-gray-300" size={24} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-gray-900 truncate text-sm">
                        {otherParty?.full_name || 'User'}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                        {formatRelativeTime(conv.last_message_at || conv.created_at)}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#1a6b3c] font-bold uppercase tracking-wider mb-1 truncate">
                      {property?.title || 'Property'}
                    </p>
                    <p className="text-xs text-gray-500 truncate line-clamp-1">
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread Badge */}
                  {conv.unread_count && conv.unread_count > 0 ? (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-[#1a6b3c] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      {conv.unread_count}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
