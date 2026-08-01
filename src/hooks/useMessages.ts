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

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  }, []);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!conversationId || !user) return;
    if (!silent) setLoading(true);
    try {
      const { data: rawMessages, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, message_type, custom_deal_offer_id, read, created_at, edited_at, deleted_for_everyone, deleted_for, quoted_message_id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs = rawMessages || [];

      const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))];
      let senderMap: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: senderProfiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, role, verification_status, nin_verified, created_at')
          .in('id', senderIds);
        if (senderProfiles) {
          senderMap = Object.fromEntries(senderProfiles.map(p => [p.id, p]));
        }
      }

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
          dealOffersMap = Object.fromEntries(offers.map(o => [o.id, o as CustomDealOffer]));
        }
      }

      const visibleMsgs = msgs.filter(m => !(m.deleted_for || []).includes(user.id));
      const msgMap = Object.fromEntries(visibleMsgs.map(m => [m.id, m]));

      const enriched = visibleMsgs.map(msg => ({
        ...msg,
        sender: senderMap[msg.sender_id] || undefined,
        custom_deal_offer: msg.custom_deal_offer_id
          ? dealOffersMap[msg.custom_deal_offer_id] || undefined
          : undefined,
        quoted_message: msg.quoted_message_id ? msgMap[msg.quoted_message_id] : undefined,
      }));

      setMessages(enriched as Message[]);
      scrollToBottom();

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

    } catch (err: any) {
      console.error('fetchMessages error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id, scrollToBottom]);

  useEffect(() => {
    if (!conversationId || !user) {
      setLoading(false);
      return;
    }

    setMessages([]);
    setLoading(true);
    setSendError(null);

    fetchMessages();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = 'messages-conv-' + conversationId + '-' + Date.now();
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes' as const, {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'conversation_id=eq.' + conversationId,
      }, () => {
        fetchMessages(true);
      })
      .on('postgres_changes' as const, {
        event: 'UPDATE',
        schema: 'public',
        table: 'custom_deal_offers',
      }, () => {
        fetchMessages(true);
      })
      .subscribe();

    channelRef.current = channel;

    const pollInterval = setInterval(() => {
      fetchMessages(true);
    }, 15000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user?.id]);

  const sendMessage = async (content: string, quotedMessageId?: string): Promise<void> => {
    if (!conversationId || !user || !content.trim() || sending) return;
    setSending(true);
    setSendError(null);
    const tempId = 'temp-' + Date.now();
    const quotedMsg = quotedMessageId ? messages.find(m => m.id === quotedMessageId) : undefined;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      message_type: 'text',
      quoted_message_id: quotedMessageId,
      quoted_message: quotedMsg,
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
      const { data: sent, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
          quoted_message_id: quotedMessageId || null,
        })
        .select('id, conversation_id, sender_id, content, message_type, custom_deal_offer_id, read, created_at, edited_at, deleted_for_everyone, deleted_for, quoted_message_id')
        .single();
      if (insertError) throw new Error(insertError.message);
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, email, verification_status, nin_verified, created_at, updated_at')
        .eq('id', user.id)
        .single();
      setMessages(prev => prev.map(m => m.id === tempId ? { ...(sent as Message), sender: senderProfile || undefined, quoted_message: quotedMsg } : m));
      await supabase
        .from('conversations')
        .update({ last_message: content.trim(), last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Notify the other participant — this was previously missing entirely,
      // meaning recipients never got alerted about new messages.
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('participant_ids')
          .eq('id', conversationId)
          .single();
        const recipientId = conv?.participant_ids?.find((id: string) => id !== user.id);
        if (recipientId) {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_ids: [recipientId],
              title: 'New Message',
              body: content.trim().slice(0, 100),
              link: `/messages?id=${conversationId}`,
              type: 'new_message',
            },
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify recipient (non-fatal):', notifyErr);
      }

      scrollToBottom();
    } catch (err: unknown) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const sendMediaMessage = async (file: File, mediaType: 'image' | 'video'): Promise<void> => {
    if (!conversationId || !user || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${conversationId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);
      if (uploadError) throw new Error(uploadError.message);

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);
      if (signedUrlError) throw new Error(signedUrlError.message);

      const fallbackContent = mediaType === 'image' ? '📷 Photo' : '🎥 Video';

      const { data: sent, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: fallbackContent,
          message_type: mediaType,
          media_url: signedUrlData.signedUrl,
          media_type: mediaType,
        })
        .select('id, conversation_id, sender_id, content, message_type, custom_deal_offer_id, read, created_at, edited_at, deleted_for_everyone, deleted_for, quoted_message_id, media_url, media_type')
        .single();
      if (insertError) throw new Error(insertError.message);

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, email, verification_status, nin_verified, created_at, updated_at')
        .eq('id', user.id)
        .single();
      setMessages(prev => [...prev, { ...(sent as Message), sender: senderProfile || undefined }]);

      await supabase
        .from('conversations')
        .update({ last_message: fallbackContent, last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      try {
        const { data: conv } = await supabase
          .from('conversations')
          .select('participant_ids')
          .eq('id', conversationId)
          .single();
        const recipientId = conv?.participant_ids?.find((id: string) => id !== user.id);
        if (recipientId) {
          await supabase.functions.invoke('send-notification', {
            body: {
              user_ids: [recipientId],
              title: 'New Message',
              body: fallbackContent,
              link: `/messages?id=${conversationId}`,
              type: 'new_message',
            },
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify recipient (non-fatal):', notifyErr);
      }
      scrollToBottom();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send media');
      throw err;
    } finally {
      setSending(false);
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
      const content = 'Custom deal offer: \u20a6' + offer.agreedPrice.toLocaleString() + (offer.duration ? ' \u00b7 ' + offer.duration : '');
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
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
      await fetchMessages();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send deal offer');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const respondToOffer = async (offerId: string, accept: boolean): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('respond-to-deal-offer', {
        body: { offerId, accept },
      });
      if (error) {
        // supabase-js does not automatically surface the Edge Function's
        // JSON error body on a non-2xx response — it has to be read from
        // error.context manually, otherwise the user only ever sees a
        // generic "non-2xx status code" message instead of the real reason.
        let message = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          }
        } catch { /* fall back to generic message */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      await fetchMessages();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to respond to offer');
      throw err;
    }
  };

  const editMessage = async (messageId: string, newContent: string): Promise<void> => {
    if (!newContent.trim()) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent.trim(), edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user?.id || '');
      if (error) throw new Error(error.message);
      await fetchMessages();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to edit message');
      throw err;
    }
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean): Promise<void> => {
    try {
      if (forEveryone) {
        const { error } = await supabase
          .from('messages')
          .update({ deleted_for_everyone: true, content: 'This message was deleted' })
          .eq('id', messageId)
          .eq('sender_id', user?.id || '');
        if (error) throw new Error(error.message);
      } else {
        const target = messages.find(m => m.id === messageId);
        const existing = (target as any)?.deleted_for || [];
        const updated = [...new Set([...existing, user?.id])];
        const { error } = await supabase
          .from('messages')
          .update({ deleted_for: updated })
          .eq('id', messageId);
        if (error) throw new Error(error.message);
      }
      await fetchMessages();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to delete message');
      throw err;
    }
  };

  return {
    messages,
    loading,
    sending,
    sendError,
    sendMessage,
    sendMediaMessage,
    sendCustomDealOffer,
    respondToOffer,
    editMessage,
    deleteMessage,
    messagesEndRef,
    refresh: fetchMessages,
  };
};
