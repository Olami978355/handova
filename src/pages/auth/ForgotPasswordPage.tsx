import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

const HandovaLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="-60 -85 120 170" fill="none">
    <path d="M-50 -70 L-20 -55 L-20 55 L-50 70 Z" fill="#D4AF37" />
    <path d="M50 -70 L20 -55 L20 55 L50 70 Z" fill="#D4AF37" />
    <circle cx="-32" cy="0" r="17" fill="none" stroke="#D4AF37" strokeWidth="9" />
    <rect x="-15" y="-4.5" width="35" height="9" fill="#D4AF37" />
    <rect x="10" y="4.5" width="8" height="10" fill="#D4AF37" />
    <rect x="22" y="4.5" width="8" height="10" fill="#D4AF37" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-12"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex items-center gap-2.5 mb-10">
        <HandovaLogo size={32} />
        <span className="text-[18px] font-extrabold tracking-tight text-white">
          Hand<span className="text-[#f0c040]">ova</span>
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#0a1f11] border border-white/8 rounded-2xl p-8"
      >
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-[#1a6b3c]/15 border border-[#1a6b3c]/25 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-6 h-6 text-[#4ade80]" />
            </div>
            <h1 className="text-[20px] font-black text-white mb-2">Check your email</h1>
            <p className="text-[13px] text-white/45 leading-relaxed mb-6">
              If an account exists for {email}, a password reset link has been sent. It may take a few minutes to arrive.
            </p>
            <Link
              to="/login"
              className="text-[13px] font-semibold text-[#f0c040] hover:text-[#e0b030] transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-black text-white tracking-tight mb-2">
              Reset your password
            </h1>
            <p className="text-[14px] text-white/45 mb-8">
              Enter the email on your account and we'll send you a link to reset your password.
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-400">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a6b3c] text-white py-4 rounded-xl font-bold text-[15px] hover:bg-[#0f4a2a] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-[13px] text-white/45 text-center">
              Remembered it?{' '}
              <Link to="/login" className="text-[#f0c040] font-semibold hover:text-[#e0b030] transition-colors">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
