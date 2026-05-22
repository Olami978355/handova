import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, ShieldCheck, ShieldX, Home,
  XCircle, DollarSign, MessageCircle, Info, Bell, Check
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

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'inspection_requested':  return <Calendar className="text-[#f0c040]" size={16} />;
      case 'inspection_confirmed':  return <CheckCircle className="text-[#1a6b3c]" size={16} />;
      case 'verification_approved': return <ShieldCheck className="text-[#1a6b3c]" size={16} />;
      case 'verification_rejected': return <ShieldX className="text-red-400" size={16} />;
      case 'listing_approved':      return <Home className="text-[#1a6b3c]" size={16} />;
      case 'listing_rejected':      return <XCircle className="text-red-400" size={16} />;
      case 'deal_state_change':     return <DollarSign className="text-[#f0c040]" size={16} />;
      case 'new_message':           return <MessageCircle className="text-[#1a6b3c]" size={16} />;
      default:                      return <Info className="text-white/30" size={16} />;
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
    onClose();
  };

  return (
    <div
      className="bg-[#0a1f11] border border-white/8 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
      style={{ maxHeight: 480 }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between flex-shrink-0">
        <span className="text-[13px] font-bold text-white">Notifications</span>
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#f0c040]/60 hover:text-[#f0c040] transition-colors"
        >
          <Check size={12} />
          Mark all read
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
            <p className="text-[12px] text-white/30">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 bg-white/4 rounded-2xl flex items-center justify-center mb-3">
              <Bell className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-[13px] font-semibold text-white/40 mb-1">No notifications yet</p>
            <p className="text-[11px] text-white/20">We'll alert you when something happens.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full px-5 py-3.5 flex items-start gap-3 text-left hover:bg-white/4 transition-colors relative ${
                  !notif.read ? 'bg-[#1a6b3c]/8' : ''
                }`}
              >
                <div className="w-8 h-8 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center flex-shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className={`text-[12px] leading-snug truncate ${
                      !notif.read ? 'font-bold text-white' : 'font-medium text-white/60'
                    }`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-white/25 whitespace-nowrap flex-shrink-0">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/35 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
                {!notif.read && (
                  <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-[#f0c040] rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-full text-[11px] font-semibold text-white/25 hover:text-white/50 transition-colors text-center"
        >
          Close
        </button>
      </div>
    </div>
  );
};
