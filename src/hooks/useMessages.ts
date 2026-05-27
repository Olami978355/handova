import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Message, CustomDealOffer } from '../types';

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
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
  }, [user?.id]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);
    try {
      // Step 1 — fetch messages with sender profile only
      // Avoid PostgREST alias join on custom_deal_offers
      // which causes 400 when FK is not in schema cache
      const { data: rawMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(
            id,
            full_name,
            avatar_url,
            role,
            email,
            verification_status,
            nin_verified,
            created_at,
            updated_at
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs = rawMessages || [];

      // Step 2 — collect all deal offer IDs in one pass
      const dealOfferIds = msgs
        .filter(m => m.custom_deal_offer_id)
        .map(m => m.custom_deal_offer_id as string);

      let dealOffersMap: Record<string, CustomDealOffer> = {};

      if (dealOfferIds.length > 0) {
        const { data: offers } = await supabase
          .from('custom_deal_offers')
          .select('*')
          .in('id', dealOfferIds);

        if (offers) {
          dealOffersMap = Object.fromEntries(
            offers.map(o => [o.id, o as CustomDealOffer])
          );
        }
      }

      // Step 3 — merge deal offers into messages
      const enriched = msgs.map(msg => ({
        ...msg,
        custom_deal_offer: msg.custom_deal_offer_id
          ? dealOffersMap[msg.custom_deal_offer_id] || undefined
          : undefined,
      }));

      if (mountedRef.current) {
        setMessages(enriched as Message[]);
        scrollToBottom();
        await markAsRead(conversationId);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [conversationId, user?.id, scrollToBottom, markAsRead]);

  useEffect(() => {
    mountedRef.current = true;
    setMessages([]);
    setSendError(null);

    if (!conversationId || !user) {
      setLoading(false);
      return;
    }

    fetchMessages();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `messages-conv-${conversationId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as const,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (!mountedRef.current) return;

          const newMsg = payload.new as Message;

          // Fetch sender profile separately
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select(
              'id, full_name, avatar_url, role, email, verification_status, nin_verified, created_at, updated_at'
            )
            .eq('id', newMsg.sender_id)
            .single();

          // Fetch deal offer if attached
          let customDealOffer: CustomDealOffer | undefined;
          if (newMsg.custom_deal_offer_id) {
            const { data: offerData } = await supabase
              .from('custom_deal_offers')
              .select('*')
              .eq('id', newMsg.custom_deal_offer_id)
              .single();
            if (offerData) customDealOffer = offerData as CustomDealOffer;
          }

          const enriched: Message = {
            ...newMsg,
            sender: senderProfile || undefined,
            custom_deal_offer: customDealOffer,
          };

          if (mountedRef.current) {
            setMessages(prev => {
              // Remove optimistic version of this message if exists
              const withoutOptimistic = prev.filter(
                m => !m.id.startsWith('temp-') || m.content !== newMsg.content
              );
              // Skip if already in state
              if (withoutOptimistic.some(m => m.id === newMsg.id)) {
                return withoutOptimistic;
              }
              return [...withoutOptimistic, enriched];
            });
            scrollToBottom();

            // Mark as read if not from current user
            if (newMsg.sender_id !== user.id) {
              await supabase
                .from('messages')
                .update({ read: true })
                .eq('id', newMsg.id);
            }
          }
        }
      )
      .on(
        'postgres_changes' as const,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_deal_offers',
        },
        () => {
          if (mountedRef.current) fetchMessages();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Messages realtime connected for ${conversationId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`Messages channel error for ${conversationId}`);
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
  }, [conversationId, user?.id]);

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
      // Insert without join — avoids 400 on insert+select join
      const { data: sent, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
        })
        .select('*')
        .single();

      if (insertError) throw new Error(insertError.message);

      // Fetch sender profile separately
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select(
          'id, full_name, avatar_url, role, email, verification_status, nin_verified, created_at, updated_at'
        )
        .eq('id', user.id)
        .single();

      const fullMessage: Message = {
        ...(sent as Message),
        sender: senderProfile || undefined,
      };

      if (mountedRef.current) {
        setMessages(prev =>
          prev.map(m => m.id === tempId ? fullMessage : m)
        );

        await supabase
          .from('conversations')
          .update({
            last_message: content.trim(),
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId);

        scrollToBottom();
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        setSendError(msg);
      }
      throw err;
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const sendCustomDealOffer = async (offer: {
    propertyId: string;
    offeredTo: string;
    agreedPrice: number;
    duration?: string;
    moveInDate?: string;
    note?: string;
  }): Promise<void> => {
    if (!conversationId || !user || sending) return;

    setSending(true);
    setSendError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      const { data: dealOffer, error: offerError } = await supabase
        .from('custom_deal_offers')
        .insert({
          conversation_id: conversationId,
          property_id: offer.propertyId,
          offered_by: user.id,
          offered_to: offer.offeredTo,
          agreed_price: offer.agreedPrice,
          duration: offer.duration || null,
          move_in_date: offer.moveInDate || null,
          note: offer.note || null,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (offerError) throw new Error(offerError.message);

      const content = `Custom deal offer: ₦${offer.agreedPrice.toLocaleString()}${
        offer.duration ? ` · ${offer.duration}` : ''
      }`;

      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: 'custom_deal_offer',
          custom_deal_offer_id: dealOffer.id,
        });

      if (msgError) throw new Error(msgError.message);

      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Refresh to show deal offer card immediately
      await fetchMessages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send deal offer';
      if (mountedRef.current) setSendError(msg);
      throw err;
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const respondToOffer = async (
    offerId: string,
    accept: boolean
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('custom_deal_offers')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', offerId);

      if (error) throw new Error(error.message);

      // Refresh to show updated offer status
      await fetchMessages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to respond to offer';
      if (mountedRef.current) setSendError(msg);
      throw err;
    }
  };

  return {
    messages,
    loading,
    sending,
    sendError,
    sendMessage,
    sendCustomDealOffer,
    respondToOffer,
    messagesEndRef,
    refresh: fetchMessages,
  };
};