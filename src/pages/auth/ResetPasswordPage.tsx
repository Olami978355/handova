import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
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

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      navigate('/login', { state: { message: 'Your password has been updated. Please sign in.' } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (message.toLowerCase().includes('session')) {
        setError('This reset link has expired or already been used. Please request a new one.');
      } else {
        setError(message);
      }
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
          Hand<span className="text-gold">ova</span>
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-ink border border-white/8 rounded-2xl p-8"
      >
        <h1 className="text-[24px] font-black text-white tracking-tight mb-2">
          Set a new password
        </h1>
        <p className="text-[14px] text-white/45 mb-8">
          Choose a new password for your account.
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
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-white py-4 rounded-xl font-bold text-[15px] hover:bg-gold-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Update password
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-[13px] text-white/45 text-center">
          <Link to="/login" className="text-gold font-semibold hover:text-[#e0b030] transition-colors">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
