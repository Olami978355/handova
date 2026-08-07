import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useConversationsContext } from '../../context/ConversationsContext';
import { useAuth } from '../../context/AuthContext';
import { Property } from '../../types';

interface ChatButtonProps {
  property: Property;
  buttonLabel?: string;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  property,
  buttonLabel,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { conversations } = useConversationsContext();
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isOwner = user?.id === property.owner_id;
  const isTenant = profile?.role === 'tenant';

  useEffect(() => {
    if (!user || isOwner) return;
    const existing = conversations.find(
      c => c.property_id === property.id &&
        c.participant_ids.includes(user.id)
    );
    setUnreadCount(existing?.unread_count || 0);
  }, [conversations, property.id, user, isOwner]);

  const handleMessage = async () => {
    if (!user) { navigate('/login'); return; }
    if (loading) return;
    setLoading(true);
    try {
      // Do NOT create conversation here
      // Just navigate to messages with property context
      // Conversation is only created when first message is sent
      const existing = conversations.find(
        c => c.property_id === property.id &&
          c.participant_ids.includes(user.id)
      );

      if (existing) {
        // Conversation already exists — go to it
        navigate(`/messages?id=${existing.id}`);
      } else {
        // No conversation yet — go to messages with property info
        // ChatWindow will create conversation on first message send
        navigate(
          `/messages?property=${property.id}&recipient=${property.owner_id}`
        );
      }
    } catch (err) {
      console.error('Failed to navigate to messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hide for owner, non-tenant, or unavailable property
  if (
    isOwner ||
    !isTenant ||
    property.is_rented
  ) {
    return null;
  }

  // Determine correct label
  const label = buttonLabel ||
    (profile?.role === 'agent' || profile?.role === 'landlord'
      ? 'Message Agent'
      : property.agent_id
      ? 'Message Agent'
      : 'Message Landlord');

  return (
    <button
      onClick={handleMessage}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-gold text-white py-3 px-6 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-all relative disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <MessageCircle className="w-5 h-5" />
          {label}
        </>
      )}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-gold text-black text-[9px] font-black rounded-full flex items-center justify-center">
          {unreadCount}
        </div>
      )}
    </button>
  );
};