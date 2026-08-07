import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Home, Briefcase, User, Phone,
  MapPin, Camera, Loader2, ArrowRight,
  ArrowLeft, CheckCircle, Shield, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
  'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
  'Rivers','Sokoto','Taraba','Yobe','Zamfara'
];

// ─── Logo ─────────────────────────────────────────────────────────
const RentEasyLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="18" fill="#D4AF37" />
    <path d="M16 54 L16 32 L40 14 L64 32 L64 54" stroke="#D4AF37" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 54 L28 54" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" />
    <path d="M54 54 L64 54" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 54 L28 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="28" cy="38" r="6" fill="none" stroke="white" strokeWidth="3" />
    <path d="M32 54 L32 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 54 L36 51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="43" y="42" width="16" height="13" rx="3" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="2" />
    <path d="M46 42 L46 38 Q46 35 51 35 Q56 35 56 38 L56 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M47.5 48.5 L50 51 L54.5 46" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Role Card ────────────────────────────────────────────────────
const RoleCard = ({
  icon, title, description, onClick, active
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  active: boolean;
}) => (
  <button
    onClick={onClick}
    className={`relative w-full text-left rounded-2xl p-6 border transition-all duration-200 hover:-translate-y-1 ${
      active
        ? 'bg-ink border-gold/40 shadow-lg shadow-gold/5'
        : 'bg-ink border-white/8 hover:border-white/15'
    }`}
  >
    {active && (
      <div className="absolute top-4 right-4 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )}
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${
      active ? 'bg-gold text-black' : 'bg-white/5 text-white/40'
    }`}>
      {icon}
    </div>
    <h3 className="text-[15px] font-bold text-white mb-2 leading-snug">{title}</h3>
    <p className="text-[13px] text-white/45 leading-relaxed">{description}</p>
  </button>
);

// ─── Feature bullet ───────────────────────────────────────────────
const FeatureBullet = ({ text }: { text: string }) => (
  <div className="flex items-start gap-3">
    <div className="w-5 h-5 bg-gold/20 border border-gold/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
      <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" />
    </div>
    <span className="text-[13px] text-white/60 leading-relaxed">{text}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function OnboardingWizard() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    role: '' as UserRole | '',
    fullName: '',
    phone: '',
    state: '',
    bio: '',
    avatarUrl: '',
  });

  // ── Restore progress from localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_progress');
    const savedStep = localStorage.getItem('onboarding_step');
    if (saved) {
      try { setFormData(JSON.parse(saved)); } catch { /* ignore */ }
    }
    if (savedStep) setStep(parseInt(savedStep));
  }, []);

  // ── Save progress to localStorage ──
  useEffect(() => {
    localStorage.setItem('onboarding_progress', JSON.stringify(formData));
    localStorage.setItem('onboarding_step', step.toString());
  }, [formData, step]);

  // ── Skip onboarding if already complete ──
  useEffect(() => {
    if (profile?.full_name && profile?.role) {
      localStorage.removeItem('onboarding_progress');
      localStorage.removeItem('onboarding_step');
      redirectByRole(profile.role);
    }
  }, [profile]);

  const redirectByRole = (role: string) => {
    if (role === 'admin' || role === 'moderator') navigate('/admin', { replace: true });
    else if (role === 'landlord') navigate('/landlord/dashboard', { replace: true });
    else if (role === 'agent') navigate('/agent/dashboard', { replace: true });
    else navigate('/listings', { replace: true });
  };

  // ── Step 1: Role selection ──
  const handleRoleSelect = async (role: UserRole) => {
    setFormData(prev => ({ ...prev, role }));
    if (user) {
      try {
        await supabase.from('profiles').upsert(
          { id: user.id, role, email: user.email, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
      } catch (err) {
        console.error('Role save error:', err);
      }
    }
    setStep(2);
  };

  // ── Avatar upload ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const bustedUrl = `${publicUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, avatarUrl: bustedUrl }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(`Photo upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  // ── Step 2: Complete profile ──
  const handleCompleteProfile = async () => {
    if (!user || !formData.role) return;
    if (!formData.fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!formData.phone.trim()) { setError('Please enter your phone number.'); return; }
    if (!formData.state) { setError('Please select your state of residence.'); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await updateProfile({
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        avatar_url: formData.avatarUrl || null,
        role: formData.role as UserRole,
        email: user.email,
      });

      if (!result.success) {
        throw new Error(
          result.error?.message || result.error || 'Failed to save profile'
        );
      }

      await refreshProfile();

      // Send welcome email silently
      supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: 'Welcome to RentEasy Nigeria!',
          template: 'welcome',
          data: { name: formData.fullName },
        },
      }).catch(() => { /* silent */ });

      setStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Finish ──
  const handleFinish = () => {
    localStorage.removeItem('onboarding_progress');
    localStorage.removeItem('onboarding_step');
    redirectByRole(formData.role || 'tenant');
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex flex-col"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Top bar ── */}
      <div className="bg-ink border-b border-white/5 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <RentEasyLogo size={30} />
            <span className="text-[18px] font-extrabold tracking-tight text-white">
              Rent<span className="text-gold">Easy</span>
            </span>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all ${
                  step > s
                    ? 'bg-[#4ade80] text-black'
                    : step === s
                    ? 'bg-gold text-black'
                    : 'bg-white/10 text-white/30'
                }`}>
                  {step > s ? (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-px transition-all ${step > s ? 'bg-[#4ade80]' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">

            {/* ════════ STEP 1 — Choose role ════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-10">
                  <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">
                    Step 1 of 3
                  </div>
                  <h1 className="text-[28px] lg:text-[36px] font-black text-white tracking-tight mb-3">
                    How will you use RentEasy?
                  </h1>
                  <p className="text-[14px] text-white/45 max-w-md mx-auto">
                    Choose your role to get a personalized experience. 
                    You can always change this later.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <RoleCard
                    icon={<Search className="w-6 h-6" />}
                    title="I'm looking to rent or buy"
                    description="Browse verified properties, book inspections, and secure your new home safely"
                    onClick={() => handleRoleSelect('tenant')}
                    active={formData.role === 'tenant'}
                  />
                  <RoleCard
                    icon={<Home className="w-6 h-6" />}
                    title="I'm a Property Owner"
                    description="List properties, manage tenants, and receive payments securely through escrow"
                    onClick={() => handleRoleSelect('landlord')}
                    active={formData.role === 'landlord'}
                  />
                  <RoleCard
                    icon={<Briefcase className="w-6 h-6" />}
                    title="I'm a Real Estate Agent"
                    description="List properties for owners and earn your 10% commission automatically"
                    onClick={() => handleRoleSelect('agent')}
                    active={formData.role === 'agent'}
                  />
                </div>
              </motion.div>
            )}

            {/* ════════ STEP 2 — Profile details ════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
                className="max-w-lg mx-auto"
              >
                <div className="text-center mb-8">
                  <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">
                    Step 2 of 3
                  </div>
                  <h2 className="text-[26px] font-black text-white tracking-tight mb-2">
                    Complete your profile
                  </h2>
                  <p className="text-[13px] text-white/45">
                    This helps landlords and tenants know who they're dealing with.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-red-400">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-4">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3 pb-2">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl bg-ink border border-white/10 overflow-hidden flex items-center justify-center">
                        {formData.avatarUrl ? (
                          <img
                            src={formData.avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-white/20" />
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-gold rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#e0b030] transition-colors">
                        <Camera className="w-4 h-4 text-black" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                    </div>
                    <span className="text-[11px] text-white/30 font-medium">
                      Profile photo (optional · max 5MB)
                    </span>
                  </div>

                  {/* Full name */}
                  <div>
                    <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={e => {
                          setFormData(prev => ({ ...prev, fullName: e.target.value }));
                          if (error) setError(null);
                        }}
                        placeholder="Your full name"
                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold transition-colors"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => {
                          setFormData(prev => ({ ...prev, phone: e.target.value }));
                          if (error) setError(null);
                        }}
                        placeholder="+234 800 000 0000"
                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold transition-colors"
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                      State of Residence <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                      <select
                        value={formData.state}
                        onChange={e => {
                          setFormData(prev => ({ ...prev, state: e.target.value }));
                          if (error) setError(null);
                        }}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white focus:outline-none focus:border-gold transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-ink">Select your state</option>
                        {NIGERIAN_STATES.map(s => (
                          <option key={s} value={s} className="bg-ink">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bio (optional) */}
                  <div>
                    <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                      Short Bio <span className="text-white/25 normal-case font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        bio: e.target.value.slice(0, 200)
                      }))}
                      placeholder={
                        formData.role === 'tenant'
                          ? 'Tell landlords a bit about yourself...'
                          : 'Tell tenants about yourself and your properties...'
                      }
                      rows={3}
                      className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold transition-colors resize-none"
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-[11px] text-white/25">{formData.bio.length}/200</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-5 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[14px] font-semibold text-white/60 hover:bg-white/8 hover:text-white transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={handleCompleteProfile}
                      disabled={loading || !formData.fullName || !formData.phone || !formData.state}
                      className="flex-1 bg-gold text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ════════ STEP 3 — Role-specific finish ════════ */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
                className="max-w-lg mx-auto"
              >
                <div className="text-center mb-8">
                  <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">
                    Step 3 of 3
                  </div>
                  <div className="w-14 h-14 bg-gold/20 border border-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 text-[#4ade80]" />
                  </div>
                  <h2 className="text-[26px] font-black text-white tracking-tight mb-2">
                    You're all set, {formData.fullName.split(' ')[0]}!
                  </h2>
                  <p className="text-[13px] text-white/45">
                    Your account is ready. Here's what you can do now.
                  </p>
                </div>

                <div className="bg-ink border border-white/6 rounded-2xl p-6 mb-4">
                  {formData.role === 'tenant' && (
                    <>
                      <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-4">
                        As a Tenant
                      </div>
                      <div className="space-y-3">
                        <FeatureBullet text="Browse thousands of verified properties across Nigeria" />
                        <FeatureBullet text="Book inspections with automatic refund protection" />
                        <FeatureBullet text="Chat directly with landlords and agents" />
                        <FeatureBullet text="Pay rent securely through escrow" />
                        <FeatureBullet text="Sign tenancy agreements digitally" />
                      </div>
                    </>
                  )}

                  {formData.role === 'landlord' && (
                    <>
                      <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-4">
                        As a Landlord
                      </div>
                      <div className="space-y-3 mb-5">
                        <FeatureBullet text="List houses and land for rent or sale" />
                        <FeatureBullet text="Only serious tenants — backed by inspection fees" />
                        <FeatureBullet text="Receive rent payments through escrow" />
                        <FeatureBullet text="Manage all enquiries in your dashboard" />
                      </div>

                      <div className="border-t border-white/5 pt-5">
                        <div className="flex items-start gap-3 p-4 bg-gold/5 border border-gold/15 rounded-xl mb-4">
                          <Shield className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[12px] font-semibold text-gold mb-1">
                              Get verified for instant listing approval
                            </p>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                              Submit your NIN and ID. Verified landlords go live immediately.
                              Unverified listings wait for moderator review.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {formData.role === 'agent' && (
                    <>
                      <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-4">
                        As an Agent
                      </div>
                      <div className="space-y-3 mb-5">
                        <FeatureBullet text="List properties on behalf of landlords" />
                        <FeatureBullet text="Your 10% commission is calculated automatically" />
                        <FeatureBullet text="Get your RE Agent ID after verification" />
                        <FeatureBullet text="Build your public portfolio page" />
                        <FeatureBullet text="LASRERA ID display for Lagos agents" />
                      </div>

                      <div className="border-t border-white/5 pt-5">
                        <div className="flex items-start gap-3 p-4 bg-gold/5 border border-gold/15 rounded-xl mb-4">
                          <Shield className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[12px] font-semibold text-gold mb-1">
                              Verification required to list properties
                            </p>
                            <p className="text-[11px] text-white/40 leading-relaxed">
                              Submit your NIN, Business Registration, and optional LASRERA ID.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                {formData.role === 'tenant' ? (
                  <button
                    onClick={handleFinish}
                    className="w-full bg-gold text-black py-4 rounded-xl font-bold text-[15px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-2"
                  >
                    Start Browsing Properties
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/verification')}
                      className="w-full bg-gold text-black py-4 rounded-xl font-bold text-[15px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-2"
                    >
                      <Shield className="w-5 h-5" />
                      Get Verified Now
                    </button>
                    <button
                      onClick={handleFinish}
                      className="w-full bg-white/5 text-white/60 py-4 rounded-xl font-semibold text-[14px] hover:bg-white/8 hover:text-white transition-all border border-white/8"
                    >
                      Skip for now — explore the platform
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}