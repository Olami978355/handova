import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { HandovaLogo } from '../../components/brand/HandovaMark';
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
          <HandovaLogo size={48} />
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