import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const fromMessage = location.state?.message;

  const getDashboardPath = (role?: string) => {
    if (!role) return '/dashboard';
    if (role === 'admin' || role === 'moderator') return '/admin';
    if (role === 'landlord') return '/landlord/dashboard';
    if (role === 'agent') return '/agent/dashboard';
    return '/listings';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Fetch profile to get role for redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single();

        navigate(getDashboardPath(profile?.role), { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      if (message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (message.includes('Email not confirmed')) {
        setError('Please confirm your email address before logging in. Check your inbox.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Left panel — branding (desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1f11] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 40%, #1a6b3c 0%, transparent 60%),
                              radial-gradient(circle at 80% 80%, #f0c040 0%, transparent 40%)`
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg, transparent, transparent 60px,
              rgba(255,255,255,0.02) 60px, rgba(255,255,255,0.02) 61px
            ), repeating-linear-gradient(
              90deg, transparent, transparent 60px,
              rgba(255,255,255,0.02) 60px, rgba(255,255,255,0.02) 61px
            )`
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <HandovaLogo size={40} />
          <span className="text-[22px] font-extrabold tracking-tight text-white">
            Hand<span className="text-[#f0c040]">ova</span>
          </span>
        </div>

        {/* Center content */}
        <div className="relative">
          <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-4">
            Nigeria's trusted platform
          </div>
          <h2 className="text-[36px] font-black text-white leading-tight tracking-tight mb-6">
            Welcome back.<br />
            Your properties<br />
            are waiting.
          </h2>
          <p className="text-[14px] text-white/50 leading-relaxed max-w-xs">
            Manage your listings, track escrow payments, 
            and communicate with tenants, all in one place.
          </p>

          {/* Feature bullets */}
          <div className="mt-10 space-y-4">
            {[
              'Escrow-protected payments',
              'NIN-verified landlords & agents',
              'Real-time chat & notifications',
              'Permanent deal audit trail',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-[#f0c040]/15 border border-[#f0c040]/25 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-[#f0c040] rounded-full" />
                </div>
                <span className="text-[13px] text-white/55">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative">
          <p className="text-[12px] text-white/25">
            © {new Date().getFullYear()} Handova Nigeria
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col justify-center px-5 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <HandovaLogo size={32} />
          <span className="text-[18px] font-extrabold tracking-tight text-white">
            Hand<span className="text-[#f0c040]">ova</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[28px] lg:text-[32px] font-black text-white tracking-tight mb-2">
              Sign in
            </h1>
            <p className="text-[14px] text-white/45">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-[#f0c040] font-semibold hover:text-[#e0b030] transition-colors"
              >
                Create one free
              </Link>
            </p>
          </div>

          {/* Messages */}
          {fromMessage && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-[#1a6b3c]/15 border border-[#1a6b3c]/25 rounded-xl">
              <div className="w-4 h-4 bg-[#4ade80] rounded-full flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#4ade80]">{fromMessage}</p>
            </div>
          )}

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

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-3 p-4 bg-[#1a6b3c]/15 border border-[#1a6b3c]/25 rounded-xl"
            >
              <div className="w-4 h-4 bg-[#4ade80] rounded-full flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#4ade80]">{successMsg}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] text-[#f0c040]/70 hover:text-[#f0c040] transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a6b3c] text-white py-4 rounded-xl font-bold text-[15px] hover:bg-[#0f4a2a] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[12px] text-white/25 font-medium">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Sign up CTA */}
          <Link
            to="/signup"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[14px] font-semibold text-white/65 hover:bg-white/8 hover:text-white transition-all"
          >
            Create a new account
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Legal note */}
          <p className="mt-8 text-[11px] text-white/25 text-center leading-relaxed">
            By signing in you agree to our{' '}
            <Link to="/legal#terms" className="text-white/40 hover:text-white/60 transition-colors underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/legal#privacy" className="text-white/40 hover:text-white/60 transition-colors underline">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}