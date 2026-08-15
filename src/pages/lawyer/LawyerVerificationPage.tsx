import React, { useState, useEffect } from 'react';
import {
  Scale, Upload, CheckCircle2, AlertCircle,
  Loader2, ArrowLeft, FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const STATE_OPTIONS = ['Lagos', 'Oyo', 'Ogun', 'Rivers', 'FCT', 'Kano', 'Other'];

export default function LawyerVerificationPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingRequest, setExistingRequest] = useState<Record<string, unknown> | null>(null);
  const [defaultFee, setDefaultFee] = useState<number | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const [nbaNumber, setNbaNumber] = useState('');
  const [specialty, setSpecialty] = useState<'tenancy' | 'property_title' | 'both'>('tenancy');
  const [statesCovered, setStatesCovered] = useState<string[]>([]);
  const [certUrl, setCertUrl] = useState('');

  useEffect(() => {
    if (user) { fetchStatus(); fetchFee(); }
  }, [user]);

  const fetchStatus = async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase
        .from('lawyer_verifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setExistingRequest(data);
    } catch (err) {
      console.error('Error fetching lawyer verification status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchFee = async () => {
    try {
      const { data } = await supabase
        .from('lawyer_verifications')
        .select('default_fee')
        .eq('user_id', user?.id)
        .eq('status', 'approved')
        .maybeSingle();
      if (data) {
        setDefaultFee(data.default_fee);
        setFeeInput(String(data.default_fee));
      }
    } catch (err) {
      console.error('Error fetching lawyer fee:', err);
    }
  };

  const saveFee = async () => {
    const parsed = Number(feeInput);
    if (!parsed || parsed < 1000) {
      setError('Fee must be at least ₦1,000');
      return;
    }
    setSavingFee(true);
    setError(null);
    setFeeSaved(false);
    try {
      const { error: rpcError } = await supabase.rpc('update_own_lawyer_fee', { p_fee: parsed });
      if (rpcError) throw new Error(rpcError.message);
      setDefaultFee(parsed);
      setFeeSaved(true);
      setTimeout(() => setFeeSaved(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update fee';
      setError(msg);
    } finally {
      setSavingFee(false);
    }
  };

  const toggleState = (state: string) => {
    setStatesCovered((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/cert.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('lawyer-certs')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('lawyer-certs')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);
      if (signedError) throw signedError;

      setCertUrl(signedData.signedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload certificate';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (nbaNumber.trim().length === 0) {
      setError('NBA enrollment number is required');
      return;
    }
    if (!certUrl) {
      setError('Please upload your call-to-bar or practicing certificate');
      return;
    }
    if (statesCovered.length === 0) {
      setError('Select at least one state you practice in');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from('lawyer_verifications')
        .insert({
          user_id: user.id,
          nba_number: nbaNumber.trim(),
          cert_url: certUrl,
          specialty,
          states_covered: statesCovered,
          status: 'pending',
        });
      if (insertError) throw new Error(insertError.message);

      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center" style={font}>
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (profile?.is_lawyer) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-5" style={font}>
        <div className="max-w-md w-full bg-ink border border-white/8 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Scale className="w-8 h-8 text-paper" />
          </div>
          <h2 className="text-[24px] font-black text-paper mb-3">You're a Verified Lawyer</h2>
          <p className="text-[13px] text-paper/45 mb-8 leading-relaxed">
            Your profile is listed in the lawyer directory and can be booked for reviews.
          </p>

          <div className="bg-white/5 border border-white/8 rounded-xl p-4 mb-6 text-left">
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">
              Your Review Fee
            </label>
            <p className="text-[11px] text-paper/35 mb-3">
              What you charge per agreement review, on top of Handova's ₦500 platform fee. Minimum ₦1,000.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min={1000}
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/8 rounded-lg text-[13px] text-paper outline-none focus:border-gold/60 transition-colors"
              />
              <button
                onClick={saveFee}
                disabled={savingFee || Number(feeInput) === defaultFee}
                className="px-4 py-2.5 bg-gold text-black rounded-lg font-bold text-[12px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {savingFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : feeSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                {feeSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gold text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success || existingRequest?.status === 'pending') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-5" style={font}>
        <div className="max-w-md w-full bg-ink border border-white/8 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
          <h2 className="text-[24px] font-black text-paper mb-3">Under Review</h2>
          <p className="text-[13px] text-paper/45 mb-8 leading-relaxed">
            We're checking your NBA number and certificate. We'll notify you once it's reviewed.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gold text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink py-8 px-5" style={font}>
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[13px] font-semibold text-paper/40 hover:text-paper transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gold/15 rounded-xl flex items-center justify-center">
            <Scale className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-paper tracking-tight">Become a Verified Lawyer</h1>
            <p className="text-[12px] text-paper/35">List your profile in the lawyer directory</p>
          </div>
        </div>

        {existingRequest?.status === 'rejected' && (
          <div className="mb-5 p-4 bg-danger/8 border border-danger/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-[12px] font-bold text-danger">Application Rejected</p>
            </div>
            <p className="text-[11px] text-paper/40">
              Reason: {(existingRequest.rejection_reason as string) || 'Documents were unclear or invalid.'}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-2 p-4 bg-danger/8 border border-danger/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
            <p className="text-[12px] text-danger">{error}</p>
          </div>
        )}

        <div className="bg-ink border border-white/6 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">
              NBA Enrollment Number
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25" />
              <input
                type="text"
                value={nbaNumber}
                onChange={(e) => setNbaNumber(e.target.value)}
                placeholder="e.g. SCN123456"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-white/25 outline-none focus:border-gold/60 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">
              Specialty
            </label>
            <div className="flex gap-2">
              {([
                { value: 'tenancy' as const, label: 'Tenancy' },
                { value: 'property_title' as const, label: 'Property / Title' },
                { value: 'both' as const, label: 'Both' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSpecialty(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${
                    specialty === opt.value
                      ? 'bg-gold text-black'
                      : 'bg-white/5 border border-white/8 text-paper/50 hover:text-paper'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">
              States You Practice In
            </label>
            <div className="flex flex-wrap gap-2">
              {STATE_OPTIONS.map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => toggleState(state)}
                  className={`px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                    statesCovered.includes(state)
                      ? 'bg-gold text-black'
                      : 'bg-white/5 border border-white/8 text-paper/50 hover:text-paper'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">
              Call-to-Bar / Practicing Certificate
            </label>
            <input
              type="file"
              id="cert-upload"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleCertUpload}
            />
            <label
              htmlFor="cert-upload"
              className={`flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                certUrl
                  ? 'border-gold bg-gold/8'
                  : 'border-white/10 hover:border-gold/50 hover:bg-white/4'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px] text-paper/40">Uploading...</span>
                </div>
              ) : certUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-gold" />
                  <span className="text-[13px] font-bold text-gold">Certificate Uploaded</span>
                  <span className="text-[11px] text-paper/30">Click to replace</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-paper/15" />
                  <span className="text-[13px] font-semibold text-paper/40">Click to upload certificate</span>
                  <span className="text-[11px] text-paper/20">JPG, PNG, PDF · Max 10MB</span>
                </div>
              )}
            </label>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gold/5 border border-gold/10 rounded-xl">
            <Scale className="w-3.5 h-3.5 text-gold flex-shrink-0" />
            <p className="text-[11px] text-paper/40">
              We manually verify every lawyer's NBA status before approval. This usually takes 24-48 hours.
            </p>
          </div>

          <button
            disabled={loading || uploading}
            onClick={handleSubmit}
            className="w-full bg-gold text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Application
          </button>
        </div>
      </div>
    </div>
  );
}
