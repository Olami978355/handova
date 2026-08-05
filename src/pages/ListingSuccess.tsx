import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LayoutDashboard } from 'lucide-react';
import { WatermarkLogo } from '../components/brand/HandovaMark';
import { motion } from 'framer-motion';

export const ListingSuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-5 relative overflow-hidden">
      <WatermarkLogo className="absolute -right-32 -bottom-32 opacity-[0.05]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-md w-full bg-slate/25 rounded-3xl p-8 text-center border border-paper/10 relative"
      >
        <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 text-gold flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} strokeWidth={2} />
        </div>

        <h1 className="font-serif text-3xl text-paper mb-3">Listing submitted</h1>
        <p className="font-sans text-paper/55 mb-8 leading-relaxed">
          Your property is being reviewed. You will be notified as soon as it goes live.
        </p>

        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-full font-sans font-semibold text-ink bg-gold hover:bg-gold-dark transition-colors"
          >
            <LayoutDashboard size={18} />
            Go to dashboard
          </Link>

          <Link
            to="/listings"
            className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-full font-sans font-semibold text-paper/70 border border-paper/15 hover:bg-paper/5 transition-colors"
          >
            Browse listings
          </Link>
        </div>

        <div className="mt-10 pt-8 border-t border-paper/10 text-left">
          <p className="font-sans text-xs uppercase tracking-wider text-paper/35 mb-5">What happens next</p>
          <div className="flex flex-col gap-5">
            {[
              { n: '01', t: 'Your details are reviewed', d: 'We check the listing information and ownership documents.' },
              { n: '02', t: 'It goes live', d: 'Once approved, your listing becomes visible to people browsing Handova.' },
              { n: '03', t: 'You get requests', d: 'Inspection requests and deals start coming through the platform.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-4">
                <span className="font-sans text-gold/50 text-sm tabular-nums pt-0.5 flex-shrink-0">{step.n}</span>
                <div>
                  <h3 className="font-sans text-paper text-sm font-semibold mb-0.5">{step.t}</h3>
                  <p className="font-sans text-paper/50 text-sm leading-relaxed">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
