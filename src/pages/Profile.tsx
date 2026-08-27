import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Shield, Mail, Phone, Camera,
  Loader2, AlertCircle, CheckCircle,
  Lock, Bell, CreditCard, LogOut,
  ChevronRight, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentCardRequest } from '../components/profile/AgentCardRequest';
import { ID_CARD_FEATURE_ENABLED } from '../constants';
import { PayoutSettings } from '../components/profile/PayoutSettings';
import { ChangePasswordSection } from '../components/profile/ChangePasswordSection';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Tab = 'profile' | 'security' | 'payments';

const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'profile', icon: User, label: 'Profile Info' },
  { id: 'security', icon: Lock, label: 'Security' },
  { id: 'payments', icon: CreditCard, label: 'Payments & Payouts' },
];

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    phonePublic: profile?.phone_public || false,
    avatarUrl: profile?.avatar_url || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
  });

  const isDirty =
    formData.fullName !== (profile?.full_name || '') ||
    formData.phone !== (profile?.phone || '') ||
    formData.phonePublic !== (profile?.phone_public || false) ||
    (formData.username || '') !== (profile?.username || '') ||
    (formData.bio || '') !== (profile?.bio || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const checkUsername = async (value: string) => {
    const cleaned = value.toLowerCase().trim();
    if (!cleaned) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) { setUsernameStatus('invalid'); return; }
    if (cleaned === profile?.username) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .maybeSingle();
    setUsernameStatus(data ? 'taken' : 'available');
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setFormData(prev => ({ ...prev, username: value }));
    checkUsername(value);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateProfile({
        full_name: formData.fullName,
        phone: formData.phone,
        avatar_url: formData.avatarUrl || profile?.avatar_url || null,
        username: formData.username || null,
        phone_public: formData.phonePublic,
        bio: formData.bio || null,
        email: user.email || '',
      });
      if (!result.success) throw new Error(result.error?.message || 'Failed to update');
      setSuccess('Profile updated successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }
    setError(null);
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
  };

  const cancelAvatarSelect = () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
  };

  const confirmAvatarUpload = async () => {
    if (!pendingAvatarFile || !user) return;
    setUploadLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fileExt = pendingAvatarFile.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, pendingAvatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const bustedUrl = `${publicUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, avatarUrl: bustedUrl }));

      const result = await updateProfile({
        avatar_url: bustedUrl,
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        email: user.email || '',
      });

      if (!result.success) throw new Error(result.error?.message || 'Failed to save');
      setSuccess('Photo updated successfully');
      if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
      setPendingAvatarFile(null);
      setPendingAvatarPreview(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen bg-ink page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-slate/20 border-b border-white/5 px-5 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-paper/50 hover:text-paper hover:bg-white/8 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[18px] font-bold text-paper">Account Settings</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[13px] font-semibold text-paper/40 hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Profile card */}
            <div className="bg-slate/20 border border-white/6 rounded-2xl p-5">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="relative mb-3">
                  <div className="w-20 h-20 bg-gold rounded-2xl overflow-hidden flex items-center justify-center text-paper text-[24px] font-black">
                    {(formData.avatarUrl || profile?.avatar_url) ? (
                      <img
                        src={formData.avatarUrl || profile?.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (profile?.full_name || 'U').charAt(0).toUpperCase()
                    )}
                    {uploadLoading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-paper animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-gold rounded-xl flex items-center justify-center cursor-pointer hover:bg-gold-dark transition-colors">
                    <Camera className="w-3.5 h-3.5 text-ink" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarSelect}
                    />
                  </label>
                </div>

                {pendingAvatarPreview && (
                  <div className="w-full mb-4 p-3 bg-white/4 border border-white/8 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                        <img src={pendingAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[11px] text-paper/50 flex-1 text-left">New photo selected</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={cancelAvatarSelect}
                        disabled={uploadLoading}
                        className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-paper/50 hover:bg-white/5 transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmAvatarUpload}
                        disabled={uploadLoading}
                        className="flex-1 py-2 rounded-lg text-[12px] font-bold bg-gold text-black hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {uploadLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Upload
                      </button>
                    </div>
                  </div>
                )}
                <h3 className="text-[15px] font-bold text-paper">{profile?.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-paper/35 capitalize">{profile?.role}</span>
                  {profile?.verification_status === 'verified' && (
                    <>
                      <span className="text-paper/15">·</span>
                      <span className="text-[11px] text-gold flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    </>
                  )}
                </div>
                {/* Platform ID */}
                {(profile?.agent_id || profile?.landlord_id) && (
                  <div className="mt-2 px-3 py-1 bg-white/4 border border-white/8 rounded-lg">
                    <span className="text-[10px] font-mono text-paper/35">
                      {profile.agent_id || profile.landlord_id}
                    </span>
                  </div>
                )}
              </div>

              {/* Nav tabs */}
              <div className="space-y-1">
                {tabs.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                      activeTab === id
                        ? 'bg-gold/20 text-gold'
                        : 'text-paper/50 hover:bg-white/5 hover:text-paper'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      {label}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  </button>
                ))}
              </div>
            </div>

            {/* Verification card */}
            <div className={`rounded-2xl p-5 border ${
              profile?.verification_status === 'verified'
                ? 'bg-gold/10 border-gold/25'
                : profile?.verification_status === 'pending_verification'
                ? 'bg-gold/5 border-gold/15'
                : 'bg-slate/20 border-white/6'
            }`}>
              <div className="flex items-start gap-3">
                <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  profile?.verification_status === 'verified'
                    ? 'text-gold'
                    : profile?.verification_status === 'pending_verification'
                    ? 'text-gold'
                    : 'text-paper/30'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-paper mb-1">
                    {profile?.verification_status === 'verified'
                      ? 'Account Verified'
                      : profile?.verification_status === 'pending_verification'
                      ? 'Verification Under Review'
                      : 'Get Verified'
                    }
                  </p>
                  <p className="text-[11px] text-paper/40 leading-relaxed">
                    {profile?.verification_status === 'verified'
                      ? (profile?.role === 'landlord' || profile?.role === 'agent' ? 'Your identity is verified. Listings go live immediately.' : 'Your identity is verified. Deals and messages carry more trust with landlords and agents.')
                      : profile?.verification_status === 'pending_verification'
                      ? 'We are reviewing your documents. Usually within 24 hours.'
                      : (profile?.role === 'landlord' || profile?.role === 'agent' ? 'Submit your NIN to unlock instant listing approval.' : 'Submit your NIN to get a verified badge and build trust with landlords and agents.')
                    }
                  </p>
                  {profile?.verification_status !== 'verified' &&
                    profile?.verification_status !== 'pending_verification' && (
                    <Link
                      to="/verification"
                      className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold text-gold hover:text-gold-dark transition-colors"
                    >
                      Start Verification <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
            {/* Agent/Landlord Digital ID Card — NEW */}
            {ID_CARD_FEATURE_ENABLED && <AgentCardRequest />}

          </div>

          {/* ── Main content ── */}
          <div className="lg:col-span-2">
            <div className="bg-slate/20 border border-white/6 rounded-2xl p-5 lg:p-6">
              <AnimatePresence mode="wait">

                {/* Profile tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="text-[16px] font-bold text-paper mb-5">Profile Information</h2>

                    {error && (
                      <div className="mb-5 flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                        <p className="text-[13px] text-danger">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="mb-5 flex items-start gap-3 p-4 bg-gold/15 border border-gold/25 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                        <p className="text-[13px] text-gold">{success}</p>
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                            <input
                              type="text"
                              name="fullName"
                              value={formData.fullName}
                              onChange={handleChange}
                              required
                              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+234..."
                              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                            />
                          </div>
                        </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={formData.phonePublic}
                              onClick={() => setFormData(prev => ({ ...prev, phonePublic: !prev.phonePublic }))}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                                formData.phonePublic ? 'bg-gold' : 'bg-white/15'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  formData.phonePublic ? 'translate-x-4' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="text-[11px] text-paper/40">Show my phone number on my public profile</span>
                          </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                          Username
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-paper/25 pointer-events-none">@</span>
                          <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleUsernameChange}
                            placeholder="yourname"
                            className="w-full pl-8 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                          />
                        </div>
                        {usernameStatus === 'checking' && (
                          <p className="text-[11px] text-paper/30 mt-1.5">Checking availability...</p>
                        )}
                        {usernameStatus === 'available' && (
                          <p className="text-[11px] text-gold mt-1.5">Username available</p>
                        )}
                        {usernameStatus === 'taken' && (
                          <p className="text-[11px] text-danger mt-1.5">Username already taken</p>
                        )}
                        {usernameStatus === 'invalid' && (
                          <p className="text-[11px] text-danger mt-1.5">3-20 characters, lowercase letters, numbers, underscore only</p>
                        )}
                      </div>
                      {/* Bio */}
                      <div>
                        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                          Bio <span className="text-paper/25 normal-case font-normal">(optional)</span>
                        </label>
                        <textarea
                          value={formData.bio}
                          onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 200) }))}
                          placeholder="Tell people a bit about yourself..."
                          rows={3}
                          className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors resize-none"
                        />
                        <div className="flex justify-end mt-1">
                          <span className="text-[11px] text-paper/25">{formData.bio.length}/200</span>
                        </div>
                      </div>
                      {/* Email — read only */}
                      <div>
                        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/15 pointer-events-none" />
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full pl-11 pr-4 py-3.5 bg-white/3 border border-white/6 rounded-xl text-[14px] text-paper/25 cursor-not-allowed"
                          />
                        </div>
                        <p className="text-[11px] text-paper/20 mt-1.5">Email address cannot be changed</p>
                      </div>

                      {/* Role — read only */}
                      <div>
                        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                          Account Role
                        </label>
                        <div className="flex items-center gap-3 px-4 py-3.5 bg-white/3 border border-white/6 rounded-xl">
                          <span className="text-[14px] text-paper/25 capitalize">{profile?.role}</span>
                          <span className="text-[11px] text-paper/15">· Cannot be changed</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading || !isDirty}
                          className="flex items-center gap-2 bg-gold text-ink px-8 py-3.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <CheckCircle className="w-4 h-4" />
                          }
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChangePasswordSection />
                  </motion.div>
                )}
                {activeTab === 'payments' && (
                  <motion.div
                    key="payments"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PayoutSettings />
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Danger zone */}
            <div className="mt-4 bg-slate/20 border border-white/6 rounded-2xl p-5">
              <h3 className="text-[13px] font-bold text-paper/40 uppercase tracking-wider mb-4">Account</h3>
              <div className="space-y-3">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between px-4 py-3 bg-danger/5 border border-danger/10 rounded-xl hover:bg-danger/8 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-danger" />
                    <span className="text-[13px] font-semibold text-danger">Sign Out</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-danger/30 group-hover:text-danger/60 transition-colors" />
                </button>
                <div className="px-4 py-3 bg-white/2 border border-white/4 rounded-xl">
                  <p className="text-[11px] text-paper/20 leading-relaxed">
                    Account deactivation is not supported. Your transaction history is permanently maintained for legal compliance under Nigerian law.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
