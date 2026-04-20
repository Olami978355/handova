import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, CheckCircle, ShieldCheck, ShieldX, Home, 
  XCircle, DollarSign, MessageCircle, Info, Bell,
  Check, Loader2
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/format';
import { Notification } from '../../types';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'inspection_requested': return <Calendar className="text-blue-500" size={18} />;
      case 'inspection_confirmed': return <CheckCircle className="text-green-500" size={18} />;
      case 'verification_approved': return <ShieldCheck className="text-green-600" size={18} />;
      case 'verification_rejected': return <ShieldX className="text-red-500" size={18} />;
      case 'listing_approved': return <Home className="text-green-500" size={18} />;
      case 'listing_rejected': return <XCircle className="text-red-500" size={18} />;
      case 'deal_state_change': return <DollarSign className="text-amber-500" size={18} />;
      case 'new_message': return <MessageCircle className="text-[#1a6b3c]" size={18} />;
      default: return <Info className="text-gray-400" size={18} />;
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
    onClose();
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[500px]">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
        <h3 className="font-bold text-gray-900">Notifications</h3>
        <button
          onClick={markAllAsRead}
          className="text-xs font-bold text-[#1a6b3c] hover:text-[#14522e] flex items-center gap-1 transition-colors"
        >
          <Check size={14} />
          Mark all as read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="animate-spin text-[#1a6b3c] mb-2" />
            <p className="text-sm text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <Bell size={32} />
            </div>
            <h4 className="font-bold text-gray-900 mb-1">No notifications yet</h4>
            <p className="text-sm text-gray-400 max-w-[200px]">
              We'll notify you when something important happens.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full p-4 flex items-start gap-4 hover:bg-gray-50 transition-all text-left relative ${
                  !notif.read ? 'bg-green-50/30' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} truncate`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
                {!notif.read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-[#1a6b3c] rounded-full shadow-sm shadow-[#1a6b3c]/50" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/50 text-center">
        <button
          onClick={onClose}
          className="text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
