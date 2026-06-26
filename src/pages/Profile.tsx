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
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Tab = 'profile' | 'security' | 'notifications' | 'billing';

const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'profile', icon: User, label: 'Profile Info' },
  { id: 'security', icon: Lock, label: 'Security' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'billing', icon: CreditCard, label: 'Billing' },
];

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    avatarUrl: profile?.avatar_url || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
    if (success) setSuccess(null);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }

    setUploadLoading(true);
    setError(null);
    setSuccess(null);

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

      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));

      const result = await updateProfile({
        avatar_url: publicUrl,
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        email: user.email || '',
      });

      if (!result.success) throw new Error(result.error?.message || 'Failed to save');
      setSuccess('Photo updated successfully');
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
      className="min-h-screen bg-[#0a0a0a] page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-[#0a1f11] border-b border-white/5 px-5 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[18px] font-bold text-white">Account Settings</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[13px] font-semibold text-white/40 hover:text-red-400 transition-colors"
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
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="relative mb-3">
                  <div className="w-20 h-20 bg-[#1a6b3c] rounded-2xl overflow-hidden flex items-center justify-center text-white text-[24px] font-black">
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
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#f0c040] rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#e0b030] transition-colors">
                    <Camera className="w-3.5 h-3.5 text-black" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
                <h3 className="text-[15px] font-bold text-white">{profile?.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-white/35 capitalize">{profile?.role}</span>
                  {profile?.verification_status === 'verified' && (
                    <>
                      <span className="text-white/15">·</span>
                      <span className="text-[11px] text-[#4ade80] flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    </>
                  )}
                </div>
                {/* Platform ID */}
                {(profile?.agent_id || profile?.landlord_id) && (
                  <div className="mt-2 px-3 py-1 bg-white/4 border border-white/8 rounded-lg">
                    <span className="text-[10px] font-mono text-white/35">
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
                        ? 'bg-[#1a6b3c]/20 text-[#f0c040]'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
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
                ? 'bg-[#1a6b3c]/10 border-[#1a6b3c]/25'
                : profile?.verification_status === 'pending_verification'
                ? 'bg-[#f0c040]/5 border-[#f0c040]/15'
                : 'bg-[#0a1f11] border-white/6'
            }`}>
              <div className="flex items-start gap-3">
                <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  profile?.verification_status === 'verified'
                    ? 'text-[#4ade80]'
                    : profile?.verification_status === 'pending_verification'
                    ? 'text-[#f0c040]'
                    : 'text-white/30'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white mb-1">
                    {profile?.verification_status === 'verified'
                      ? 'Account Verified'
                      : profile?.verification_status === 'pending_verification'
                      ? 'Verification Under Review'
                      : 'Get Verified'
                    }
                  </p>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    {profile?.verification_status === 'verified'
                      ? 'Your identity is verified. Listings go live immediately.'
                      : profile?.verification_status === 'pending_verification'
                      ? 'We are reviewing your documents. Usually within 24 hours.'
                      : 'Submit your NIN to unlock instant listing approval.'
                    }
                  </p>
                  {profile?.verification_status !== 'verified' &&
                    profile?.verification_status !== 'pending_verification' && (
                    <Link
                      to="/verification"
                      className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold text-[#f0c040] hover:text-[#e0b030] transition-colors"
                    >
                      Start Verification <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
            {/* Agent/Landlord Digital ID Card — NEW */}
            <AgentCardRequest />

          </div>

          {/* ── Main content ── */}
          <div className="lg:col-span-2">
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 lg:p-6">
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
                    <h2 className="text-[16px] font-bold text-white mb-5">Profile Information</h2>

                    {error && (
                      <div className="mb-5 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[13px] text-red-400">{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="mb-5 flex items-start gap-3 p-4 bg-[#1a6b3c]/15 border border-[#1a6b3c]/25 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
                        <p className="text-[13px] text-[#4ade80]">{success}</p>
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                            <input
                              type="text"
                              name="fullName"
                              value={formData.fullName}
                              onChange={handleChange}
                              required
                              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+234..."
                              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Email — read only */}
                      <div>
                        <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15 pointer-events-none" />
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full pl-11 pr-4 py-3.5 bg-white/3 border border-white/6 rounded-xl text-[14px] text-white/25 cursor-not-allowed"
                          />
                        </div>
                        <p className="text-[11px] text-white/20 mt-1.5">Email address cannot be changed</p>
                      </div>

                      {/* Role — read only */}
                      <div>
                        <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                          Account Role
                        </label>
                        <div className="flex items-center gap-3 px-4 py-3.5 bg-white/3 border border-white/6 rounded-xl">
                          <span className="text-[14px] text-white/25 capitalize">{profile?.role}</span>
                          <span className="text-[11px] text-white/15">· Cannot be changed</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex items-center gap-2 bg-[#f0c040] text-black px-8 py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Coming soon tabs */}
                {activeTab !== 'profile' && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="text-center py-14"
                  >
                    <div className="w-14 h-14 bg-white/4 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      {activeTab === 'security' && <Lock className="w-7 h-7 text-white/20" />}
                      {activeTab === 'notifications' && <Bell className="w-7 h-7 text-white/20" />}
                      {activeTab === 'billing' && <CreditCard className="w-7 h-7 text-white/20" />}
                    </div>
                    <h3 className="text-[16px] font-bold text-white mb-2 capitalize">{activeTab}</h3>
                    <p className="text-[13px] text-white/35 max-w-xs mx-auto">
                      We're building this section. Check back soon.
                    </p>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Danger zone */}
            <div className="mt-4 bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <h3 className="text-[13px] font-bold text-white/40 uppercase tracking-wider mb-4">Account</h3>
              <div className="space-y-3">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/8 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span className="text-[13px] font-semibold text-red-400">Sign Out</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400/30 group-hover:text-red-400/60 transition-colors" />
                </button>
                <div className="px-4 py-3 bg-white/2 border border-white/4 rounded-xl">
                  <p className="text-[11px] text-white/20 leading-relaxed">
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
