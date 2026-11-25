import React, { useState } from 'react';
import { Users, X, Check, ArrowRight } from 'lucide-react';

export const DelegateFeatureCard: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="group w-full bg-[#14181e] border border-white/[0.07] rounded-2xl p-4 text-left hover:border-gold/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-paper mb-1">Managing a deal remotely?</p>
            <p className="text-[11px] text-paper/45 leading-relaxed">
              Let someone you trust handle selected tasks on your behalf.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-paper/30 group-hover:text-gold transition-colors flex-shrink-0" />
        </div>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#171b21] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-paper">Deal Delegates</h3>
                  <p className="text-[11px] text-paper/40 mt-0.5">Trusted help, on your terms</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-paper/45 hover:text-paper transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-paper/60 leading-relaxed mb-5">
              Renting from abroad or handling a deal on someone else's behalf? Invite a trusted person to act for you on a specific deal, with only the permissions you choose to grant.
            </p>

            <div className="bg-[#101419] border border-white/[0.06] rounded-xl p-4 space-y-3 mb-5">
              <p className="text-[10px] text-paper/35 uppercase tracking-wider font-bold mb-1">What a delegate can do</p>
              {[
                'Sign the tenancy agreement',
                'Pay into escrow',
                'Confirm move-in',
                'Attend a property inspection',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-gold" />
                  </div>
                  <span className="text-[12px] text-paper/70">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-paper/40 leading-relaxed mb-5">
              You remain in control. Delegates only receive the permissions you grant, and you can revoke access at any time. Look for the Delegates section on an active deal to invite someone.
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-gold text-ink py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
