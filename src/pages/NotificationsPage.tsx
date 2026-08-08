import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Calendar, CheckCircle, ShieldCheck, ShieldX, Home, XCircle, DollarSign, MessageCircle, Info, ArrowLeft } from 'lucide-react';
import { useNotificationsContext } from '../context/NotificationsContext';
import { Notification } from '../types';
import { formatRelativeTime } from '../utils/format';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'inspection_requested':
    case 'inspection_booked': return <Calendar className="text-gold" size={16} />;
    case 'inspection_confirmed': return <CheckCircle className="text-gold" size={16} />;
    case 'verification_approved': return <ShieldCheck className="text-gold" size={16} />;
    case 'verification_rejected': return <ShieldX className="text-red-400" size={16} />;
    case 'listing_approved': return <Home className="text-gold" size={16} />;
    case 'listing_rejected': return <XCircle className="text-red-400" size={16} />;
    case 'deal_state_change':
    case 'custom_deal_offer': return <DollarSign className="text-gold" size={16} />;
    case 'new_message': return <MessageCircle className="text-gold" size={16} />;
    case 'refund_processed': return <CheckCircle className="text-[#4ade80]" size={16} />;
    default: return <Info className="text-paper/30" size={16} />;
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotificationsContext();

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-ink overflow-y-auto" style={font}>
      <div className="px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[18px] font-black text-paper">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-[12px] text-paper/30">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-[12px] font-bold text-gold/70 hover:text-gold transition-colors"
            >
              <Check size={14} />
              Mark all read
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-paper/30">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-paper/20" />
            </div>
            <p className="text-[15px] font-bold text-paper/40 mb-1">No notifications yet</p>
            <p className="text-[12px] text-paper/20">We'll alert you when something happens.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full p-4 rounded-2xl border flex items-start gap-3 text-left transition-all hover:border-white/12 ${
                  !notif.read
                    ? 'bg-gold/8 border-gold/20'
                    : 'bg-ink border-white/6'
                }`}
              >
                <div className="w-9 h-9 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className={`text-[13px] leading-snug ${!notif.read ? 'font-bold text-paper' : 'font-medium text-paper/55'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-paper/25 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-[12px] text-paper/40 leading-relaxed">
                    {notif.body}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mt-1.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}