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

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);
    try {
      const { data: rawMessages, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, message_type, custom_deal_offer_id, read, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs = rawMessages || [];

      const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))];
      let senderMap: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, email, verification_status, nin_verified, created_at, updated_at')
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

      const enriched = msgs.map(msg => ({
        ...msg,
        sender: senderMap[msg.sender_id] || undefined,
        custom_deal_offer: msg.custom_deal_offer_id
          ? dealOffersMap[msg.custom_deal_offer_id] || undefined
          : undefined,
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
        fetchMessages();
      })
      .on('postgres_changes' as const, {
        event: 'UPDATE',
        schema: 'public',
        table: 'custom_deal_offers',
      }, () => {
        fetchMessages();
      })
      .subscribe();

    channelRef.current = channel;

    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 15000);

    return () => {
      clearInterval(pollInterval);
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
    const tempId = 'temp-' + Date.now();
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
      const { data: sent, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
        })
        .select('id, conversation_id, sender_id, content, message_type, custom_deal_offer_id, read, created_at')
        .single();
      if (insertError) throw new Error(insertError.message);
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, email, verification_status, nin_verified, created_at, updated_at')
        .eq('id', user.id)
        .single();
      setMessages(prev => prev.map(m => m.id === tempId ? { ...(sent as Message), sender: senderProfile || undefined } : m));
      await supabase
        .from('conversations')
        .update({ last_message: content.trim(), last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
      scrollToBottom();
    } catch (err: unknown) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
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
      const { data: offer, error: fetchError } = await supabase
        .from('custom_deal_offers')
        .select('*')
        .eq('id', offerId)
        .single();
      if (fetchError) throw new Error(fetchError.message);
      const { error: updateError } = await supabase
        .from('custom_deal_offers')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', offerId);
      if (updateError) throw new Error(updateError.message);
      if (accept) {
        const { data: offererProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', offer.offered_by)
          .single();
        const isAgent = offererProfile?.role === 'agent';
        const platformFee = Math.round(offer.agreed_price * 0.02);
        const agentFee = isAgent ? Math.round(offer.agreed_price * 0.10) : 0;
        const landlordPayout = offer.agreed_price - platformFee - agentFee;
      // Fetch property owner to always set landlord_id
const { data: propertyData } = await supabase
  .from('properties')
  .select('owner_id')
  .eq('id', offer.property_id)
  .single();

const dealPayload: Record<string, unknown> = {
  property_id: offer.property_id,
  tenant_id: offer.offered_to,
  landlord_id: propertyData?.owner_id || offer.offered_by,
  amount: offer.agreed_price,
  platform_fee: platformFee,
  agent_fee: agentFee,
  landlord_payout: landlordPayout,
 status: 'agreement_draft',
  move_in_date: offer.move_in_date || null,
  notes: offer.note || null,
};

if (isAgent) {
  dealPayload.agent_id = offer.offered_by;
}
        const { error: dealError } = await supabase.from('deals').insert(dealPayload);
        if (dealError) throw new Error('Deal creation failed: ' + dealError.message);
      }
      await fetchMessages();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to respond to offer');
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
