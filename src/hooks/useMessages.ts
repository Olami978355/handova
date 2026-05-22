import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const markAsRead = useCallback(async (convId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .neq('sender_id', user.id)
        .eq('read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, avatar_url, role)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
      scrollToBottom();
      await markAsRead(conversationId);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, scrollToBottom, markAsRead]);

  // Keep a stable ref so realtime callback never causes re-subscription
  const fetchRef = useRef(fetchMessages);
  useEffect(() => { fetchRef.current = fetchMessages; }, [fetchMessages]);

  // Subscription — depends only on conversationId, not fetchMessages
  useEffect(() => {
    if (!conversationId || !user) return;

    fetchRef.current();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('id', newMsg.sender_id)
            .single();

          const enriched: Message = {
            ...newMsg,
            sender: senderProfile || undefined,
          };

          setMessages(prev => {
            const withoutOptimistic = prev.filter(m => !m.id.startsWith('temp-'));
            if (withoutOptimistic.some(m => m.id === newMsg.id)) return withoutOptimistic;
            return [...withoutOptimistic, enriched];
          });

          scrollToBottom();

          if (newMsg.sender_id !== user.id) {
            await supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Messages channel status: ${status} for ${conversationId}`);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user?.id]); // ← stable deps only

  const sendMessage = async (content: string): Promise<void> => {
    if (!conversationId || !user || !content.trim() || sending) return;

    setSending(true);
    setSendError(null);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      message_type: 'text',
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: 'You',
        email: '',
        role: 'tenant',
        verification_status: 'unverified',
        nin_verified: false,
        created_at: '',
        updated_at: '',
      },
    };

    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    try {
      const { data: sent, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
        })
        .select('*, sender:profiles(id, full_name, avatar_url, role)')
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw new Error(error.message);
      }

      // Replace optimistic with confirmed message
      setMessages(prev =>
        prev.map(m => m.id === tempId ? sent as Message : m)
      );

      // Update conversation preview
      await supabase
        .from('conversations')
        .update({
          last_message: content.trim(),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(msg);
      throw err;
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    sendError,
    sendMessage,
    messagesEndRef,
    refresh: fetchMessages,
  };
};