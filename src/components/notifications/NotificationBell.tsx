import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '../../types';

interface NotificationBellProps {
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  notifications,
  loading,
  markAsRead,
  markAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-[#1a6b3c]/20 text-[#f0c040]'
            : 'text-white/50 hover:text-white hover:bg-white/8'
        }`}
      >
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-1 right-1 w-4 h-4 bg-[#f0c040] text-black text-[9px] font-black rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 z-50 origin-top-right"
          >
            <NotificationDropdown
              notifications={notifications}
              loading={loading}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
              onClose={() => setIsOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};