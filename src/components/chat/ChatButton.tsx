import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../context/AuthContext';
import { Property } from '../../types';
import { supabase } from '../../lib/supabase';

interface ChatButtonProps {
  property: Property;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ property }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { findOrCreateConversation, conversations } = useConversations();
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isOwner = user?.id === property.owner_id;
  const isTenant = user?.role === 'tenant';

  useEffect(() => {
    if (!user || isOwner) return;

    // Find if a conversation already exists for this property
    const conversation = conversations.find(
      (c) => c.property_id === property.id && c.participant_ids.includes(user.id)
    );

    if (conversation) {
      setUnreadCount(conversation.unread_count || 0);
    }
  }, [conversations, property.id, user, isOwner]);

  const handleMessage = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const conversationId = await findOrCreateConversation(
        property.id,
        user.id,
        property.owner_id
      );
      navigate(`/messages?id=${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isOwner || !isTenant || property.status === 'rented' || property.status === 'sold') return null;

  return (
    <button
      onClick={handleMessage}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-[#1a6b3c] text-white py-3 px-6 rounded-2xl font-bold hover:bg-[#14522e] transition-all relative shadow-lg shadow-[#1a6b3c]/20 group"
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <>
          <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
          <span>Message {property.category === 'land' ? 'Agent' : 'Landlord'}</span>
        </>
      )}

      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
          {unreadCount}
        </div>
      )}
    </button>
  );
};
