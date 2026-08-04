import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Shield, BadgeCheck, MessageSquare, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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

const WatermarkLogo = () => (
  <svg
    className="absolute -right-24 -bottom-24 pointer-events-none"
    width="560" height="790" viewBox="-60 -85 120 170" fill="none"
    style={{ opacity: 0.05 }}
  >
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
  const { clearSessionExpired } = useAuth();

  useEffect(() => {
    if (fromMessage) clearSessionExpired();
  }, []);

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

  const features = [
    { icon: Shield, label: 'Escrow-protected payments' },
    { icon: BadgeCheck, label: 'NIN-verified landlords and agents' },
    { icon: MessageSquare, label: 'Real-time chat and notifications' },
    { icon: History, label: 'Permanent deal audit trail' },
  ];

  return (
    <div
      className="min-h-screen bg-ink flex"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="hidden lg:flex lg:w-1/2 bg-slate/20 flex-col justify-between p-12 relative overflow-hidden">
        <WatermarkLogo />
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

        <div className="relative flex items-center gap-3">
          <HandovaLogo size={40} />
          <span className="text-[22px] font-extrabold tracking-tight text-paper">
            Hand<span className="text-gold">ova</span>
          </span>
        </div>

        <div className="relative">
          <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-4">
            Nigeria's trusted platform
          </div>
          <h2 className="font-serif text-[36px] font-semibold text-paper leading-tight tracking-tight mb-6">
            Welcome back.<br />
            Your properties<br />
            are waiting.
          </h2>
          <p className="text-[14px] text-paper/50 leading-relaxed max-w-xs">
            Manage your listings, track escrow payments,
            and communicate with tenants, all in one place.
          </p>

          <div className="mt-10 space-y-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-gold/12 border border-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-gold" />
                </div>
                <span className="text-[13px] text-paper/55">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-[12px] text-paper/25">
            © {new Date().getFullYear()} Handova Nigeria
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 py-12 lg:px-16">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <HandovaLogo size={32} />
          <span className="text-[18px] font-extrabold tracking-tight text-paper">
            Hand<span className="text-gold">ova</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h1 className="font-serif text-[30px] lg:text-[34px] font-semibold text-paper tracking-tight mb-2">
              Sign in
            </h1>
            <p className="text-[14px] text-paper/45">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-gold font-semibold hover:text-gold-dark transition-colors"
              >
                Create one free
              </Link>
            </p>
          </div>

          {fromMessage && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-gold/10 border border-gold/20 rounded-xl">
              <div className="w-4 h-4 bg-gold rounded-full flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-gold">{fromMessage}</p>
            </div>
          )}

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

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-3 p-4 bg-gold/10 border border-gold/20 rounded-xl"
            >
              <div className="w-4 h-4 bg-gold rounded-full flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-gold">{successMsg}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] text-gold/70 hover:text-gold transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-paper/25 hover:text-paper/60 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-ink py-4 rounded-xl font-bold text-[15px] hover:bg-gold-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[12px] text-paper/25 font-medium">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <Link
            to="/signup"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[14px] font-semibold text-paper/65 hover:bg-white/8 hover:text-paper transition-all"
          >
            Create a new account
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="mt-8 text-[11px] text-paper/25 text-center leading-relaxed">
            By signing in you agree to our{' '}
            <Link to="/legal#terms" className="text-paper/40 hover:text-paper/60 transition-colors underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/legal#privacy" className="text-paper/40 hover:text-paper/60 transition-colors underline">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
