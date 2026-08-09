import React, { useState } from 'react';
import { Users, X, Check } from 'lucide-react';

export const DelegateFeatureCard: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-slate/20 border border-gold/15 rounded-2xl p-5 text-left hover:border-gold/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gold/12 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-paper mb-1">Managing a deal from far away?</p>
            <p className="text-[11px] text-paper/45 leading-relaxed">
              Add a trusted delegate to sign, pay, or attend inspections on your behalf.
            </p>
          </div>
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-5" onClick={() => setShowModal(false)}>
          <div
            className="bg-slate/20 border border-white/8 rounded-2xl p-6 max-w-md w-full"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/12 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <h3 className="text-[16px] font-bold text-paper">Delegates</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-paper/60 leading-relaxed mb-5">
              Renting from abroad, or handling a deal on someone else's behalf? You can invite a trusted person to act for you on a specific deal, with only the permissions you choose to grant.
            </p>

            <div className="space-y-3 mb-6">
              {[
                'Sign the tenancy agreement',
                'Pay into escrow',
                'Confirm move-in',
                'Attend a property inspection',
              ].map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-gold/12 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-gold" />
                  </div>
                  <span className="text-[12px] text-paper/70">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-paper/35 leading-relaxed mb-5">
              You stay in control the whole time — a delegate only gets exactly the permissions you grant, and you can revoke access at any point. Look for the "Delegates" section on any active deal to invite someone.
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
