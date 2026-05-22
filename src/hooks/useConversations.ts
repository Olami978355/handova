import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Conversation, Profile } from '../types';

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, properties(id, title, images, address, state, lga)')
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Enrich with other participant profile + unread count
      const enriched = await Promise.all(
        (data || []).map(async (conv) => {
          const otherParticipantId = conv.participant_ids.find(
            (id: string) => id !== user.id
          );

          let otherProfile: Profile | undefined;
          if (otherParticipantId) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, role, verification_status')
              .eq('id', otherParticipantId)
              .single();
            if (profileData) otherProfile = profileData as Profile;
          }

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

      setConversations(enriched);
      const total = enriched.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      setTotalUnreadCount(total);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to messages and conversations changes
    const channel = supabase
      .channel(`user-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => { fetchConversations(); }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => { fetchConversations(); }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => { fetchConversations(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Conversations realtime connected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchConversations]);

  const findOrCreateConversation = async (
    propertyId: string,
    tenantId: string,
    landlordId: string
  ): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('property_id', propertyId)
        .contains('participant_ids', [tenantId, landlordId])
        .maybeSingle();

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
    } catch (err) {
      console.error('Error finding/creating conversation:', err);
      throw err;
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