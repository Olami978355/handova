import React, { useState } from 'react';
import { Scale, X, Check } from 'lucide-react';
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
        className="w-full bg-slate/20 border border-gold/15 rounded-2xl p-5 text-left hover:border-gold/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gold/12 rounded-xl flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-paper mb-1">Are you a lawyer?</p>
            <p className="text-[11px] text-paper/45 leading-relaxed">
              Get listed in the Handova lawyer directory and get paid to review tenancy agreements.
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
                  <Scale className="w-5 h-5 text-gold" />
                </div>
                <h3 className="text-[16px] font-bold text-paper">Become a Verified Lawyer</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-paper/60 leading-relaxed mb-5">
              Tenants and landlords on Handova can pay to have you review their tenancy agreement before signing. Get verified once, then get found and booked directly.
            </p>

            <div className="space-y-3 mb-6">
              {[
                'Listed in the searchable lawyer directory',
                'Set your own specialty and states covered',
                'Get booked and paid through Handova',
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
              We manually verify your NBA enrollment number and practicing certificate before your profile goes live. This usually takes 24-48 hours.
            </p>

            <button
              onClick={() => navigate('/lawyer/verification')}
              className="w-full bg-gold text-ink py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors"
            >
              Apply Now
            </button>
          </div>
        </div>
      )}
    </>
  );
};
