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
  const mountedRef = useRef(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, properties(id, title, images, address, state, lga)')
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async conv => {
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
            // Only set unread_count if greater than 0
            unread_count: count && count > 0 ? count : undefined,
          };
        })
      );

      if (mountedRef.current) {
        setConversations(enriched);
        const total = enriched.reduce(
          (acc, c) => acc + (c.unread_count || 0), 0
        );
        setTotalUnreadCount(total);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;

    if (!user) {
      setLoading(false);
      return;
    }

    fetchConversations();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // ALL listeners before subscribe
    const channel = supabase
      .channel(`conversations-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => { if (mountedRef.current) fetchConversations(); }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => { if (mountedRef.current) fetchConversations(); }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => { if (mountedRef.current) fetchConversations(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Conversations realtime connected');
        }
      });

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const findOrCreateConversation = async (
    propertyId: string,
    tenantId: string,
    landlordId: string
  ): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('property_id', propertyId)
      .contains('participant_ids', [tenantId, landlordId])
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        property_id: propertyId,
        participant_ids: [tenantId, landlordId],
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return created.id;
  };

  return {
    conversations,
    totalUnreadCount,
    loading,
    findOrCreateConversation,
    refresh: fetchConversations,
  };
};