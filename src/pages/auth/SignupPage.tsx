import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const RentEasyLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="18" fill="#1a6b3c" />
    <path d="M16 54 L16 32 L40 14 L64 32 L64 54" stroke="#f0c040" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 54 L28 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M54 54 L64 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 54 L28 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="28" cy="38" r="6" fill="none" stroke="white" strokeWidth="3" />
    <path d="M32 54 L32 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 54 L36 51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="43" y="42" width="16" height="13" rx="3" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="2" />
    <path d="M46 42 L46 38 Q46 35 51 35 Q56 35 56 38 L56 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M47.5 48.5 L50 51 L54.5 46" stroke="#f0c040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Password strength checker
const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fair', color: '#f0c040' };
  if (score === 3) return { score, label: 'Good', color: '#1a6b3c' };
  return { score, label: 'Strong', color: '#4ade80' };
};

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validations
    if (!agreed) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (authError) throw authError;
      if (!data.user) throw new Error('Signup failed. Please try again.');

      if (data.session) {
        // Email confirmation not required — go straight to onboarding
        navigate('/onboarding');
      } else {
        // Email confirmation required
        setSuccess(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating account';
      if (message.includes('already registered') || message.includes('already been registered')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (message.includes('invalid email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 bg-[#1a6b3c]/20 border border-[#1a6b3c]/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#4ade80]" />
          </div>
          <h2 className="text-[28px] font-black text-white tracking-tight mb-3">
            Check your email
          </h2>
          <p className="text-[14px] text-white/50 leading-relaxed mb-2">
            We sent a confirmation link to
          </p>
          <p className="text-[15px] font-bold text-[#f0c040] mb-8">
            {formData.email}
          </p>
          <p className="text-[13px] text-white/35 mb-8 leading-relaxed">
            Click the link in your email to confirm your account and 
            continue setting up your profile. Check your spam folder 
            if you don't see it.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="text-[13px] text-white/40 hover:text-white/70 transition-colors underline underline-offset-4"
          >
            Try a different email address
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Left panel — branding (desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1f11] flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `radial-gradient(circle at 70% 30%, #f0c040 0%, transparent 50%),
                              radial-gradient(circle at 20% 70%, #1a6b3c 0%, transparent 60%)`
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
          <RentEasyLogo size={40} />
          <span className="text-[22px] font-extrabold tracking-tight text-white">
            Rent<span className="text-[#f0c040]">Easy</span>
          </span>
        </div>

        {/* Center content */}
        <div className="relative">
          <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-4">
            Join the movement
          </div>
          <h2 className="text-[36px] font-black text-white leading-tight tracking-tight mb-6">
            Nigeria's rental<br />
            market is changing.<br />
            <span className="text-[#f0c040]">Be part of it.</span>
          </h2>
          <p className="text-[14px] text-white/50 leading-relaxed max-w-xs">
            Thousands of Nigerians are already renting and listing 
            properties without the Omonile stress.
          </p>

          {/* What you get */}
          <div className="mt-10 space-y-4">
            {[
              { role: 'As a Tenant', desc: 'Find verified properties and pay rent safely via escrow' },
              { role: 'As a Landlord', desc: 'List your property and receive guaranteed payments' },
              { role: 'As an Agent', desc: 'Earn your 10% commission automatically on every deal' },
            ].map(({ role, desc }) => (
              <div key={role} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-[#f0c040]/15 border border-[#f0c040]/25 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-[#f0c040] rounded-full" />
                </div>
                <div>
                  <span className="text-[12px] font-bold text-white/70">{role}: </span>
                  <span className="text-[12px] text-white/40">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-[12px] text-white/25">
            © {new Date().getFullYear()} RentEasy Nigeria
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col justify-center px-5 py-12 lg:px-16 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <RentEasyLogo size={32} />
          <span className="text-[18px] font-extrabold tracking-tight text-white">
            Rent<span className="text-[#f0c040]">Easy</span>
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
              Create your account
            </h1>
            <p className="text-[14px] text-white/45">
              Already have one?{' '}
              <Link
                to="/login"
                className="text-[#f0c040] font-semibold hover:text-[#e0b030] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Error */}
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

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= passwordStrength.score
                            ? passwordStrength.color
                            : 'rgba(255,255,255,0.1)'
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label} password
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-12 py-3.5 bg-white/5 border rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none transition-colors ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-500/40 focus:border-red-500/60'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-[#1a6b3c] focus:border-[#1a6b3c]'
                      : 'border-white/10 focus:border-[#1a6b3c]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {/* Match indicator */}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4ade80]" />
                )}
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1.5">Passwords do not match</p>
              )}
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                  agreed
                    ? 'bg-[#1a6b3c] border-[#1a6b3c]'
                    : 'bg-transparent border-white/20 hover:border-white/40'
                }`}
              >
                {agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className="text-[13px] text-white/50 leading-relaxed">
                I agree to RentEasy's{' '}
                <Link to="#" className="text-[#f0c040]/80 hover:text-[#f0c040] transition-colors font-semibold">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="#" className="text-[#f0c040]/80 hover:text-[#f0c040] transition-colors font-semibold">
                  Privacy Policy
                </Link>
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-[#f0c040] text-black py-4 rounded-xl font-bold text-[15px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Legal note */}
          <p className="mt-8 text-[11px] text-white/20 text-center leading-relaxed">
            Your data is protected under Nigeria's Data Protection Act 2023 (NDPA).
            We never sell your personal information.
          </p>
        </motion.div>
      </div>
    </div>
  );
}