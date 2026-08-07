import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const SLIDES = [
  {
    image: '/marketing/dashboard.png',
    headline: 'List instantly, manage effortlessly.',
    text: 'Post a property and start receiving inspection requests within minutes.',
  },
  {
    image: '/marketing/agreement-draft.png',
    headline: 'Agreements, handled.',
    text: 'Generate or upload a tenancy agreement in seconds.',
  },
  {
    image: '/marketing/sign-agreement.png',
    headline: 'Your money, held safely.',
    text: 'Funds are secured in escrow the moment payment is made — released only when both sides confirm.',
  },
  {
    image: '/marketing/funds-released.png',
    headline: 'Every deal, seen through.',
    text: 'From move-in to payout, track each step until the transaction is fully complete.',
  },
];

const DISMISS_KEY = 'handova_dashboard_promo_dismissed_session';
const ROTATE_MS = 4000;

export const FeatureCarousel: React.FC = () => {
  const [dismissed, setDismissed] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (dismissed || paused) return;
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [dismissed, paused]);

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  if (dismissed) return null;

  const slide = SLIDES[index];

  return (
    <div
      className="relative bg-slate/20 border border-white/6 rounded-2xl p-4 pt-3 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-lg text-paper/30 hover:text-paper hover:bg-white/8 transition-colors z-20"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-4">
        {/* Device frame — full screenshot visible, not cropped */}
        <div className="flex-shrink-0 w-[110px] h-[200px] rounded-[18px] border-[3px] border-white/12 bg-ink overflow-hidden relative shadow-lg">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/40 rounded-full z-10" />
          <AnimatePresence mode="wait">
            <motion.img
              key={slide.image}
              src={slide.image}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="w-full h-full object-cover object-top"
            />
          </AnimatePresence>
        </div>

        <div className="min-w-0 flex-1 pr-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.headline}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[14px] font-bold text-paper mb-1.5 leading-snug">{slide.headline}</p>
              <p className="text-[12px] text-paper/50 leading-relaxed">{slide.text}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-1.5 mt-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-gold' : 'w-1.5 bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
