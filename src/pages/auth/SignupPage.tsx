import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle, XCircle, Home, Key, Handshake } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

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
    className="absolute -left-24 -top-24 pointer-events-none"
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

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#E5484D' };
  if (score === 2) return { score, label: 'Fair', color: '#E5484D99' };
  if (score === 3) return { score, label: 'Good', color: '#D4AF3799' };
  return { score, label: 'Strong', color: '#D4AF37' };
};

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

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
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const passwordStrength = getPasswordStrength(formData.password);

  const checkUsername = (value: string) => {
    const clean = value.trim().toLowerCase();
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);

    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_REGEX.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    usernameDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('public_profiles')
        .select('id')
        .eq('username', clean)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'username' ? value.toLowerCase().replace(/\s/g, '') : value }));
    if (error) setError(null);
    if (name === 'username') checkUsername(value);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!agreed) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    const cleanUsername = formData.username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError('Username must be 3-20 characters, lowercase letters, numbers, and underscores only.');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('That username is already taken. Please choose another.');
      return;
    }
    if (usernameStatus === 'checking') {
      setError('Still checking username availability, please wait a moment.');
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
         emailRedirectTo: `https://rent-easy-ruby.vercel.app/auth/confirm`,
        },
      });

      if (authError) throw authError;
      if (!data.user) throw new Error('Signup failed. Please try again.');

      if (data.session) {
        const { error: usernameError } = await supabase
          .from('profiles')
          .update({ username: cleanUsername })
          .eq('id', data.user.id);

        if (usernameError) {
          console.error('Failed to save username during signup:', usernameError);
        }

        navigate('/onboarding');
      } else {
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

  const roles = [
    { role: 'As a Tenant', desc: 'Find verified properties and pay rent safely via escrow', icon: Key },
    { role: 'As a Landlord', desc: 'List your property and receive guaranteed payments', icon: Home },
  ];

  if (success) {
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
          <div className="w-16 h-16 bg-gold/15 border border-gold/25 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-gold" />
          </div>
          <h2 className="font-serif text-[28px] font-semibold text-paper tracking-tight mb-3">
            Check your email
          </h2>
          <p className="text-[14px] text-paper/50 leading-relaxed mb-2">
            We sent a confirmation link to
          </p>
          <p className="text-[15px] font-bold text-gold mb-6">
            {formData.email}
          </p>
          <p className="text-[13px] text-paper/35 mb-8 leading-relaxed">
            Click the link in your email to verify your account.
            Check your spam folder if you don't see it within a few minutes.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.resend({
                type: 'signup',
                email: formData.email,
                options: { emailRedirectTo: 'https://rent-easy-ruby.vercel.app/auth/confirm' }
              });
              alert('Confirmation email resent! Check your inbox.');
            }}
            className="w-full bg-gold text-ink py-3.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors mb-3"
          >
            Resend Confirmation Email
          </button>
          <button
            onClick={() => setSuccess(false)}
            className="text-[13px] text-paper/40 hover:text-paper/70 transition-colors underline underline-offset-4"
          >
            Try a different email address
          </button>
        </motion.div>
      </div>
    );
  }

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
            Join the movement
          </div>
          <h2 className="font-serif text-[36px] font-semibold text-paper leading-tight tracking-tight mb-6">
            Nigeria's rental<br />
            market is changing.<br />
            <span className="text-gold">Be part of it.</span>
          </h2>
          <p className="text-[14px] text-paper/50 leading-relaxed max-w-xs">
            Thousands of Nigerians are already renting and listing
            properties without the Omonile stress.
          </p>

          <div className="mt-10 space-y-4">
            {roles.map(({ role, desc, icon: Icon }) => (
              <div key={role} className="flex items-start gap-3">
                <div className="w-7 h-7 bg-gold/12 border border-gold/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-gold" />
                </div>
                <div>
                  <span className="text-[12px] font-bold text-paper/70">{role}: </span>
                  <span className="text-[12px] text-paper/40">{desc}</span>
                </div>
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

      <div className="flex-1 flex flex-col justify-center px-5 py-12 lg:px-16 overflow-y-auto">
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
              Create your account
            </h1>
            <p className="text-[14px] text-paper/45">
              Already have one?{' '}
              <Link
                to="/login"
                className="text-gold font-semibold hover:text-gold-dark transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

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

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="yourname"
                  autoComplete="off"
                  autoCapitalize="off"
                  className={`w-full pl-11 pr-10 py-3.5 bg-white/5 border rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none transition-colors ${
                    usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-danger/40 focus:border-danger/60'
                      : usernameStatus === 'available'
                      ? 'border-gold focus:border-gold'
                      : 'border-white/10 focus:border-gold'
                  }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-paper/30 animate-spin" />}
                  {usernameStatus === 'available' && <CheckCircle className="w-4 h-4 text-gold" />}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="w-4 h-4 text-danger" />}
                </div>
              </div>
              {usernameStatus === 'taken' && (
                <p className="text-[11px] text-danger mt-1.5">This username is already taken.</p>
              )}
              {usernameStatus === 'invalid' && (
                <p className="text-[11px] text-danger mt-1.5">3-20 characters, lowercase letters, numbers, and underscores only.</p>
              )}
              {usernameStatus === 'available' && (
                <p className="text-[11px] text-gold mt-1.5">Username available.</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-paper/25 hover:text-paper/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

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

            <div>
              <label className="block text-[12px] font-semibold text-paper/50 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-12 py-3.5 bg-white/5 border rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none transition-colors ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-danger/40 focus:border-danger/60'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-gold focus:border-gold'
                      : 'border-white/10 focus:border-gold'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-paper/25 hover:text-paper/60 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-gold" />
                )}
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-[11px] text-danger mt-1.5">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                aria-label={agreed ? 'Unagree to Terms of Service and Privacy Policy' : 'Agree to Terms of Service and Privacy Policy'}
                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                  agreed
                    ? 'bg-gold border-gold'
                    : 'bg-transparent border-white/20 hover:border-white/40'
                }`}
              >
                {agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0B0D10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className="text-[13px] text-paper/50 leading-relaxed">
                I agree to Handova's{' '}
                <Link to="/legal#terms" target="_blank" rel="noopener noreferrer" className="text-gold/80 hover:text-gold transition-colors font-semibold">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/legal#privacy" target="_blank" rel="noopener noreferrer" className="text-gold/80 hover:text-gold transition-colors font-semibold">
                  Privacy Policy
                </Link>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-gold text-ink py-4 rounded-xl font-bold text-[15px] hover:bg-gold-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
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

          <p className="mt-8 text-[11px] text-paper/20 text-center leading-relaxed">
            Your data is protected under Nigeria's Data Protection Act 2023 (NDPA).
            We never sell your personal information.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
