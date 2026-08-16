import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, AlertCircle, RefreshCw,
  Tag, Calendar, Clock, CheckCircle, XCircle, X,
  Pencil, Reply, Trash2, Check, Paperclip
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
  const [navigating, setNavigating] = useState(false);
  const isPending = offer.status === 'pending';
  const isAccepted = offer.status === 'accepted';
  const isDeclined = offer.status === 'declined';
  const isExpired = offer.status === 'expired';

  const handleViewDeal = async () => {
    setNavigating(true);
    try {
      const { data } = await supabase
        .from('deals')
        .select('id')
        .eq('property_id', offer.property_id)
        .eq('tenant_id', offer.offered_to)
        .maybeSingle();
      if (data) {
        navigate(`/deals/${data.id}`);
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/dashboard');
    } finally {
      setNavigating(false);
    }
  };

  return (
    <div className={`w-72 rounded-2xl overflow-hidden border ${
      isAccepted
        ? 'border-gold/40 bg-gold/8'
        : isDeclined || isExpired
        ? 'border-white/8 bg-white/4 opacity-60'
        : 'border-gold/25 bg-gold/5'
    }`}>
      <div className={`px-4 py-3 border-b ${
        isAccepted
          ? 'border-gold/20 bg-gold/10'
          : isDeclined || isExpired
          ? 'border-white/5 bg-white/4'
          : 'border-gold/15 bg-gold/8'
      }`}>
        <div className="flex items-center gap-2">
          <Tag className={`w-3.5 h-3.5 ${
            isAccepted ? 'text-gold'
            : isDeclined || isExpired ? 'text-paper/30'
            : 'text-gold'
          }`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${
            isAccepted ? 'text-gold'
            : isDeclined || isExpired ? 'text-paper/30'
            : 'text-gold'
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
          <p className="text-[11px] text-paper/30 mb-0.5">Agreed Price</p>
          <p className="text-[22px] font-black text-gold">
            {formatNaira(offer.agreed_price)}
          </p>
        </div>
        {offer.duration && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-paper/30 flex-shrink-0" />
            <p className="text-[12px] text-paper/60">{offer.duration}</p>
          </div>
        )}
        {(offer as any).caution_fee && (
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <p className="text-[11px] text-paper/40">Caution / Security Deposit</p>
            <p className="text-[12px] font-semibold text-paper/70">{formatNaira((offer as any).caution_fee)}</p>
          </div>
        )}
        {offer.move_in_date && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-paper/30 flex-shrink-0" />
            <p className="text-[12px] text-paper/60">
              Move-in: {new Date(offer.move_in_date).toLocaleDateString('en-NG', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
          </div>
        )}
        {offer.note && (
          <p className="text-[12px] text-paper/50 italic leading-relaxed border-t border-white/5 pt-2">
            "{offer.note}"
          </p>
        )}
        {isPending && !isMe && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={onAccept}
              className="flex-1 bg-gold text-black py-2.5 rounded-xl font-bold text-[12px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Accept & Pay
            </button>
            <button
              onClick={onDecline}
              className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-paper/40 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        {isPending && isMe && (
          <p className="text-[11px] text-paper/30 text-center pt-1">
            Waiting for tenant response...
          </p>
        )}
        {isAccepted && (
          <button
            onClick={handleViewDeal}
            disabled={navigating}
            className="w-full bg-gold text-paper py-2.5 rounded-xl font-bold text-[12px] hover:bg-gold-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {navigating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'View Deal'}
          </button>
        )}
      </div>
    </div>
  );
};

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
    cautionFee?: number;
  }) => void;
  sending: boolean;
}) => {
  const [agreedPrice, setAgreedPrice] = useState('');
  const [duration, setDuration] = useState('1 year');
  const [moveInDate, setMoveInDate] = useState('');
  const [note, setNote] = useState('');
  const [cautionFee, setCautionFee] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = () => {
    const price = parseInt(agreedPrice);
    if (!agreedPrice || isNaN(price) || price < 1000) {
      setLocalError('Please enter a valid price (minimum ₦1,000)');
      return;
    }
    if (!moveInDate) {
      setLocalError('Please select a proposed move-in date');
      return;
    }
    setLocalError(null);
    onSend({ agreedPrice: price, duration, moveInDate, note, cautionFee: cautionFee ? parseInt(cautionFee) : undefined });
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
        className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-md h-fit bg-ink border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-paper">Create Custom Deal</h3>
            <p className="text-[11px] text-paper/35">Send a negotiated offer to the tenant</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
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
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Agreed Price (₦) *</label>
            <input
              type="number"
              value={agreedPrice}
              onChange={e => { setAgreedPrice(e.target.value); setLocalError(null); }}
              placeholder="e.g. 900000"
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-white/25 outline-none focus:border-gold/50 transition-colors"
            />
            {agreedPrice && !isNaN(parseInt(agreedPrice)) && (
              <p className="text-[11px] text-gold mt-1 ml-1">= {formatNaira(parseInt(agreedPrice))}</p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Caution / Security Deposit (₦) <span className="normal-case text-paper/25">(optional)</span></label>
            <input
              type="number"
              value={cautionFee}
              onChange={e => setCautionFee(e.target.value)}
              placeholder="e.g. 200000"
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-white/25 outline-none focus:border-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Duration</label>
            <select value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full px-4 py-3 bg-ink border border-white/8 rounded-xl text-[13px] text-paper outline-none focus:border-gold/50 transition-colors appearance-none">
              <option value="6 months" className="bg-ink">6 months</option>
              <option value="1 year" className="bg-ink">1 year</option>
              <option value="2 years" className="bg-ink">2 years</option>
              <option value="3 years" className="bg-ink">3 years</option>
              <option value="Outright purchase" className="bg-ink">Outright purchase</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Proposed Move-in Date *</label>
            <input type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper outline-none focus:border-gold/50 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">
              Note <span className="text-paper/20 normal-case font-normal">(optional)</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Any additional terms or conditions..." rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-white/25 outline-none focus:border-gold/50 transition-colors resize-none" />
          </div>
          <p className="text-[11px] text-paper/25 text-center">This offer expires in 3 days if not accepted</p>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-paper/40 hover:bg-white/5 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={!agreedPrice || sending}
              className="flex-[2] bg-gold text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              Send Deal Offer
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

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
  const urlConvId = searchParams.get('id') || undefined;

  const propertyId = propPropertyId || urlPropertyId;
  const recipientId = propRecipientId || urlRecipientId;

  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>(
    propConversationId || urlConvId
  );

  const {
    messages, loading, sending, sendError,
    sendMessage, sendMediaMessage, sendCustomDealOffer, respondToOffer,
    editMessage, deleteMessage,
    messagesEndRef, refresh,
  } = useMessages(resolvedConversationId);

  const [newMessage, setNewMessage] = useState('');
  const offPlatformWarning = useMemo(() => {
    const text = newMessage.toLowerCase();
    if (!text.trim()) return null;

    const bankKeywords = /\b(account number|acct no|acct number|gtbank|gt bank|first bank|zenith|access bank|uba|opay|palmpay|kuda|moniepoint|fidelity bank|union bank|sterling bank|polaris bank|wema bank|stanbic|fcmb|providus)\b/;
    const tenDigitSequence = /\b\d{10}\b/;
    const offPlatformPhrase = /\b(pay me directly|pay directly|send to my account|outside the app|off[\s-]?platform|pay in cash|send cash|pay cash|bank transfer)\b/;
    const messagingApp = /\b(whatsapp|telegram)\b/;
    const phoneNumberPattern = /\b0\d{10}\b|\b\d{10,11}\b/;
    const moveConversationPhrase = /\b(message me on|contact me on|reach me on|text me on|let'?s continue on|move this to|chat with me on)\b/;

    if (tenDigitSequence.test(text) && bankKeywords.test(text)) {
      return { message: "Sharing bank account details outside Handova isn't covered by escrow protection.", type: 'bank_details' as const };
    }
    if (offPlatformPhrase.test(text)) {
      return { message: "Arranging payment outside Handova isn't covered by escrow protection.", type: 'off_platform_phrase' as const };
    }
    if (messagingApp.test(text) && (phoneNumberPattern.test(text) || moveConversationPhrase.test(text))) {
      return { message: "Keeping the conversation on Handova protects both of you if something goes wrong.", type: 'messaging_app' as const };
    }
    return null;
  }, [newMessage]);

  // Silent server-side log of when the warning banner fires, once per
  // transition from hidden to showing per conversation. Never blocks
  // typing or sending, no UI change.
  const loggedWarningRef = useRef<{ conversationId?: string; warningType: string | null }>({ conversationId: undefined, warningType: null });
  useEffect(() => {
    if (!offPlatformWarning || !user || !resolvedConversationId) return;
    const last = loggedWarningRef.current;
    if (last.conversationId === resolvedConversationId && last.warningType === offPlatformWarning.type) return;
    loggedWarningRef.current = { conversationId: resolvedConversationId, warningType: offPlatformWarning.type };
    supabase.from('offplatform_warning_triggers').insert({
      user_id: user.id,
      conversation_id: resolvedConversationId,
      warning_type: offPlatformWarning.type,
    }).then(({ error }) => {
      if (error) console.error('Failed to log off-platform warning trigger (non-fatal):', error);
    });
  }, [offPlatformWarning, user, resolvedConversationId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevConversationIdRef = useRef<string | undefined>(undefined);
  const prevMessageCountRef = useRef(0);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 150;
  };

  useEffect(() => {
    const conversationChanged = prevConversationIdRef.current !== resolvedConversationId;
    const isNewMessage = messages.length > prevMessageCountRef.current;
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.sender_id === user?.id;

    if (conversationChanged && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else if (isNewMessage && (isNearBottomRef.current || isOwnMessage)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevConversationIdRef.current = resolvedConversationId;
    prevMessageCountRef.current = messages.length;
  }, [messages, resolvedConversationId, user?.id]);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; mediaType: 'image' | 'video'; previewUrl: string } | null>(null);
  const [showFullMediaPreview, setShowFullMediaPreview] = useState(false);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 25 * 1024 * 1024) {
      setLocalError('File must be under 25MB.');
      return;
    }
    const mediaType: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
    setPendingMedia({ file, mediaType, previewUrl: URL.createObjectURL(file) });
  };
  const cancelPendingMedia = () => {
    if (pendingMedia) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
  };
  const confirmSendMedia = async () => {
    if (!pendingMedia) return;
    const { file, mediaType, previewUrl } = pendingMedia;
    setUploadingMedia(true);
    try {
      await sendMediaMessage(file, mediaType);
      URL.revokeObjectURL(previewUrl);
      setPendingMedia(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send media');
    } finally {
      setUploadingMedia(false);
    }
  };
  const [localError, setLocalError] = useState<string | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<typeof messages[0] | null>(null);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ONE_HOUR = 60 * 60 * 1000;
  const FIFTEEN_MIN = 15 * 60 * 1000;

  const startLongPress = (msg: typeof messages[0]) => {
    longPressTimer.current = setTimeout(() => setMenuMessageId(msg.id), 500);
  };
  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const startEdit = (msg: typeof messages[0]) => {
    setEditingId(msg.id);
    setEditText(msg.content);
    setMenuMessageId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      await editMessage(editingId, editText.trim());
    } catch { /* surfaced via sendError */ }
    setEditingId(null);
    setEditText('');
  };

  const handleDeleteMessage = async (msg: typeof messages[0], forEveryone: boolean) => {
    setMenuMessageId(null);
    try {
      await deleteMessage(msg.id, forEveryone);
    } catch { /* surfaced via sendError */ }
  };
  const [creatingConversation, setCreatingConversation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLandlordOrAgent = profile?.role === 'landlord' || profile?.role === 'agent';

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [newMessage]);

  useEffect(() => {
    const urlId = searchParams.get('id') || undefined;
    const newId = propConversationId || urlId;
    if (newId && newId !== resolvedConversationId) {
      setResolvedConversationId(newId);
    }
  }, [propConversationId, searchParams]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = newMessage.trim();
    if (!content || sending || creatingConversation) return;
    const targetId = recipientId;
    if (targetId && user) {
      const { data: blockRow } = await supabase
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${user.id})`)
        .maybeSingle();
      if (blockRow) {
        setLocalError('You cannot message this user.');
        return;
      }
    }
    setLocalError(null);
    setNewMessage('');
    const quotedId = quotedMessage?.id;
    setQuotedMessage(null);

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
            .update({ last_message: content, last_message_at: new Date().toISOString() })
            .eq('id', conversationId);

          refresh();
        } finally {
          setCreatingConversation(false);
        }
      } else {
        await sendMessage(content, quotedId);
      }
    } catch (err: unknown) {
      setNewMessage(content);
      setLocalError(err instanceof Error ? err.message : 'Failed to send. Please try again.');
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
    cautionFee?: number;
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
        cautionFee: data.cautionFee,
      });
      setShowDealModal(false);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send deal offer');
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
      <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-ink">
          {loading && resolvedConversationId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-paper/25">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <div className="w-14 h-14 bg-white/4 border border-white/6 rounded-2xl flex items-center justify-center mb-1">
                <Send className="w-6 h-6 text-paper/15" />
              </div>
              <p className="text-[14px] font-bold text-paper/30">No messages yet</p>
              <p className="text-[12px] text-paper/20">Say hello to {otherParticipantName || 'start the conversation'}</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.id;
                const isOptimistic = msg.id.startsWith('temp-');
                const isCustomDeal = msg.message_type === 'custom_deal_offer';
                const isDeleted = !!msg.deleted_for_everyone;
                const isEditing = editingId === msg.id;
                const canEdit = isMe && !isCustomDeal && !isDeleted && !isOptimistic &&
                  (Date.now() - new Date(msg.created_at).getTime() < FIFTEEN_MIN);
                const canDeleteForEveryone = isMe && !isDeleted && !isOptimistic &&
                  (Date.now() - new Date(msg.created_at).getTime() < ONE_HOUR);
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: isOptimistic ? 0.6 : 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isCustomDeal ? 'max-w-[85%]' : 'max-w-[78%]'}`}>
                      {isCustomDeal && msg.custom_deal_offer ? (
                        <DealOfferCard
                          offer={msg.custom_deal_offer}
                          isMe={isMe}
                          onAccept={() => handleAcceptOffer(msg.custom_deal_offer!.id)}
                          onDecline={() => handleDeclineOffer(msg.custom_deal_offer!.id)}
                        />
                      ) : isEditing ? (
                        <div className="w-full min-w-[220px]">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-white/5 border border-gold/40 rounded-xl text-[13px] text-paper outline-none resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-1.5">
                            <button
                              onClick={() => { setEditingId(null); setEditText(''); }}
                              className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-paper/40 bg-white/5 hover:text-paper transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveEdit}
                              disabled={!editText.trim()}
                              className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-black bg-gold hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onMouseDown={() => !isDeleted && startLongPress(msg)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => !isDeleted && startLongPress(msg)}
                          onTouchEnd={endLongPress}
                          className={`px-4 py-2.5 text-[13px] leading-relaxed break-words cursor-pointer select-none ${
                            isMe
                              ? 'bg-gold text-paper rounded-2xl rounded-tr-sm'
                              : 'bg-ink border border-white/8 text-paper/85 rounded-2xl rounded-tl-sm'
                          } ${isDeleted ? 'italic opacity-50' : ''}`}
                        >
                          {msg.quoted_message && !isDeleted && (
                            <div className={`mb-1.5 pl-2 border-l-2 ${isMe ? 'border-white/30' : 'border-gold/50'} text-[11px] opacity-70 truncate max-w-[220px]`}>
                              {msg.quoted_message.deleted_for_everyone ? 'This message was deleted' : msg.quoted_message.content}
                            </div>
                          )}
                          {msg.media_url && msg.media_type === 'image' && (
                            <img src={msg.media_url} alt="" className="rounded-xl max-w-[240px] max-h-[320px] object-cover" />
                          )}
                          {msg.media_url && msg.media_type === 'video' && (
                            <video src={msg.media_url} controls className="rounded-xl max-w-[240px] max-h-[320px]" />
                          )}
                          {!msg.media_url && msg.content}
                        </div>
                      )}

                      {menuMessageId === msg.id && !isEditing && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuMessageId(null)}
                          />
                          <div className={`absolute z-50 top-full mt-1 ${isMe ? 'right-0' : 'left-0'} w-44 bg-[#111a14] border border-white/10 rounded-xl shadow-2xl p-1.5`}>
                            {!isDeleted && (
                              <button
                                onClick={() => { setQuotedMessage(msg); setMenuMessageId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-paper/70 hover:bg-white/8 rounded-lg transition-colors"
                              >
                                <Reply className="w-3.5 h-3.5" /> Quote
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => startEdit(msg)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-paper/70 hover:bg-white/8 rounded-lg transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                            )}
                            {!isDeleted && (
                              <button
                                onClick={() => handleDeleteMessage(msg, false)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-paper/70 hover:bg-white/8 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete for me
                              </button>
                            )}
                            {canDeleteForEveryone && (
                              <button
                                onClick={() => handleDeleteMessage(msg, true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete for everyone
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[10px] text-paper/20">
                          {isOptimistic ? 'Sending...' : formatRelativeTime(msg.created_at)}
                          {msg.edited_at && !isDeleted ? ' · edited' : ''}
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

        <AnimatePresence>
          {(localError || sendError) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-4 mb-2 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-[12px] text-red-400">{localError || sendError}</p>
              </div>
              <button onClick={() => { setLocalError(null); refresh(); }} className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-shrink-0 px-4 py-3 bg-ink border-t border-white/5">
          {pendingMedia && (
            <div className="flex items-center gap-3 mb-2 p-2.5 bg-white/5 border border-white/10 rounded-xl">
              {pendingMedia.mediaType === 'image' ? (
                <img
                  src={pendingMedia.previewUrl}
                  alt=""
                  onClick={() => setShowFullMediaPreview(true)}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                />
              ) : (
                <video
                  src={pendingMedia.previewUrl}
                  onClick={() => setShowFullMediaPreview(true)}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                />
              )}
              <span className="flex-1 text-[12px] text-paper/50">
                {pendingMedia.mediaType === 'image' ? 'Send this photo?' : 'Send this video?'}
              </span>
              <button
                onClick={cancelPendingMedia}
                disabled={uploadingMedia}
                className="w-8 h-8 flex-shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-paper/40 hover:text-paper transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={confirmSendMedia}
                disabled={uploadingMedia}
                className="w-8 h-8 flex-shrink-0 bg-gold rounded-lg flex items-center justify-center text-ink hover:bg-gold-dark transition-colors disabled:opacity-40"
              >
                {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
            </div>
          )}
          {showFullMediaPreview && pendingMedia && (
            <div
              className="fixed inset-0 z-[70] bg-ink/95 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={() => setShowFullMediaPreview(false)}
            >
              <button
                onClick={() => setShowFullMediaPreview(false)}
                className="absolute top-5 right-5 w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-paper/70 hover:text-paper transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              {pendingMedia.mediaType === 'image' ? (
                <img src={pendingMedia.previewUrl} alt="" className="max-w-full max-h-full rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
              ) : (
                <video src={pendingMedia.previewUrl} controls autoPlay className="max-w-full max-h-full rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
              )}
            </div>
          )}
          {quotedMessage && (
            <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 bg-white/5 border-l-2 border-gold rounded-lg">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gold uppercase tracking-wider mb-0.5">
                  Replying to {quotedMessage.sender_id === user?.id ? 'yourself' : (otherParticipantName || 'them')}
                </p>
                <p className="text-[12px] text-paper/50 truncate">{quotedMessage.content}</p>
              </div>
              <button
                onClick={() => setQuotedMessage(null)}
                className="w-6 h-6 flex-shrink-0 bg-white/5 rounded-lg flex items-center justify-center text-paper/40 hover:text-paper transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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
                className="flex items-center gap-2 px-3 py-2 bg-gold/8 border border-gold/20 rounded-xl text-[12px] font-bold text-gold/80 hover:text-gold hover:bg-gold/12 transition-colors"
              >
                <Tag className="w-3.5 h-3.5" />
                Create Custom Deal Offer
              </button>
            </div>
          )}
          {offPlatformWarning && (
            <div className="flex items-start gap-2 mb-2 px-3 py-2 bg-gold/8 border border-gold/20 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-paper/80 leading-snug">{offPlatformWarning.message}</p>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-paper/40 hover:text-paper transition-colors disabled:opacity-40"
            >
              {uploadingMedia ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
            <div className="flex-1 bg-white/5 border border-white/8 rounded-full px-4 py-2.5 focus-within:border-gold/50 transition-colors">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${otherParticipantName || ''}...`}
                rows={1}
                className="w-full bg-transparent outline-none resize-none text-[13px] text-paper placeholder-white/25 leading-relaxed"
                style={{ minHeight: '22px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!newMessage.trim() || isSending}
              className="w-10 h-10 bg-gold rounded-full flex items-center justify-center text-paper hover:bg-gold-dark disabled:opacity-35 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-paper/15 mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
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