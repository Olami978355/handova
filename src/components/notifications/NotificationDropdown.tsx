import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, ShieldCheck, ShieldX, Home,
  XCircle, DollarSign, MessageCircle, Info, Bell, Check, ArrowRight
} from 'lucide-react';
import { Notification } from '../../types';
import { formatRelativeTime } from '../../utils/format';

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  loading,
  markAsRead,
  markAllAsRead,
  onClose,
}) => {
  const navigate = useNavigate();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'inspection_requested':
      case 'inspection_booked':
        return <Calendar className="text-gold" size={17} />;
      case 'inspection_confirmed':
        return <CheckCircle className="text-emerald-400" size={17} />;
      case 'verification_approved':
        return <ShieldCheck className="text-emerald-400" size={17} />;
      case 'verification_rejected':
        return <ShieldX className="text-red-400" size={17} />;
      case 'listing_approved':
        return <Home className="text-emerald-400" size={17} />;
      case 'listing_rejected':
        return <XCircle className="text-red-400" size={17} />;
      case 'deal_state_change':
      case 'custom_deal_offer':
      case 'refund_processed':
        return <DollarSign className="text-gold" size={17} />;
      case 'new_message':
        return <MessageCircle className="text-sky-400" size={17} />;
      default:
        return <Info className="text-white/40" size={17} />;
    }
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.read) await markAsRead(notification.id);
    onClose();
    if (notification.link) navigate(notification.link);
    else navigate('/notifications');
  };

  return (
    <div
      className="flex max-h-[min( min(75vh,560px),560px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101216] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-[14px] font-bold text-white">Notifications</h3>
          <p className="mt-0.5 text-[10px] text-white/35">
            {unreadCount > 0 ? `${unreadCount} unread in this list` : 'You’re all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-gold/80 transition-colors hover:bg-gold/10 hover:text-gold"
          >
            <Check size={13} />
            Mark all read
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-[11px] text-white/35">Loading notifications</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
              <Bell className="h-5 w-5 text-white/25" />
            </div>
            <p className="text-[13px] font-semibold text-white/65">Nothing to see yet</p>
            <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-white/35">
              Updates about your properties, inspections and transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => void handleClick(notification)}
                className={`relative flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.04] ${
                  !notification.read ? 'bg-gold/[0.045]' : ''
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                  {getIcon(notification.type)}
                </div>
                <div className="min-w-0 flex-1 pr-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-[12px] leading-snug ${
                      notification.read ? 'font-medium text-white/65' : 'font-bold text-white'
                    }`}>
                      {notification.title}
                    </p>
                    <span className="flex-shrink-0 whitespace-nowrap pt-0.5 text-[9px] text-white/30">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">
                    {notification.body}
                  </p>
                </div>
                {!notification.read && (
                  <span className="absolute right-3 top-5 h-1.5 w-1.5 rounded-full bg-gold" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-white/[0.07] p-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/notifications');
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-4 py-3 text-[11px] font-bold text-white/65 transition-colors hover:bg-gold/10 hover:text-gold"
        >
          View all notifications
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
