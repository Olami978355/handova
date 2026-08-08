import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const RentEasyLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="18" fill="#D4AF37" />
    <path d="M16 54 L16 32 L40 14 L64 32 L64 54" stroke="#D4AF37" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 54 L28 54" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" />
    <path d="M54 54 L64 54" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 54 L28 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="28" cy="38" r="6" fill="none" stroke="white" strokeWidth="3" />
    <rect x="43" y="42" width="16" height="13" rx="3" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="2" />
    <path d="M46 42 L46 38 Q46 35 51 35 Q56 35 56 38 L56 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M47.5 48.5 L50 51 L54.5 46" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as 'email' | 'recovery' | null;

    if (!token_hash || !type) {
      setStatus('error');
      setError('Invalid or missing confirmation link. Please request a new one.');
      return;
    }

    supabase.auth.verifyOtp({ token_hash, type })
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          setError(error.message.includes('expired')
            ? 'This confirmation link has expired. Please sign up again.'
            : error.message
          );
        } else {
          setStatus('success');
        }
      });
  }, []);

  return (
    <div
      className="min-h-screen bg-ink flex items-center justify-center px-5"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="flex justify-center mb-8">
          <RentEasyLogo size={48} />
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-6" />
            <h2 className="text-[24px] font-black text-paper mb-3">Confirming your email...</h2>
            <p className="text-[14px] text-paper/45">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-gold/20 border border-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[#4ade80]" />
            </div>
            <h2 className="text-[28px] font-black text-paper mb-3">Email confirmed!</h2>
            <p className="text-[14px] text-paper/50 leading-relaxed mb-8">
              Your email has been verified. Let's set up your profile.
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full bg-gold text-black py-4 rounded-xl font-bold text-[15px] hover:bg-[#e0b030] transition-colors"
            >
              Continue to Setup
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-[28px] font-black text-paper mb-3">Verification failed</h2>
            <p className="text-[14px] text-paper/50 leading-relaxed mb-8">{error}</p>
            <button
              onClick={() => navigate('/signup')}
              className="w-full bg-gold text-black py-4 rounded-xl font-bold text-[15px] hover:bg-[#e0b030] transition-colors mb-3"
            >
              Sign Up Again
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-white/5 text-paper/60 py-4 rounded-xl font-bold text-[15px] hover:bg-white/8 transition-colors"
            >
              Back to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}