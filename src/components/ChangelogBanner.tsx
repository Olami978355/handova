import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { changelog, latestChangelogVersion } from '../data/changelog';

const STORAGE_KEY = 'renteasy-changelog-seen-version';

export const ChangelogBanner: React.FC = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || !latestChangelogVersion) return;
    const seenVersion = localStorage.getItem(STORAGE_KEY);

    if (seenVersion === null) {
      // First time we've ever checked on this device — nothing to announce
      // retroactively, just start tracking from here silently.
      localStorage.setItem(STORAGE_KEY, latestChangelogVersion);
      return;
    }

    if (seenVersion !== latestChangelogVersion) {
      setVisible(true);
    }
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, latestChangelogVersion);
    setVisible(false);
  };

  if (!visible) return null;

  const latest = changelog[0];
  if (!latest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 inset-x-4 sm:inset-x-auto sm:right-5 sm:w-96 z-[60] bg-ink border border-gold/30 rounded-2xl p-4 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white mb-2">{latest.title}</p>
            <ul className="space-y-1.5 mb-3">
              {latest.items.map((item, i) => (
                <li key={i} className="text-[12px] text-white/50 leading-relaxed flex gap-2">
                  <span className="text-gold flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleDismiss}
              className="bg-gold text-white px-4 py-1.5 rounded-lg font-bold text-[11px] hover:bg-gold-dark transition-colors"
            >
              Got it
            </button>
          </div>
          <button onClick={handleDismiss} aria-label="Dismiss" className="text-white/30 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
