import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles (*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read
      const { error: markError } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);
        
      if (markError) console.error('Error marking messages as read:', markError);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId || !user) return;

    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`messages:${conversationId}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Check if message already exists (to avoid duplicates from optimistic updates)
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            
            // Fetch sender profile for the new message
            const fetchSender = async () => {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', newMessage.sender_id)
                .single();
                
              const enrichedMessage = {
                ...newMessage,
                sender: senderProfile,
              };
              
              setMessages(current => {
                if (current.some(m => m.id === newMessage.id)) return current;
                return [...current, enrichedMessage];
              });
            };
            
            fetchSender();
            return prev;
          });
          
          // Mark as read if not from current user
          if (newMessage.sender_id !== user.id) {
            await supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !user || !content.trim()) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      read: false,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: 'You', // Placeholder
        email: user.email || '',
        role: 'tenant', // Placeholder
        verification_status: 'unverified',
        nin_verified: false,
        created_at: '',
        updated_at: '',
      },
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // 1. Insert message
      const { data: sentMessage, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (sendError) {
        console.error('Supabase send error:', sendError);
        throw sendError;
      }
      
      if (!sentMessage) {
        throw new Error('No message returned from server');
      }
      
      // Replace optimistic message with actual one
      setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? { ...sentMessage, sender: optimisticMessage.sender } : m));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      throw error;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    messagesEndRef,
  };
};
