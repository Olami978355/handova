import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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

const DISMISS_KEY = 'handova_dashboard_promo_dismissed';
const ROTATE_MS = 4500;

export const FeatureCarousel: React.FC = () => {
  const [dismissed, setDismissed] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
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
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  if (dismissed) return null;

  const slide = SLIDES[index];

  return (
    <div
      className="relative bg-slate/20 border border-white/6 rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-lg text-paper/30 hover:text-paper hover:bg-white/8 transition-colors z-10"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex-shrink-0 w-[64px] h-[112px] rounded-[14px] border-2 border-white/10 bg-ink overflow-hidden relative">
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-white/15 rounded-full z-10" />
        <img
          src={slide.image}
          alt=""
          className="w-full h-full object-cover object-top"
        />
      </div>

      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[13px] font-bold text-paper mb-1 truncate">{slide.headline}</p>
        <p className="text-[11px] text-paper/45 leading-snug line-clamp-2">{slide.text}</p>
        <div className="flex items-center gap-1.5 mt-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-4 bg-gold' : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
