import React, { useState, useEffect } from 'react';
import {
  Shield, Upload, CheckCircle2, AlertCircle,
  Loader2, ArrowLeft, FileText, Building2
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
  const [verificationRequest, setVerificationRequest] = useState<Record<string, unknown> | null>(null);

  const [formData, setFormData] = useState({
    nin: '',
    ninDocUrl: '',
    businessRegUrl: '',
    lasreraId: '',
    lasreraDocUrl: '',
  });

  useEffect(() => {
    if (user) fetchVerificationStatus();
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

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    setUploading(field);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName =
        field === 'ninDocUrl'
          ? `nin-doc.${fileExt}`
          : field === 'businessRegUrl'
          ? `business-reg.${fileExt}`
          : `lasrera-doc.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
  .from('verification-docs')
  .createSignedUrl(filePath, 60 * 60 * 24 * 7);
if (signedError) throw signedError;
setFormData((prev) => ({ ...prev, [field]: signedData.signedUrl }));

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document';
      setError(msg);
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
          status: 'pending',
        });
      if (requestError) throw requestError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verification_status: 'pending_verification' })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const { error: privateError } = await supabase
        .from('profiles_private')
        .upsert({ id: user.id, nin: formData.nin, nin_doc_url: formData.ninDocUrl });
      if (privateError) throw privateError;

      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            subject: 'Verification Request Received — RentEasy',
            template: 'verification_status',
            data: {
              name: profile?.full_name || 'User',
              status: 'Pending Review',
              link: 'https://renteasyapp.com/verification',
            },
          },
        });
      } catch (emailErr) {
        console.error('Failed to send verification email:', emailErr);
      }

      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit verification';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

  // ── Already verified ──
  if (profile?.verification_status === 'verified') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-5" style={font}>
        <div className="max-w-md w-full bg-[#0a1f11] border border-white/8 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-[#1a6b3c] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-[24px] font-black text-white mb-3">You're Verified!</h2>
          <p className="text-[13px] text-white/45 mb-8 leading-relaxed">
            Your account is fully verified. You can now list properties and close deals with confidence.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted successfully ──
  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-5" style={font}>
        <div className="max-w-md w-full bg-[#0a1f11] border border-white/8 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-[#f0c040] animate-spin" />
          </div>
          <h2 className="text-[24px] font-black text-white mb-3">Under Review</h2>
          <p className="text-[13px] text-white/45 mb-8 leading-relaxed">
            Your verification documents are being reviewed. We'll notify you within 24 hours.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8 px-5" style={font}>
      <div className="max-w-xl mx-auto">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[13px] font-semibold text-white/40 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#1a6b3c]" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-white tracking-tight">Identity Verification</h1>
            <p className="text-[12px] text-white/35">Complete verification to unlock all features</p>
          </div>
        </div>

        {/* Pending banner */}
        {verificationRequest?.status === 'pending' && (
          <div className="mb-5 flex items-center gap-3 p-4 bg-[#f0c040]/8 border border-[#f0c040]/20 rounded-xl">
            <Loader2 className="w-4 h-4 text-[#f0c040] animate-spin flex-shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-[#f0c040]">Verification Pending</p>
              <p className="text-[11px] text-white/35">We're reviewing your documents.</p>
            </div>
          </div>
        )}

        {/* Rejected banner */}
        {verificationRequest?.status === 'rejected' && (
          <div className="mb-5 p-4 bg-red-500/8 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-[12px] font-bold text-red-400">Verification Rejected</p>
            </div>
            <p className="text-[11px] text-white/40 mb-3">
              Reason: {(verificationRequest.rejection_reason as string) || 'Documents were unclear or invalid.'}
            </p>
            <button
              onClick={() => setVerificationRequest(null)}
              className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              Resubmit Documents →
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-2 p-4 bg-red-500/8 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {(!verificationRequest || verificationRequest.status === 'rejected') && (
          <div className="space-y-4">

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, ...(profile?.role === 'agent' ? [3] : [])].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black transition-all ${
                    step === s
                      ? 'bg-[#f0c040] text-black'
                      : step > s
                      ? 'bg-[#1a6b3c] text-white'
                      : 'bg-white/5 text-white/30'
                  }`}>
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < (profile?.role === 'agent' ? 3 : 2) && (
                    <div className={`flex-1 h-px ${step > s ? 'bg-[#1a6b3c]' : 'bg-white/8'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* ── Step 1: NIN ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 space-y-5"
                >
                  <div>
                    <h3 className="text-[16px] font-bold text-white mb-1">Enter your NIN</h3>
                    <p className="text-[12px] text-white/35">Your 11-digit National Identification Number</p>
                  </div>

                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      maxLength={11}
                      value={formData.nin}
                      onChange={(e) =>
                        setFormData({ ...formData, nin: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="11-digit NIN"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/60 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-[#f0c040]/5 border border-[#f0c040]/10 rounded-xl">
                    <Shield className="w-3.5 h-3.5 text-[#f0c040] flex-shrink-0" />
                    <p className="text-[11px] text-white/40">
                      Your NIN is encrypted and stored securely. It cannot be changed after submission.
                    </p>
                  </div>

                  <button
                    disabled={formData.nin.length !== 11}
                    onClick={() => setStep(2)}
                    className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next — Upload ID
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Government ID ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 space-y-5"
                >
                  <div>
                    <h3 className="text-[16px] font-bold text-white mb-1">Upload Government ID</h3>
                    <p className="text-[12px] text-white/35">
                      NIN slip, Voter's card, International Passport, or Driver's Licence
                    </p>
                  </div>

                  <input
                    type="file"
                    id="nin-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'ninDocUrl')}
                  />
                  <label
                    htmlFor="nin-upload"
                    className={`flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      formData.ninDocUrl
                        ? 'border-[#1a6b3c] bg-[#1a6b3c]/8'
                        : 'border-white/10 hover:border-[#1a6b3c]/50 hover:bg-white/4'
                    }`}
                  >
                    {uploading === 'ninDocUrl' ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[12px] text-white/40">Uploading...</span>
                      </div>
                    ) : formData.ninDocUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-10 h-10 text-[#1a6b3c]" />
                        <span className="text-[13px] font-bold text-[#1a6b3c]">ID Uploaded</span>
                        <span className="text-[11px] text-white/30">Click to replace</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-10 h-10 text-white/15" />
                        <span className="text-[13px] font-semibold text-white/40">Click to upload ID</span>
                        <span className="text-[11px] text-white/20">JPG, PNG, PDF · Max 10MB</span>
                      </div>
                    )}
                  </label>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      disabled={!formData.ninDocUrl}
                      onClick={() => (profile?.role === 'agent' ? setStep(3) : handleSubmit())}
                      className="flex-[2] bg-[#1a6b3c] text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {profile?.role === 'agent' ? 'Next — Agent Credentials' : 'Submit Verification'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Agent credentials ── */}
              {step === 3 && profile?.role === 'agent' && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 space-y-5"
                >
                  <div>
                    <h3 className="text-[16px] font-bold text-white mb-1">Agent Credentials</h3>
                    <p className="text-[12px] text-white/35">
                      Business registration required. LASRERA ID optional (Lagos agents only).
                    </p>
                  </div>

                  {/* LASRERA ID */}
                  <div>
                    <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                      LASRERA ID <span className="text-white/20 normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lasreraId}
                      onChange={(e) => setFormData({ ...formData, lasreraId: e.target.value })}
                      placeholder="AG/2024/0001"
                      className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/60 transition-colors"
                    />
                  </div>

                  {/* Business reg upload */}
                  <div>
                    <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                      CAC Business Registration Certificate
                    </label>
                    <input
                      type="file"
                      id="biz-upload"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'businessRegUrl')}
                    />
                    <label
                      htmlFor="biz-upload"
                      className={`flex items-center justify-between w-full p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        formData.businessRegUrl
                          ? 'border-[#1a6b3c] bg-[#1a6b3c]/8'
                          : 'border-white/10 hover:border-[#1a6b3c]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2
                          className={`w-5 h-5 ${formData.businessRegUrl ? 'text-[#1a6b3c]' : 'text-white/25'}`}
                        />
                        <span
                          className={`text-[13px] font-semibold ${
                            formData.businessRegUrl ? 'text-[#1a6b3c]' : 'text-white/40'
                          }`}
                        >
                          {formData.businessRegUrl ? 'Certificate Uploaded' : 'Upload CAC Certificate'}
                        </span>
                      </div>
                      {uploading === 'businessRegUrl' ? (
                        <div className="w-4 h-4 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-white/25" />
                      )}
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      disabled={loading || !formData.businessRegUrl}
                      onClick={handleSubmit}
                      className="flex-[2] bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Submit Verification
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
