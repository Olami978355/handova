import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { HandovaLogo } from '../../components/brand/HandovaMark';


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
      className="min-h-screen bg-ink flex flex-col items-center justify-center px-5 py-12"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex items-center gap-2.5 mb-10">
        <HandovaLogo size={32} />
        <span className="text-[18px] font-extrabold tracking-tight text-paper">
          Hand<span className="text-gold">ova</span>
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-ink border border-white/8 rounded-2xl p-8"
      >
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-gold/15 border border-gold/25 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-6 h-6 text-gold" />
            </div>
            <h1 className="text-[20px] font-black text-paper mb-2">Check your email</h1>
            <p className="text-[13px] text-paper/45 leading-relaxed mb-6">
              If an account exists for {email}, a password reset link has been sent. It may take a few minutes to arrive.
            </p>
            <Link
              to="/login"
              className="text-[13px] font-semibold text-gold hover:text-[#e0b030] transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-black text-paper tracking-tight mb-2">
              Reset your password
            </h1>
            <p className="text-[14px] text-paper/45 mb-8">
              Enter the email on your account and we'll send you a link to reset your password.
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-danger">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-paper py-4 rounded-xl font-bold text-[15px] hover:bg-gold-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

            <p className="mt-6 text-[13px] text-paper/45 text-center">
              Remembered it?{' '}
              <Link to="/login" className="text-gold font-semibold hover:text-[#e0b030] transition-colors">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
