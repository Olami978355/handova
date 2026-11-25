import React, { useState } from 'react';
import { Scale, X, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LawyerFeatureCard: React.FC = () => {
  const { profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  if (profile?.is_lawyer) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="group w-full bg-[#14181e] border border-white/[0.07] rounded-2xl p-4 text-left hover:border-gold/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-paper mb-1">Are you a lawyer?</p>
            <p className="text-[11px] text-paper/45 leading-relaxed">
              Join the Handova directory and offer agreement review services.
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
                  <Scale className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-paper">Join as a Lawyer</h3>
                  <p className="text-[11px] text-paper/40 mt-0.5">Build your practice on Handova</p>
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
              Tenants and landlords on Handova can engage you to review tenancy agreements before signing. Get verified and become discoverable in the lawyer directory.
            </p>

            <div className="bg-[#101419] border border-white/[0.06] rounded-xl p-4 space-y-3 mb-5">
              <p className="text-[10px] text-paper/35 uppercase tracking-wider font-bold mb-1">As a listed lawyer, you can</p>
              {[
                'Appear in the searchable lawyer directory',
                'Set your specialty and states covered',
                'Receive bookings and payments through Handova',
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
              We manually verify your NBA enrolment number and practising certificate before your profile goes live. Verification usually takes 24–48 hours.
            </p>

            <button
              onClick={() => navigate('/lawyer/verification')}
              className="w-full bg-gold text-ink py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors"
            >
              Apply for Verification
            </button>
          </div>
        </div>
      )}
    </>
  );
};
