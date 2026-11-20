import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Upload, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const CAC_PATTERN = /^(RC|BN|IT)\d{4,8}$/;
const MAX_BYTES = 5 * 1024 * 1024;

interface FilePickerProps {
  label: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
}

const FilePicker: React.FC<FilePickerProps> = ({ label, hint, file, onPick }) => (
  <div>
    <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-1">
      {label}
    </label>
    <p className="text-[11px] text-white/30 mb-2">{hint}</p>
    <label className="flex items-center gap-3 p-4 bg-white/4 border border-dashed border-white/15 rounded-xl cursor-pointer">
      <Upload className="w-4 h-4 text-gold flex-shrink-0" />
      <span className="text-[13px] text-white/60 truncate">
        {file ? file.name : 'Choose a PDF or image (max 5MB)'}
      </span>
      <input
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={e => onPick(e.target.files?.[0] || null)}
      />
    </label>
  </div>
);

export default function CompanyVerification() {
  const { user, refreshProfile } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [cac, setCac] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declared, setDeclared] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase
        .from('companies')
        .select('name, verification_status, cac_number')
        .eq('id', user.id)
        .maybeSingle();
      setStatus(c?.verification_status ?? null);
      setCompanyName(c?.name || '');
      setCac(c?.cac_number || '');
      const { data: r } = await supabase
        .from('verification_requests')
        .select('status, rejection_reason')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setReason(r?.status === 'rejected' ? r.rejection_reason : null);
      setLoading(false);
    })();
  }, [user]);

  const normalised = cac.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const upload = async (file: File, name: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'pdf';
    const path = user!.id + '/' + name + '-' + Date.now() + '.' + ext;
    const { error: upErr } = await supabase.storage
      .from('verification-docs')
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    return path;
  };

  const submit = async () => {
    if (!user || !certFile || !idFile || !declared) return;
    if (!CAC_PATTERN.test(normalised)) {
      setError('Enter a valid CAC number, such as RC1234567, BN1234567 or IT1234567.');
      return;
    }
    if (certFile.size > MAX_BYTES || idFile.size > MAX_BYTES) {
      setError('Each file must be under 5MB.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: dupes } = await supabase
        .from('companies')
        .select('id')
        .ilike('cac_number', normalised)
        .neq('id', user.id)
        .limit(1);
      if (dupes && dupes.length > 0) {
        throw new Error('This registration number is already used by another company. Contact support if this is a mistake.');
      }

      const certPath = await upload(certFile, 'business-reg');
      const idPath = await upload(idFile, 'nin-doc');

      const { error: reqErr } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          business_reg_url: certPath,
          nin_doc_url: idPath,
          representative_declared_at: new Date().toISOString(),
          status: 'pending',
        });
      if (reqErr) throw reqErr;

      const { error: coErr } = await supabase
        .from('companies')
        .update({ cac_number: normalised, verification_status: 'pending_verification' })
        .eq('id', user.id);
      if (coErr) throw coErr;

      await supabase
        .from('profiles')
        .update({ verification_status: 'pending_verification' })
        .eq('id', user.id);
      await refreshProfile();
      setStatus('pending_verification');
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message || 'Could not submit. Try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  const ready = !!certFile && !!idFile && declared && CAC_PATTERN.test(normalised);

  return (
    <div className="max-w-xl mx-auto px-5 py-10" style={font}>
      <Link
        to="/company/dashboard"
        className="flex items-center gap-1.5 text-[12px] text-white/40 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>

      <div className="bg-ink border border-white/6 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-6 h-6 text-gold" />
          <h1 className="text-[18px] font-black text-white">Verify your company</h1>
        </div>

        {status === 'verified' && (
          <p className="text-[13px] text-white/60">
            Your company is verified. Changing your company name or
            registration number sends it back for review.
          </p>
        )}

        {status === 'pending_verification' && (
          <p className="text-[13px] text-white/60">
            Your documents are under review. You will get a notification
            when a decision is made.
          </p>
        )}

        {status !== 'verified' && status !== 'pending_verification' && (
          <div className="space-y-5">
            <p className="text-[13px] text-white/50 leading-relaxed">
              Verification shows tenants that a real, registered business
              stands behind your listings. A reviewer checks your documents
              against the CAC public register.
            </p>

            {status === 'rejected' && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                <p className="text-[12px] text-danger font-semibold">
                  Your last submission was not approved.
                </p>
                {reason && (
                  <p className="text-[12px] text-white/50 mt-1">Reason: {reason}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-1">
                CAC registration number
              </label>
              <p className="text-[11px] text-white/30 mb-2">
                Starts with RC (company), BN (business name) or IT (incorporated trustees).
              </p>
              <input
                value={cac}
                onChange={e => { setCac(e.target.value); setError(null); }}
                placeholder="e.g. RC1234567"
                className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-gold/40"
              />
            </div>

            <FilePicker
              label="Registration certificate"
              hint={'The name on it must match "' + companyName + '". Upload a PDF or a clear, full-page scan.'}
              file={certFile}
              onPick={f => { setCertFile(f); setError(null); }}
            />

            <FilePicker
              label="Director or representative ID"
              hint="NIN slip, international passport or driver's licence of a director or authorised representative."
              file={idFile}
              onPick={f => { setIdFile(f); setError(null); }}
            />

            <label className="flex items-start gap-2.5 p-3 bg-white/3 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={declared}
                onChange={e => { setDeclared(e.target.checked); setError(null); }}
                className="mt-0.5 flex-shrink-0"
              />
              <span className="text-[12px] text-white/60 leading-relaxed">
                I am a director or authorised representative of this company, and I am allowed to manage its Handova account.
              </span>
            </label>

            <div className="flex items-start gap-2.5 p-3 bg-white/3 rounded-xl">
              <Lock className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/40 leading-relaxed">
                Your documents are stored privately and are used only to verify
                your business. Only Handova reviewers can open them, and each
                time a document is opened it is logged.
              </p>
            </div>

            {error && <p className="text-[12px] text-danger">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || !ready}
              className="w-full py-3 bg-gold text-ink text-[13px] font-bold rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for verification'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
