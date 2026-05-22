import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useConversationsContext } from '../../context/ConversationsContext';
import { useAuth } from '../../context/AuthContext';
import { Property } from '../../types';

interface ChatButtonProps {
  property: Property;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ property }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { findOrCreateConversation, conversations } = useConversationsContext();
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isOwner = user?.id === property.owner_id;
  const isTenant = profile?.role === 'tenant';

  useEffect(() => {
    if (!user || isOwner) return;
    const conv = conversations.find(
      (c) => c.property_id === property.id && c.participant_ids.includes(user.id)
    );
    setUnreadCount(conv?.unread_count || 0);
  }, [conversations, property.id, user, isOwner]);

  const handleMessage = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      const conversationId = await findOrCreateConversation(
        property.id,
        user.id,
        property.owner_id
      );
      navigate(`/messages?id=${conversationId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isOwner || !isTenant || property.status === 'rented' || property.status === 'sold') {
    return null;
  }

  return (
    <button
      onClick={handleMessage}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-[#1a6b3c] text-white py-3 px-6 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-all relative disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <MessageCircle className="w-5 h-5" />
          Message {property.listing_type === 'land' ? 'Agent' : 'Landlord'}
        </>
      )}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#f0c040] text-black text-[9px] font-black rounded-full flex items-center justify-center">
          {unreadCount}
        </div>
      )}
    </button>
  );
};
