import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Home, Briefcase, User, Phone, 
  MapPin, Camera, Loader2, ArrowRight, 
  ArrowLeft, CheckCircle2, Shield, Info, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function OnboardingWizard() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    role: '' as UserRole | '',
    fullName: '',
    phone: '',
    state: '',
    bio: '',
    avatarUrl: ''
  });

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_progress');
    const savedStep = localStorage.getItem('onboarding_step');
    
    if (saved) {
      setFormData(JSON.parse(saved));
    }
    if (savedStep) {
      setStep(parseInt(savedStep));
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_progress', JSON.stringify(formData));
    localStorage.setItem('onboarding_step', step.toString());
  }, [formData, step]);

  // Skip onboarding if profile already complete
  useEffect(() => {
    if (profile?.full_name && profile?.role) {
      localStorage.removeItem('onboarding_progress');
      
      // Redirect to correct dashboard based on role
      switch (profile.role) {
        case 'tenant':
          navigate('/listings');
          break;
        case 'landlord':
          navigate('/landlord/dashboard');
          break;
        case 'agent':
          navigate('/agent/dashboard');
          break;
        case 'admin':
        case 'moderator':
          navigate('/admin');
          break;
        default:
          navigate('/dashboard');
      }
    }
  }, [profile, navigate]);

  const handleRoleSelect = async (role: UserRole) => {
    setFormData({ ...formData, role });
    
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            role: role,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        
        if (error) throw error;
      } catch (err) {
        console.error('Error saving role:', err);
      }
    }
    
    setStep(2);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be less than 2MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Check if bucket exists (optional but good practice)
      const { data: buckets } = await supabase.storage.listBuckets();
      const avatarsBucket = buckets?.find(b => b.name === 'avatars');
      
      if (!avatarsBucket) {
        console.warn('Avatars bucket not found. Ensure it is created in Supabase dashboard.');
      }

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
      setUploadProgress(100);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!user || !formData.role) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await updateProfile({
        full_name: formData.fullName,
        phone: formData.phone,
        avatar_url: formData.avatarUrl || null,
        role: formData.role,
        email: user.email,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update profile');
      }

      // Wait for profile to refresh
      await refreshProfile();

      // Send Welcome Email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            subject: 'Welcome to Rent Easy Nigeria!',
            template: 'welcome',
            data: {
              name: formData.fullName,
              link: `${window.location.origin}/dashboard`
            }
          }
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }

      setStep(3);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    localStorage.removeItem('onboarding_progress');
    localStorage.removeItem('onboarding_step');
    
    switch (formData.role) {
      case 'tenant':
        navigate('/listings');
        break;
      case 'landlord':
        navigate('/landlord/dashboard');
        break;
      case 'agent':
        navigate('/agent/dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1a6b3c] rounded-lg flex items-center justify-center text-white font-black">R</div>
            <span className="font-black text-xl tracking-tight text-zinc-900">RentEasy</span>
          </div>
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`w-8 h-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-[#1a6b3c]' : 'bg-zinc-200'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-4xl w-full">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center max-w-2xl mx-auto">
                  <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">Welcome to Rent Easy</h1>
                  <p className="text-zinc-500 text-lg font-medium">To get started, tell us how you'll be using the platform.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RoleCard 
                    icon={<Search className="w-8 h-8" />}
                    title="I'm looking to rent or buy"
                    description="Browse verified properties, book inspections, and secure your new home safely"
                    onClick={() => handleRoleSelect('tenant')}
                    active={formData.role === 'tenant'}
                  />
                  <RoleCard 
                    icon={<Home className="w-8 h-8" />}
                    title="I'm a Property Owner"
                    description="List your properties, manage tenants, and receive payments securely through escrow"
                    onClick={() => handleRoleSelect('landlord')}
                    active={formData.role === 'landlord'}
                  />
                  <RoleCard 
                    icon={<Briefcase className="w-8 h-8" />}
                    title="I'm a Real Estate Agent"
                    description="List properties on behalf of owners, earn your 10% commission automatically"
                    onClick={() => handleRoleSelect('agent')}
                    active={formData.role === 'agent'}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto bg-white rounded-[40px] shadow-xl p-8 md:p-12 border border-zinc-100"
              >
                <button 
                  onClick={() => setStep(1)}
                  className="flex items-center text-zinc-400 font-bold text-sm mb-8 hover:text-[#1a6b3c] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to roles
                </button>

                <div className="mb-10">
                  <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Complete your profile</h2>
                  <p className="text-zinc-500 font-medium">Help us get to know you better</p>
                </div>

                <div className="space-y-8">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl flex items-center font-medium">
                      <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-[40px] bg-zinc-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                        {formData.avatarUrl ? (
                          <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-12 h-12 text-zinc-300" />
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                            <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-white h-full transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#1a6b3c] rounded-2xl flex items-center justify-center text-white cursor-pointer shadow-lg hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                      </label>
                    </div>
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Profile Photo (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
                        <input 
                          type="text" 
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="John Doe"
                          className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
                        <input 
                          type="tel" 
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+234..."
                          className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                      State of Residence <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
                      <select 
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium appearance-none"
                      >
                        <option value="">Select State</option>
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Short Bio</label>
                    <textarea 
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 200) })}
                      placeholder={formData.role === 'tenant' ? "Tell landlords a bit about yourself..." : "Tell tenants a bit about yourself..."}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{formData.bio.length}/200</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleCompleteProfile}
                    disabled={loading || !formData.fullName || !formData.phone || !formData.state}
                    className="w-full bg-[#1a6b3c] text-white py-5 rounded-2xl font-black text-lg hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20 flex items-center justify-center disabled:opacity-50 active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
                    Continue <ArrowRight className="w-6 h-6 ml-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                {formData.role === 'tenant' && (
                  <div className="bg-white rounded-[40px] shadow-xl p-8 md:p-12 border border-zinc-100 text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-emerald-600">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">You're all set!</h2>
                    <p className="text-zinc-500 font-medium mb-10">Here's what you can do now on Rent Easy:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
                      <FeatureItem text="Browse thousands of verified properties" />
                      <FeatureItem text="Book inspections with fee protection" />
                      <FeatureItem text="Chat directly with landlords" />
                      <FeatureItem text="Pay rent securely through escrow" />
                    </div>

                    <button 
                      onClick={handleFinish}
                      className="w-full bg-[#1a6b3c] text-white py-5 rounded-2xl font-black text-lg hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20 flex items-center justify-center active:scale-[0.98]"
                    >
                      Start Browsing Properties <ArrowRight className="w-6 h-6 ml-2" />
                    </button>
                  </div>
                )}

                {(formData.role === 'landlord' || formData.role === 'agent') && (
                  <div className="bg-white rounded-[40px] shadow-xl p-8 md:p-12 border border-zinc-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-[#1a6b3c]/10 rounded-2xl flex items-center justify-center text-[#1a6b3c]">
                        <Shield className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Get Verified</h2>
                        <p className="text-zinc-500 font-medium text-sm">Build trust and list properties faster</p>
                      </div>
                    </div>

                    <div className="space-y-6 mb-10">
                      <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100">
                        <h3 className="font-black text-zinc-900 uppercase tracking-widest text-xs mb-4">Verification Benefits</h3>
                        <ul className="space-y-3">
                          <li className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                            <CheckCircle2 className="w-5 h-5 text-[#1a6b3c]" /> Verified badge on all your listings
                          </li>
                          <li className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                            <CheckCircle2 className="w-5 h-5 text-[#1a6b3c]" /> Faster approval for new listings
                          </li>
                          <li className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                            <CheckCircle2 className="w-5 h-5 text-[#1a6b3c]" /> Higher trust from potential tenants
                          </li>
                        </ul>
                      </div>

                      <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                        <h3 className="font-black text-amber-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                          <Info className="w-4 h-4" /> Documents Needed
                        </h3>
                        <ul className="space-y-3">
                          <li className="flex items-center gap-3 text-sm font-medium text-amber-800">
                            • NIN (National ID Number)
                          </li>
                          <li className="flex items-center gap-3 text-sm font-medium text-amber-800">
                            • Government issued ID photo
                          </li>
                          {formData.role === 'agent' && (
                            <>
                              <li className="flex items-center gap-3 text-sm font-medium text-amber-800">
                                • LASRERA ID (Recommended for Lagos)
                              </li>
                              <li className="flex items-center gap-3 text-sm font-medium text-amber-800">
                                • Business Registration Certificate
                              </li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button 
                        onClick={() => navigate('/verification')}
                        className="w-full bg-[#1a6b3c] text-white py-5 rounded-2xl font-black text-lg hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20 flex items-center justify-center active:scale-[0.98]"
                      >
                        Get Verified Now <ArrowRight className="w-6 h-6 ml-2" />
                      </button>
                      <button 
                        onClick={() => navigate('/add-property')}
                        className="w-full bg-white text-zinc-900 border-2 border-zinc-100 py-5 rounded-2xl font-black text-lg hover:bg-zinc-50 transition-all flex items-center justify-center active:scale-[0.98]"
                      >
                        Skip for now, list a property
                      </button>
                      <p className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        Note: Unverified listings go to pending review. Verified listings go live immediately.
                      </p>
                    </div>
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

function RoleCard({ icon, title, description, onClick, active }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  onClick: () => void,
  active: boolean
}) {
  return (
    <button 
      onClick={onClick}
      className={`bg-white rounded-[40px] p-8 text-left border-2 transition-all hover:shadow-2xl hover:-translate-y-1 ${
        active ? 'border-[#1a6b3c] shadow-xl shadow-[#1a6b3c]/10' : 'border-white shadow-lg shadow-zinc-200/50'
      }`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-colors ${
        active ? 'bg-[#1a6b3c] text-white' : 'bg-zinc-50 text-zinc-400'
      }`}>
        {icon}
      </div>
      <h3 className="text-xl font-black text-zinc-900 tracking-tight mb-3 leading-tight">{title}</h3>
      <p className="text-zinc-500 text-sm font-medium leading-relaxed">{description}</p>
    </button>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
      <div className="w-6 h-6 bg-[#1a6b3c] rounded-lg flex items-center justify-center text-white">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <span className="text-sm font-bold text-zinc-700">{text}</span>
    </div>
  );
}
