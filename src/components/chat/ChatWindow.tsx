import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, AlertCircle, RefreshCw,
  Tag, Calendar, Clock, CheckCircle, XCircle, X
} from 'lucide-react';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime } from '../../utils/format';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ChatWindowProps {
  conversationId?: string;
  otherParticipantName?: string;
  propertyId?: string;
  otherParticipantId?: string;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

// ── Custom Deal Offer Card ──────────────────────────────────────
const DealOfferCard = ({
  offer,
  isMe,
  onAccept,
  onDecline,
}: {
  offer: NonNullable<ReturnType<typeof useMessages>['messages'][0]['custom_deal_offer']>;
  isMe: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) => {
  const navigate = useNavigate();
  const isPending = offer.status === 'pending';
  const isAccepted = offer.status === 'accepted';
  const isDeclined = offer.status === 'declined';
  const isExpired = offer.status === 'expired';

  return (
    <div className={`w-72 rounded-2xl overflow-hidden border ${
      isAccepted
        ? 'border-[#1a6b3c]/40 bg-[#1a6b3c]/8'
        : isDeclined || isExpired
        ? 'border-white/8 bg-white/4 opacity-60'
        : 'border-[#f0c040]/25 bg-[#f0c040]/5'
    }`}>
      <div className={`px-4 py-3 border-b ${
        isAccepted
          ? 'border-[#1a6b3c]/20 bg-[#1a6b3c]/10'
          : isDeclined || isExpired
          ? 'border-white/5 bg-white/4'
          : 'border-[#f0c040]/15 bg-[#f0c040]/8'
      }`}>
        <div className="flex items-center gap-2">
          <Tag className={`w-3.5 h-3.5 ${
            isAccepted ? 'text-[#1a6b3c]'
            : isDeclined || isExpired ? 'text-white/30'
            : 'text-[#f0c040]'
          }`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${
            isAccepted ? 'text-[#1a6b3c]'
            : isDeclined || isExpired ? 'text-white/30'
            : 'text-[#f0c040]'
          }`}>
            {isAccepted ? 'Deal Accepted'
              : isDeclined ? 'Deal Declined'
              : isExpired ? 'Offer Expired'
              : 'Custom Deal Offer'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-[11px] text-white/30 mb-0.5">Agreed Price</p>
          <p className="text-[22px] font-black text-[#f0c040]">
            {formatNaira(offer.agreed_price)}
          </p>
        </div>
        {offer.duration && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <p className="text-[12px] text-white/60">{offer.duration}</p>
          </div>
        )}
        {offer.move_in_date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <p className="text-[12px] text-white/60">
              Move-in: {new Date(offer.move_in_date).toLocaleDateString('en-NG', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
          </div>
        )}
        {offer.note && (
          <p className="text-[12px] text-white/50 italic leading-relaxed border-t border-white/5 pt-2">
            "{offer.note}"
          </p>
        )}
        {isPending && !isMe && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={onAccept}
              className="flex-1 bg-[#f0c040] text-black py-2.5 rounded-xl font-bold text-[12px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Accept & Pay
            </button>
            <button
              onClick={onDecline}
              className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        {isAccepted && (
          <button
            onClick={() => navigate('/deals')}
            className="w-full bg-[#1a6b3c] text-white py-2.5 rounded-xl font-bold text-[12px] hover:bg-[#0f4a2a] transition-colors"
          >
            View Deal
          </button>
        )}
      </div>
    </div>
  );
};

// ── Create Deal Modal ───────────────────────────────────────────
const CreateDealModal = ({
  onClose,
  onSend,
  sending,
}: {
  onClose: () => void;
  onSend: (data: {
    agreedPrice: number;
    duration: string;
    moveInDate: string;
    note: string;
  }) => void;
  sending: boolean;
}) => {
  const [agreedPrice, setAgreedPrice] = useState('');
  const [duration, setDuration] = useState('1 year');
  const [moveInDate, setMoveInDate] = useState('');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = () => {
    const price = parseInt(agreedPrice);
    if (!agreedPrice || isNaN(price) || price < 1000) {
      setLocalError('Please enter a valid price (minimum ₦1,000)');
      return;
    }
    setLocalError(null);
    onSend({ agreedPrice: price, duration, moveInDate, note });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
      />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-white">Create Custom Deal</h3>
            <p className="text-[11px] text-white/35">Send a negotiated offer to the tenant</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {localError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-[12px] text-red-400">{localError}</p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Agreed Price (₦) *
            </label>
            <input
              type="number"
              value={agreedPrice}
              onChange={e => { setAgreedPrice(e.target.value); setLocalError(null); }}
              placeholder="e.g. 900000"
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#f0c040]/50 transition-colors"
            />
            {agreedPrice && !isNaN(parseInt(agreedPrice)) && (
              <p className="text-[11px] text-[#f0c040] mt-1 ml-1">
                = {formatNaira(parseInt(agreedPrice))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Duration
            </label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a1f11] border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#f0c040]/50 transition-colors appearance-none"
            >
              <option value="6 months" className="bg-[#0a1f11]">6 months</option>
              <option value="1 year" className="bg-[#0a1f11]">1 year</option>
              <option value="2 years" className="bg-[#0a1f11]">2 years</option>
              <option value="3 years" className="bg-[#0a1f11]">3 years</option>
              <option value="Outright purchase" className="bg-[#0a1f11]">Outright purchase</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Proposed Move-in Date
            </label>
            <input
              type="date"
              value={moveInDate}
              onChange={e => setMoveInDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#f0c040]/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Note <span className="text-white/20 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any additional terms or conditions..."
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#f0c040]/50 transition-colors resize-none"
            />
          </div>

          <p className="text-[11px] text-white/25 text-center">
            This offer expires in 3 days if not accepted
          </p>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!agreedPrice || sending}
              className="flex-[2] bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Tag className="w-4 h-4" />
              }
              Send Deal Offer
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN CHAT WINDOW
// ══════════════════════════════════════════════════════════════
export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId: propConversationId,
  otherParticipantName,
  propertyId: propPropertyId,
  otherParticipantId: propRecipientId,
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPropertyId = searchParams.get('property') || undefined;
  const urlRecipientId = searchParams.get('recipient') || undefined;

  const propertyId = propPropertyId || urlPropertyId;
  const recipientId = propRecipientId || urlRecipientId;

  // ✅ Fixed — proper generic syntax
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>(propConversationId);

  const {
    messages,
    loading,
    sending,
    sendError,
    sendMessage,
    sendCustomDealOffer,
    respondToOffer,
    messagesEndRef,
    refresh,
  } = useMessages(resolvedConversationId);

  const [newMessage, setNewMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLandlordOrAgent =
    profile?.role === 'landlord' || profile?.role === 'agent';

  // Auto resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [newMessage]);

  // Sync if parent passes a new conversationId
  useEffect(() => {
    if (propConversationId && propConversationId !== resolvedConversationId) {
      setResolvedConversationId(propConversationId);
    }
  }, [propConversationId]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = newMessage.trim();
    if (!content || sending || creatingConversation) return;
    setLocalError(null);
    setNewMessage('');

    try {
      if (!resolvedConversationId && propertyId && recipientId && user) {
        setCreatingConversation(true);
        try {
          const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .eq('property_id', propertyId)
            .contains('participant_ids', [user.id, recipientId])
            .maybeSingle();

          let conversationId: string;

          if (existing) {
            conversationId = existing.id;
          } else {
            const { data: created, error: createError } = await supabase
              .from('conversations')
              .insert({
                property_id: propertyId,
                participant_ids: [user.id, recipientId],
                last_message_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (createError) throw createError;
            conversationId = created.id;
          }

          setResolvedConversationId(conversationId);
          setSearchParams({ id: conversationId }, { replace: true });

          const { error: msgError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: user.id,
              content,
              message_type: 'text',
            });

          if (msgError) throw msgError;

          await supabase
            .from('conversations')
            .update({
              last_message: content,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversationId);

          // Refresh messages now that we have the conversation ID
          refresh();
        } finally {
          setCreatingConversation(false);
        }
      } else {
        await sendMessage(content);
      }
    } catch (err: unknown) {
      setNewMessage(content);
      setLocalError(
        err instanceof Error ? err.message : 'Failed to send. Please try again.'
      );
      setCreatingConversation(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendDealOffer = async (data: {
    agreedPrice: number;
    duration: string;
    moveInDate: string;
    note: string;
  }) => {
    if (!propertyId || !recipientId) {
      setLocalError('Cannot send deal offer — property or recipient information is missing.');
      setShowDealModal(false);
      return;
    }
    if (!resolvedConversationId) {
      setLocalError('Please send a message first before creating a deal offer.');
      setShowDealModal(false);
      return;
    }
    try {
      await sendCustomDealOffer({
        propertyId,
        offeredTo: recipientId,
        agreedPrice: data.agreedPrice,
        duration: data.duration,
        moveInDate: data.moveInDate,
        note: data.note,
      });
      setShowDealModal(false);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to send deal offer'
      );
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      await respondToOffer(offerId, true);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to accept offer');
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    try {
      await respondToOffer(offerId, false);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to decline offer');
    }
  };

  if (!resolvedConversationId && !propertyId) return null;

  const isSending = sending || creatingConversation;

  return (
    <>
      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-[#0a0a0a]">
          {loading && resolvedConversationId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-white/25">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <div className="w-14 h-14 bg-white/4 border border-white/6 rounded-2xl flex items-center justify-center mb-1">
                <Send className="w-6 h-6 text-white/15" />
              </div>
              <p className="text-[14px] font-bold text-white/30">No messages yet</p>
              <p className="text-[12px] text-white/20">
                Say hello to {otherParticipantName || 'start the conversation'}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.id;
                const isOptimistic = msg.id.startsWith('temp-');
                const isCustomDeal = msg.message_type === 'custom_deal_offer';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: isOptimistic ? 0.6 : 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    } ${isCustomDeal ? 'max-w-[85%]' : 'max-w-[78%]'}`}>
                      {isCustomDeal && msg.custom_deal_offer ? (
                        <DealOfferCard
                          offer={msg.custom_deal_offer}
                          isMe={isMe}
                          onAccept={() => handleAcceptOffer(msg.custom_deal_offer!.id)}
                          onDecline={() => handleDeclineOffer(msg.custom_deal_offer!.id)}
                        />
                      ) : (
                        <div className={`px-4 py-2.5 text-[13px] leading-relaxed break-words ${
                          isMe
                            ? 'bg-[#1a6b3c] text-white rounded-2xl rounded-tr-sm'
                            : 'bg-[#0a1f11] border border-white/8 text-white/85 rounded-2xl rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        {!isMe && !isCustomDeal && (
                          <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">
                            {msg.sender?.full_name || otherParticipantName || 'User'}
                          </span>
                        )}
                        <span className="text-[10px] text-white/20">
                          {isOptimistic
                            ? 'Sending...'
                            : formatRelativeTime(msg.created_at)
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {(localError || sendError) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-4 mb-2 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-[12px] text-red-400">
                  {localError || sendError}
                </p>
              </div>
              <button
                onClick={() => { setLocalError(null); refresh(); }}
                className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 py-3 bg-[#0a1f11] border-t border-white/5">
          {isLandlordOrAgent && propertyId && (
            <div className="mb-2">
              <button
                onClick={() => {
                  if (!resolvedConversationId) {
                    setLocalError('Send a message first before creating a deal offer.');
                    return;
                  }
                  setShowDealModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-[#f0c040]/8 border border-[#f0c040]/20 rounded-xl text-[12px] font-bold text-[#f0c040]/80 hover:text-[#f0c040] hover:bg-[#f0c040]/12 transition-colors"
              >
                <Tag className="w-3.5 h-3.5" />
                Create Custom Deal Offer
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 focus-within:border-[#1a6b3c]/50 transition-colors">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${otherParticipantName || ''}...`}
                rows={1}
                className="w-full bg-transparent outline-none resize-none text-[13px] text-white placeholder-white/25 leading-relaxed"
                style={{ minHeight: '22px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!newMessage.trim() || isSending}
              className="w-10 h-10 bg-[#1a6b3c] rounded-xl flex items-center justify-center text-white hover:bg-[#0f4a2a] disabled:opacity-35 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95"
            >
              {isSending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
          <p className="text-[10px] text-white/15 mt-1.5 ml-1">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showDealModal && (
          <CreateDealModal
            onClose={() => setShowDealModal(false)}
            onSend={handleSendDealOffer}
            sending={isSending}
          />
        )}
      </AnimatePresence>
    </>
  );
};