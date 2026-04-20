import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, Mail, Phone, MapPin, Camera, 
  Loader2, AlertCircle, CheckCircle, ArrowLeft, 
  Settings, Lock, Bell, CreditCard, LogOut,
  ShieldCheck, ShieldAlert, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    avatarUrl: profile?.avatar_url || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateProfile({
        full_name: formData.fullName,
        phone: formData.phone,
        avatar_url: formData.avatarUrl,
        email: user.email || '',
      });

      if (!result.success) throw result.error;
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
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

      setFormData({ ...formData, avatarUrl: publicUrl });
      
      const result = await updateProfile({ 
        avatar_url: publicUrl,
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        email: user?.email || '',
      });

      if (!result.success) throw result.error;
      setSuccess('Avatar updated successfully!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-[#1a6b3c] pt-12 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
            <button 
              onClick={() => signOut()}
              className="flex items-center text-white/70 font-bold text-sm hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-[40px] p-8 shadow-xl border border-zinc-100">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="relative group mb-4">
                  <div className="w-24 h-24 bg-[#1a6b3c]/10 rounded-[32px] flex items-center justify-center font-bold text-3xl text-[#1a6b3c] border-4 border-white shadow-lg overflow-hidden">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      formData.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-[#1a6b3c] text-white rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <h3 className="text-xl font-bold text-zinc-900">{profile?.full_name}</h3>
                <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1 capitalize">{profile?.role}</div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center p-4 rounded-2xl font-bold text-sm transition-colors ${activeTab === 'profile' ? 'bg-[#1a6b3c]/5 text-[#1a6b3c]' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <User className="w-4 h-4 mr-3" /> Profile Info
                </button>
                <button 
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center p-4 rounded-2xl font-bold text-sm transition-colors ${activeTab === 'security' ? 'bg-[#1a6b3c]/5 text-[#1a6b3c]' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <Lock className="w-4 h-4 mr-3" /> Security
                </button>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center p-4 rounded-2xl font-bold text-sm transition-colors ${activeTab === 'notifications' ? 'bg-[#1a6b3c]/5 text-[#1a6b3c]' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <Bell className="w-4 h-4 mr-3" /> Notifications
                </button>
                <button 
                  onClick={() => setActiveTab('billing')}
                  className={`w-full flex items-center p-4 rounded-2xl font-bold text-sm transition-colors ${activeTab === 'billing' ? 'bg-[#1a6b3c]/5 text-[#1a6b3c]' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                  <CreditCard className="w-4 h-4 mr-3" /> Billing
                </button>
              </div>
            </div>

            {/* Verification Status */}
            <div className={`rounded-[40px] p-8 shadow-xl border flex flex-col items-center text-center ${profile?.verification_status === 'verified' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-zinc-900 text-white border-zinc-800'}`}>
              <Shield className={`w-12 h-12 mb-4 ${profile?.verification_status === 'verified' ? 'text-green-600' : 'text-[#f0c040]'}`} />
              <h3 className="text-lg font-bold mb-2">
                {profile?.verification_status === 'verified' ? 'Verified Account' : 'Identity Verification'}
              </h3>
              <p className={`text-sm mb-6 ${profile?.verification_status === 'verified' ? 'text-green-600/80' : 'text-zinc-400'}`}>
                {profile?.verification_status === 'verified' 
                  ? 'Your identity has been verified. You have full access to all features.' 
                  : 'Verify your identity to build trust and unlock escrow protection.'}
              </p>
              {profile?.verification_status !== 'verified' && (
                <button 
                  onClick={() => navigate('/verification')}
                  className="w-full bg-[#f0c040] text-zinc-900 py-3 rounded-xl font-bold text-sm hover:bg-[#c97d0e] transition-colors shadow-lg shadow-black/20"
                >
                  Start Verification
                </button>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-zinc-100">
              {activeTab === 'profile' ? (
                <>
                  <h2 className="text-2xl font-bold text-zinc-900 mb-8">Profile Information</h2>

                  {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl flex items-center">
                      <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mb-8 p-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-2xl flex items-center">
                      <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                      {success}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                          <input 
                            type="text" 
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                          <input 
                            type="tel" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a6b3c]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input 
                          type="email" 
                          value={user?.email || ''}
                          disabled
                          className="w-full pl-12 pr-4 py-3 bg-zinc-100 border border-zinc-200 rounded-2xl text-zinc-400 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-wider">Email cannot be changed</p>
                    </div>

                    <div className="pt-6">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto px-12 py-4 bg-[#1a6b3c] text-white rounded-2xl font-bold text-lg hover:bg-[#14522e] transition-all shadow-lg shadow-[#1a6b3c]/20 flex items-center justify-center disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        Save Changes
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-zinc-300" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">Coming soon</h3>
                  <p className="text-sm font-medium">We're working on bringing you more control over your account.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
