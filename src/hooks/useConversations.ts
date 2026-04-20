import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Conversation, Profile } from '../types';

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch conversations where current user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          properties (*)
        `)
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // For each conversation, fetch the other participant's profile and unread count
      const enrichedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          const otherParticipantId = conv.participant_ids.find((id: string) => id !== user.id);
          
          let otherProfile: Profile | undefined;
          if (otherParticipantId) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherParticipantId)
              .single();
            otherProfile = profileData;
          }

          // Fetch unread count for this conversation
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            participants: otherProfile ? [otherProfile] : [],
            unread_count: count || 0,
          };
        })
      );

      setConversations(enrichedConversations);
      
      // Calculate total unread count
      const total = enrichedConversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    if (!user) return;

    // Subscribe to new messages to update last_message and unread_count
    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`conversations:${user.id}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const findOrCreateConversation = async (propertyId: string, tenantId: string, landlordId: string) => {
    if (!user) throw new Error('Not authenticated');

    try {
      // Check if conversation already exists for this property and tenant
      // Note: participant_ids contains both tenant and landlord/agent
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .eq('property_id', propertyId)
        .contains('participant_ids', [tenantId, landlordId])
        .single();

      if (existing) return existing.id;

      // Create new conversation
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert({
          property_id: propertyId,
          participant_ids: [tenantId, landlordId],
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      return created.id;
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
      throw error;
    }
  };

  return {
    conversations,
    totalUnreadCount,
    loading,
    findOrCreateConversation,
    refresh: fetchConversations,
  };
};
