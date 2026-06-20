import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAuth } from '../../context/AuthContext';

export const PushPermissionBanner: React.FC = () => {
  const { user } = useAuth();
  const { supported, permission, subscribed, loading, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('push-banner-dismissed');
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('push-banner-dismissed', 'true');
  };

  const handleEnable = async () => {
    const result = await requestPermission();
    if (!result.success) {
      handleDismiss();
    }
  };

  if (!user || !supported || subscribed || dismissed || permission === 'denied') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 inset-x-4 sm:inset-x-auto sm:right-5 sm:w-80 z-[60] bg-[#0a1f11] border border-[#f0c040]/20 rounded-2xl p-4 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-[#f0c040]/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-[#f0c040]" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-white mb-1">Enable notifications</p>
            <p className="text-[12px] text-white/45 leading-relaxed mb-3">
              Get notified instantly about new messages, deal updates, and inspection confirmations — even when the app is closed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 bg-[#f0c040] text-black py-2 rounded-lg font-bold text-[12px] hover:bg-[#e0b030] transition-colors disabled:opacity-50"
              >
                {loading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-white/40 hover:text-white text-[12px] font-semibold transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};