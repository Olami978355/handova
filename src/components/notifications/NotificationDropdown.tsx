import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, ShieldCheck, ShieldX, Home,
  XCircle, DollarSign, MessageCircle, Info, Bell, Check,
  ArrowRight, X
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'inspection_requested':
      case 'inspection_booked':
        return <Calendar className="text-gold" size={19} />;
      case 'inspection_confirmed':
        return <CheckCircle className="text-emerald-400" size={19} />;
      case 'verification_approved':
        return <ShieldCheck className="text-emerald-400" size={19} />;
      case 'verification_rejected':
        return <ShieldX className="text-red-400" size={19} />;
      case 'listing_approved':
        return <Home className="text-emerald-400" size={19} />;
      case 'listing_rejected':
        return <XCircle className="text-red-400" size={19} />;
      case 'deal_state_change':
      case 'custom_deal_offer':
      case 'refund_processed':
        return <DollarSign className="text-gold" size={19} />;
      case 'new_message':
        return <MessageCircle className="text-sky-400" size={19} />;
      default:
        return <Info className="text-white/40" size={19} />;
    }
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.read) await markAsRead(notification.id);
    onClose();
    navigate(notification.link || '/notifications');
  };

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0B0D10]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-5 sm:px-8">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-gold/75">HANDOVA</p>
          <h2 className="text-xl font-bold text-white sm:text-2xl">Notifications</h2>
          <p className="mt-1 text-[11px] text-white/40">
            {unreadCount > 0 ? `${unreadCount} unread in this view` : 'You’re all caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-gold/80 transition-colors hover:bg-gold/10 hover:text-gold"
            >
              <Check size={14} />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-colors hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              <p className="text-xs text-white/40">Loading notifications</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <Bell className="h-7 w-7 text-white/25" />
              </div>
              <p className="text-base font-semibold text-white/75">Nothing to see yet</p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/35">
                Updates about your properties, inspections and transactions will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => void handleClick(notification)}
                  className={`relative flex w-full items-start gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.035] sm:px-8 ${
                    !notification.read ? 'bg-gold/[0.045]' : ''
                  }`}
                >
                  <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                    {getIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`text-sm leading-snug ${
                        notification.read ? 'font-medium text-white/65' : 'font-bold text-white'
                      }`}>
                        {notification.title}
                      </p>
                      <span className="whitespace-nowrap text-[10px] text-white/30">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                      {notification.body}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 justify-center border-t border-white/[0.08] px-5 py-4">
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/notifications');
          }}
          className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-xs font-bold text-white/65 transition-colors hover:border-gold/25 hover:bg-gold/10 hover:text-gold"
        >
          View all notifications
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
