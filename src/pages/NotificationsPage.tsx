import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, Calendar, CheckCircle, ShieldCheck, ShieldX, Home,
  XCircle, DollarSign, MessageCircle, Info, ArrowLeft, Inbox
} from 'lucide-react';
import { useNotificationsContext } from '../context/NotificationsContext';
import { Notification } from '../types';
import { formatRelativeTime } from '../utils/format';

type Filter = 'all' | 'unread' | 'transactions' | 'inspections' | 'messages' | 'account';

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'messages', label: 'Messages' },
  { id: 'account', label: 'Account' },
];

const getCategory = (type: Notification['type']): Exclude<Filter, 'all' | 'unread'> => {
  if ([
    'deal_state_change',
    'custom_deal_offer',
    'refund_processed',
    'rent_renewal_reminder',
  ].includes(type)) return 'transactions';

  if ([
    'inspection_requested',
    'inspection_confirmed',
    'inspection_booked',
  ].includes(type)) return 'inspections';

  if (type === 'new_message') return 'messages';

  return 'account';
};

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

const getDateGroup = (dateValue: string) => {
  const date = new Date(dateValue);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDay.getTime() === today.getTime()) return 'Today';
  if (itemDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return 'Earlier';
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationsContext();

  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter((item) => !item.read);
    return notifications.filter((item) => getCategory(item.type) === activeFilter);
  }, [notifications, activeFilter]);

  const groups = useMemo(() => {
    const ordered: { title: string; items: Notification[] }[] = [
      { title: 'Today', items: [] },
      { title: 'Yesterday', items: [] },
      { title: 'Earlier', items: [] },
    ];

    filteredNotifications.forEach((notification) => {
      const group = ordered.find((item) => item.title === getDateGroup(notification.created_at));
      group?.items.push(notification);
    });

    return ordered.filter((group) => group.items.length > 0);
  }, [filteredNotifications]);

  const handleClick = async (notification: Notification) => {
    if (!notification.read) await markAsRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] overflow-y-auto bg-ink" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-gold/65">Your activity</p>
              <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Notifications</h1>
              <p className="mt-1 text-[11px] text-white/35">
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'You’re up to date'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-gold/20 bg-gold/[0.06] px-3 py-2.5 text-[10px] font-bold text-gold/80 transition-colors hover:bg-gold/15 hover:text-gold sm:px-4"
            >
              <Check size={13} />
              <span className="hidden sm:inline">Mark all as read</span>
              <span className="sm:hidden">Mark all</span>
            </button>
          )}
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1.5">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              const count = filter.id === 'unread'
                ? unreadCount
                : filter.id === 'all'
                  ? notifications.length
                  : notifications.filter((item) => getCategory(item.type) === filter.id).length;

              return (
                <button
                  type="button"
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[10px] font-bold transition-colors ${
                    active
                      ? 'bg-gold text-black shadow-sm'
                      : 'text-white/45 hover:bg-white/[0.05] hover:text-white/80'
                  }`}
                >
                  {filter.label}
                  <span className={`text-[9px] ${active ? 'text-black/60' : 'text-white/25'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-[12px] text-white/35">Loading your activity</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-white/[0.07] bg-white/[0.02] px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035]">
              {activeFilter === 'unread' ? (
                <CheckCircle className="h-7 w-7 text-gold/50" />
              ) : (
                <Inbox className="h-7 w-7 text-white/25" />
              )}
            </div>
            <h2 className="text-[14px] font-bold text-white/75">
              {activeFilter === 'unread' ? 'You’re all caught up' : 'No notifications here'}
            </h2>
            <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-white/35">
              {activeFilter === 'unread'
                ? 'There are no unread updates waiting for you.'
                : 'When there’s an update in this category, you’ll find it here.'}
            </p>
            {activeFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="mt-5 rounded-xl border border-gold/20 px-4 py-2.5 text-[10px] font-bold text-gold/80 transition-colors hover:bg-gold/10"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-7">
            {groups.map((group) => (
              <section key={group.title}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/35">
                    {group.title}
                  </h2>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[9px] text-white/25">{group.items.length}</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.018]">
                  {group.items.map((notification, index) => (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() => void handleClick(notification)}
                      className={`relative flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-white/[0.04] sm:px-5 ${
                        !notification.read ? 'bg-gold/[0.035]' : ''
                      } ${index > 0 ? 'border-t border-white/[0.055]' : ''}`}
                    >
                      <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                        {getIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <p className={`text-[12px] leading-snug ${
                            notification.read ? 'font-medium text-white/65' : 'font-bold text-white'
                          }`}>
                            {notification.title}
                          </p>
                          <span className="whitespace-nowrap pt-0.5 text-[9px] text-white/30">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                          {notification.body}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.35)]" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
