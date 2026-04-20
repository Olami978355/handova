import React, { useState, useEffect } from 'react';
import { 
  Shield, Upload, CheckCircle2, AlertCircle, 
  Loader2, ArrowRight, ArrowLeft, FileText, 
  User, Building2, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function VerificationPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    nin: '',
    ninDocUrl: '',
    businessRegUrl: '',
    lasreraId: '',
    lasreraDocUrl: ''
  });

  const [verificationRequest, setVerificationRequest] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchVerificationStatus();
    }
  }, [user]);

  const fetchVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setVerificationRequest(data);
    } catch (err) {
      console.error('Error fetching verification status:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploading(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${field === 'ninDocUrl' ? 'nin-doc' : field === 'businessRegUrl' ? 'business-reg' : 'lasrera-doc'}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(filePath);

      setFormData({ ...formData, [field]: publicUrl });
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { error: requestError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          nin_doc_url: formData.ninDocUrl,
          business_reg_url: formData.businessRegUrl,
          lasrera_id: formData.lasreraId,
          lasrera_doc_url: formData.lasreraDocUrl,
          status: 'pending'
        });

      if (requestError) throw requestError;

      // Update profile status to pending
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verification_status: 'pending_verification' })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update private profile with NIN
      const { error: privateError } = await supabase
        .from('profiles_private')
        .upsert({ 
          id: user.id, 
          nin: formData.nin,
          nin_doc_url: formData.ninDocUrl
        });

      if (privateError) throw privateError;

      // Send Email Notification
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            subject: 'Verification Request Received - Rent Easy',
            template: 'verification_status',
            data: {
              name: profile?.full_name || 'User',
              status: 'Pending Review',
              link: 'https://renteasy.ng/verification'
            }
          }
        });
      } catch (emailErr) {
        console.error('Failed to send verification email:', emailErr);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Verification submission error:', err);
      setError(err.message || 'Failed to submit verification request');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.verification_status === 'verified') {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-xl p-12 text-center border border-zinc-100">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-emerald-600">
            <Shield className="w-10 h-10" fill="currentColor" />
          </div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">You are verified!</h2>
          <p className="text-zinc-500 font-medium mb-10">Your account is fully verified. You can now list properties and close deals with confidence.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#1a6b3c] text-white py-5 rounded-2xl font-black text-lg hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-xl p-12 text-center border border-zinc-100">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-amber-600">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">Under Review</h2>
          <p className="text-zinc-500 font-medium mb-10">Your verification is under review. We'll notify you within 24 hours via email.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#1a6b3c] text-white py-5 rounded-2xl font-black text-lg hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-zinc-400 font-bold text-sm mb-8 hover:text-[#1a6b3c] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>

        <div className="bg-white rounded-[40px] shadow-xl p-8 md:p-12 border border-zinc-100">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-[#1a6b3c]/10 rounded-2xl flex items-center justify-center text-[#1a6b3c]">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Identity Verification</h1>
              <p className="text-zinc-500 font-medium">Complete verification to unlock all features</p>
            </div>
          </div>

          {verificationRequest?.status === 'pending' && (
            <div className="mb-10 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              <div>
                <p className="text-amber-900 font-black text-sm uppercase tracking-widest">Verification Pending</p>
                <p className="text-amber-700 text-xs font-medium">We are currently reviewing your documents.</p>
              </div>
            </div>
          )}

          {verificationRequest?.status === 'rejected' && (
            <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-3xl">
              <div className="flex items-center gap-4 mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-red-900 font-black text-sm uppercase tracking-widest">Verification Rejected</p>
              </div>
              <p className="text-red-700 text-sm font-medium mb-4">Reason: {verificationRequest.rejection_reason || 'Documents were unclear or invalid.'}</p>
              <button 
                onClick={() => setVerificationRequest(null)}
                className="text-red-900 font-black text-xs uppercase tracking-widest hover:underline"
              >
                Resubmit Documents
              </button>
            </div>
          )}

          {!verificationRequest || verificationRequest.status === 'rejected' ? (
            <div className="space-y-10">
              {/* Step 1: NIN */}
              <div className={`space-y-6 ${step !== 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1a6b3c] text-white rounded-xl flex items-center justify-center font-black">1</div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">Enter your NIN</h3>
                </div>
                <div className="relative group">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
                  <input 
                    type="text" 
                    maxLength={11}
                    value={formData.nin}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value.replace(/\D/g, '') })}
                    placeholder="11-digit National ID Number"
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium"
                  />
                </div>
                <button 
                  disabled={formData.nin.length !== 11}
                  onClick={() => setStep(2)}
                  className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-black hover:bg-[#14522e] transition-all disabled:opacity-50"
                >
                  Next Step
                </button>
              </div>

              {/* Step 2: ID Photo */}
              <div className={`space-y-6 ${step !== 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#1a6b3c] text-white rounded-xl flex items-center justify-center font-black">2</div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">Upload Government ID</h3>
                </div>
                <p className="text-sm text-zinc-500 font-medium">Upload a clear photo of your NIN slip, Voter's card, or Passport.</p>
                
                <div className="relative">
                  <input 
                    type="file" 
                    id="nin-upload"
                    className="hidden" 
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'ninDocUrl')}
                  />
                  <label 
                    htmlFor="nin-upload"
                    className={`w-full aspect-video border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center cursor-pointer transition-all ${
                      formData.ninDocUrl ? 'border-[#1a6b3c] bg-[#1a6b3c]/5' : 'border-zinc-200 hover:border-[#1a6b3c] hover:bg-zinc-50'
                    }`}
                  >
                    {uploading === 'ninDocUrl' ? (
                      <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin" />
                    ) : formData.ninDocUrl ? (
                      <div className="text-center">
                        <CheckCircle2 className="w-12 h-12 text-[#1a6b3c] mx-auto mb-2" />
                        <span className="text-[#1a6b3c] font-black text-sm uppercase tracking-widest">ID Uploaded</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
                        <span className="text-zinc-400 font-black text-sm uppercase tracking-widest">Click to upload ID</span>
                        <p className="text-[10px] text-zinc-400 mt-1">JPG, PNG, PDF (Max 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all">Back</button>
                  <button 
                    disabled={!formData.ninDocUrl}
                    onClick={() => profile?.role === 'agent' ? setStep(3) : handleSubmit()}
                    className="flex-[2] bg-[#1a6b3c] text-white py-4 rounded-2xl font-black hover:bg-[#14522e] transition-all disabled:opacity-50"
                  >
                    {profile?.role === 'agent' ? 'Next Step' : 'Submit Verification'}
                  </button>
                </div>
              </div>

              {/* Step 3: Agent Specific */}
              {profile?.role === 'agent' && (
                <div className={`space-y-6 ${step !== 3 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1a6b3c] text-white rounded-xl flex items-center justify-center font-black">3</div>
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">Agent Credentials</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">LASRERA ID (Optional)</label>
                      <input 
                        type="text" 
                        value={formData.lasreraId}
                        onChange={(e) => setFormData({ ...formData, lasreraId: e.target.value })}
                        placeholder="AG/2024/0001"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Business Registration Certificate</label>
                      <input 
                        type="file" 
                        id="biz-upload"
                        className="hidden" 
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, 'businessRegUrl')}
                      />
                      <label 
                        htmlFor="biz-upload"
                        className={`w-full p-6 border-2 border-dashed rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                          formData.businessRegUrl ? 'border-[#1a6b3c] bg-[#1a6b3c]/5' : 'border-zinc-200 hover:border-[#1a6b3c]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className={formData.businessRegUrl ? 'text-[#1a6b3c]' : 'text-zinc-400'} />
                          <span className={`text-sm font-bold ${formData.businessRegUrl ? 'text-[#1a6b3c]' : 'text-zinc-500'}`}>
                            {formData.businessRegUrl ? 'Certificate Uploaded' : 'Upload CAC Certificate'}
                          </span>
                        </div>
                        {uploading === 'businessRegUrl' ? <Loader2 className="w-5 h-5 animate-spin text-[#1a6b3c]" /> : <Upload className="w-5 h-5 text-zinc-400" />}
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all">Back</button>
                    <button 
                      disabled={loading || !formData.businessRegUrl}
                      onClick={handleSubmit}
                      className="flex-[2] bg-[#1a6b3c] text-white py-4 rounded-2xl font-black hover:bg-[#14522e] transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                      Submit Verification
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
