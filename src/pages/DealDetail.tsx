import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield, CheckCircle2, Clock, FileText, CreditCard,
  Home, AlertTriangle, Loader2, ArrowLeft, Download,
  Key, History, User, ExternalLink, X, Upload
} from 'lucide-react';
import { useDeal } from '../hooks/useDeal';
import { formatNaira } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { PaystackButton } from '../components/payment/PaystackButton';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    deal, logs, loading, error,
    uploadAgreement, signAgreement, confirmMoveIn,
    releaseFunds, markDisputed,
    isTenant, isLandlord, isAgent, isAdmin, isModerator,
    refresh,
  } = useDeal(id || '');

  const [processing, setProcessing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setProcessing(true);
    const result = await action();
    setProcessing(false);
    if (!result.success) {
      alert(result.error || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-3" style={font}>
        <div className="w-8 h-8 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading deal details...</p>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center" style={font}>
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-[20px] font-bold text-white mb-2">Deal Not Found</h1>
        <p className="text-[13px] text-white/40 mb-6 max-w-sm">
          {error || "This deal doesn't exist or you don't have permission to view it."}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const statusSteps = [
    { id: 'pending_payment', label: 'Payment', icon: CreditCard },
    { id: 'agreement_sent', label: 'Agreement', icon: FileText },
    { id: 'agreement_signed', label: 'Signed', icon: CheckCircle2 },
    { id: 'move_in_confirmed', label: 'Move In', icon: Key },
    { id: 'funds_released', label: 'Completed', icon: Shield },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.id === deal.status);

  const statusColor =
    deal.status === 'funds_released'
      ? 'bg-[#1a6b3c] text-white'
      : deal.status === 'disputed'
      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
      : 'bg-[#f0c040]/15 text-[#f0c040] border border-[#f0c040]/20';

  // Determine if this is an agent-only deal
  const isAgentDeal = !!deal.agent_id;
  const isLandlordDeal = !!deal.landlord_id && deal.landlord_id !== deal.agent_id;

  // Build parties list dynamically
  const parties = [
    { label: 'Tenant', name: deal.profiles?.full_name || 'Tenant', initial: 'T' },
    ...(isLandlordDeal
      ? [{ label: 'Landlord', name: `ID: ${deal.landlord_id!.slice(0, 8)}...`, initial: 'L' }]
      : []),
    ...(isAgentDeal
      ? [{ label: 'Agent', name: `ID: ${deal.agent_id!.slice(0, 8)}...`, initial: 'A' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24" style={font}>

      {/* ── Top bar ── */}
      <div className="sticky top-16 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider ${statusColor}`}>
            {deal.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-5">

        {/* ── Header card ── */}
        <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 lg:p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#1a6b3c]" />
            </div>
            <div>
              <h1 className="text-[20px] font-black text-white">Escrow Transaction</h1>
              <p className="text-[11px] text-white/30 font-mono">
                {deal.id.slice(0, 8)}...{deal.id.slice(-8)}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            {statusSteps.map((s, i) => {
              const Icon = s.icon;
              const done = i < currentStepIndex || deal.status === 'funds_released';
              const active = i === currentStepIndex && deal.status !== 'funds_released';
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      done ? 'bg-[#1a6b3c] text-white' :
                      active ? 'bg-[#f0c040] text-black scale-110' :
                      'bg-white/5 text-white/20'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      done ? 'text-[#1a6b3c]' : active ? 'text-[#f0c040]' : 'text-white/20'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`flex-1 h-px mx-1 mb-4 ${i < currentStepIndex ? 'bg-[#1a6b3c]' : 'bg-white/8'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Actions ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Property summary */}
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-[#1a6b3c]" />
                  <h3 className="text-[14px] font-bold text-white">Property Details</h3>
                </div>
                <Link
                  to={`/property/${deal.property_id}`}
                  className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/30 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                  {deal.properties?.images?.[0] ? (
                    <img src={deal.properties.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-8 h-8 text-white/10" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-bold text-white mb-1 truncate">
                    {deal.properties?.title || 'Property'}
                  </h4>
                  <p className="text-[12px] text-white/40 mb-3">
                    {deal.properties?.address || ''}
                  </p>
                  <div className="flex gap-2">
                    <div className="bg-white/4 border border-white/6 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Amount</p>
                      <p className="text-[13px] font-black text-[#f0c040]">{formatNaira(deal.amount)}</p>
                    </div>
                    <div className="bg-white/4 border border-white/6 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Duration</p>
                      <p className="text-[13px] font-black text-white capitalize">
                        {deal.notes || '1 year'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <h3 className="text-[14px] font-bold text-white mb-5">Required Actions</h3>

              {/* 1. Tenant pays */}
              {deal.status === 'pending_payment' && isTenant && (
                <div className="p-5 bg-[#f0c040]/6 border border-[#f0c040]/15 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#f0c040]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-[#f0c040]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Initialize Escrow Payment</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        Secure your property by paying into escrow. Funds are held safely until you confirm move-in.
                      </p>
                    </div>
                  </div>

                  {/* Only show credit if it's actually > 0 */}
                  {deal.inspection_fee_credit != null && deal.inspection_fee_credit > 0 && (
                    <div className="flex items-center justify-between p-3 bg-[#1a6b3c]/10 border border-[#1a6b3c]/20 rounded-xl mb-4">
                      <div className="flex items-center gap-2 text-[12px] font-semibold text-[#1a6b3c]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Inspection fee credit applied
                      </div>
                      <span className="text-[12px] font-bold text-[#1a6b3c]">
                        -{formatNaira(deal.inspection_fee_credit)}
                      </span>
                    </div>
                  )}

                  {processing ? (
                    <div className="flex items-center justify-center gap-3 py-4">
                      <div className="w-5 h-5 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[13px] text-white/50">Processing payment...</p>
                    </div>
                  ) : (
                    <PaystackButton
                      amount={deal.amount - (deal.inspection_fee_credit || 0)}
                      email={user?.email || ''}
                      reference={`ESCROW_${deal.id}_${Date.now()}`}
                      label="Pay into Escrow"
                      className="w-full"
                      onSuccess={async (reference) => {
                        setProcessing(true);
                        try {
                          // ✅ Update deal status directly — don't rely on edge function
                          const { error } = await supabase
                            .from('deals')
                            .update({ status: 'payment_received' })
                            .eq('id', deal.id);

                          if (error) throw error;

                          // Also try edge function non-blocking
                          supabase.functions.invoke('process-payment-webhook', {
                            body: {
                              event: 'charge.success',
                              data: { reference, metadata: { deal_id: deal.id, type: 'escrow_payment' } },
                            },
                          }).catch(() => {});

                          // Refresh deal to show updated status
                          await refresh();
                        } catch (err) {
                          console.error('Payment processing error:', err);
                          alert('Payment received but status update failed. Contact support with ref: ' + reference);
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      onClose={() => {}}
                    />
                  )}
                </div>
              )}

              {/* 2. Upload agreement */}
              {deal.status === 'payment_received' && (isLandlord || isAgent) && (
                <div className="p-5 bg-[#1a6b3c]/8 border border-[#1a6b3c]/20 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-[#1a6b3c]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Upload Tenancy Agreement</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        Payment received. Upload the tenancy agreement (PDF only, max 20MB) for the tenant to sign.
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.type !== 'application/pdf') { alert('Please upload a PDF file'); return; }
                      if (file.size > 20 * 1024 * 1024) { alert('File exceeds 20MB limit'); return; }
                      setProcessing(true);
                      setUploadProgress(30);
                      const result = await uploadAgreement(file);
                      setUploadProgress(100);
                      setProcessing(false);
                      if (!result.success) { alert(result.error || 'Upload failed'); setUploadProgress(0); }
                    }}
                  />
                  {processing && uploadProgress > 0 && (
                    <div className="w-full bg-white/5 h-1.5 rounded-full mb-4 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-[#1a6b3c]"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="w-full bg-[#1a6b3c] text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {processing ? 'Uploading...' : 'Select & Upload PDF'}
                  </button>
                </div>
              )}

              {/* 3. Sign agreement */}
              {deal.status === 'agreement_sent' && (
                <div className="p-5 bg-white/4 border border-white/8 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-white/8 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Sign Tenancy Agreement</h4>
                      <p className="text-[12px] text-white/45">Review the agreement before signing.</p>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 p-4 bg-white/4 border border-white/8 rounded-xl cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 flex-shrink-0 accent-[#1a6b3c]"
                    />
                    <span className="text-[12px] text-white/65 leading-relaxed">
                      I have read and agree to the terms of this tenancy agreement
                    </span>
                  </label>
                  <div className="flex gap-3">
                    {deal.agreement_url && (
                      <a
                        href={deal.agreement_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-white/60 hover:text-white transition-colors"
                      >
                        <Download className="w-4 h-4" /> View
                      </a>
                    )}
                    {((isTenant && !deal.tenant_signed_at) || (isLandlord && !deal.landlord_signed_at)) && (
                      <button
                        onClick={() => handleAction(signAgreement)}
                        disabled={processing || !agreedToTerms}
                        className="flex-[2] bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Agreement'}
                      </button>
                    )}
                  </div>
                  {((isTenant && deal.tenant_signed_at) || (isLandlord && deal.landlord_signed_at)) && (
                    <p className="mt-3 text-center text-[11px] font-bold text-[#1a6b3c]">
                      ✓ You have signed this agreement
                    </p>
                  )}
                </div>
              )}

              {/* 4. Confirm move-in */}
              {deal.status === 'agreement_signed' && isTenant && (
                <div className="p-5 bg-[#1a6b3c]/8 border border-[#1a6b3c]/20 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-[#1a6b3c]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Confirm Move-in</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        Have you moved in successfully? Confirming will release funds to the owner.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAction(confirmMoveIn)}
                    disabled={processing}
                    className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Move-in'}
                  </button>
                </div>
              )}

              {/* 5. Admin release funds */}
              {deal.status === 'move_in_confirmed' && (isAdmin || isModerator) && (
                <div className="p-5 bg-[#f0c040]/6 border border-[#f0c040]/15 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#f0c040]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-[#f0c040]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Admin: Release Funds</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        Move-in confirmed. Verify documents and release funds to complete the transaction.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAction(releaseFunds)}
                    disabled={processing}
                    className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Release Funds'}
                  </button>
                </div>
              )}

              {/* Completed */}
              {deal.status === 'funds_released' && (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-[#1a6b3c] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="text-[18px] font-bold text-white mb-2">Transaction Completed</h4>
                  <p className="text-[13px] text-white/40 max-w-xs mx-auto">
                    All funds have been released and the tenancy is finalized. Thank you for using RentEasy!
                  </p>
                </div>
              )}

              {/* Disputed */}
              {deal.status === 'disputed' && (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <h4 className="text-[18px] font-bold text-white mb-2">Under Dispute</h4>
                  <p className="text-[13px] text-white/40 max-w-xs mx-auto">
                    This transaction has been flagged. Our moderation team is reviewing the case.
                  </p>
                </div>
              )}

              {deal.status !== 'funds_released' && deal.status !== 'disputed' &&
                !isTenant && !isLandlord && !isAgent && !isAdmin && !isModerator && (
                <div className="p-8 text-center">
                  <p className="text-[13px] text-white/30">No actions required from you at this stage.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">

            {/* Parties */}
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-[#1a6b3c]" />
                <h3 className="text-[13px] font-bold text-white">Parties Involved</h3>
              </div>
              <div className="space-y-3">
                {parties.map((p) => (
                  <div key={p.label} className="flex items-center gap-3 p-3 bg-white/4 rounded-xl">
                    <div className="w-8 h-8 bg-[#1a6b3c]/20 rounded-xl flex items-center justify-center text-[#1a6b3c] text-[12px] font-bold flex-shrink-0">
                      {p.initial}
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">{p.label}</p>
                      <p className="text-[12px] font-semibold text-white">{p.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout breakdown */}
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <h3 className="text-[13px] font-bold text-white mb-4">Payout Breakdown</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Total Amount', value: formatNaira(deal.amount), highlight: true },
                  { label: 'Platform Fee (2%)', value: `-${formatNaira(deal.platform_fee)}` },
                  ...(deal.agent_fee && deal.agent_fee > 0
                    ? [{ label: 'Agent Commission (10%)', value: `-${formatNaira(deal.agent_fee)}` }]
                    : []),
                  {
                    label: isAgentDeal && !isLandlordDeal ? 'Agent Payout' : 'Landlord Payout',
                    value: formatNaira(deal.landlord_payout),
                    highlight: true,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className={`text-[12px] ${row.highlight ? 'font-bold text-white' : 'text-white/40'}`}>
                      {row.label}
                    </span>
                    <span className={`text-[12px] font-bold ${row.highlight ? 'text-[#f0c040]' : 'text-white/60'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity log */}
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-[#1a6b3c]" />
                <h3 className="text-[13px] font-bold text-white">Activity Log</h3>
              </div>
              {logs.length === 0 ? (
                <p className="text-[12px] text-white/25 text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log, i) => (
                    <div key={log.id} className="relative flex gap-3">
                      {i !== logs.length - 1 && (
                        <div className="absolute left-3.5 top-7 bottom-0 w-px bg-white/5" />
                      )}
                      <div className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 z-10">
                        <Clock className="w-3.5 h-3.5 text-white/25" />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-white capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-white/25">
                          {new Date(log.created_at).toLocaleDateString()} ·{' '}
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin danger zone */}
            {isAdmin && deal.status !== 'disputed' && deal.status !== 'funds_released' && (
              <div className="bg-red-500/6 border border-red-500/15 rounded-2xl p-5">
                <h3 className="text-[13px] font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Danger Zone
                </h3>
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="w-full bg-red-500/15 text-red-400 border border-red-500/20 py-3 rounded-xl font-bold text-[13px] hover:bg-red-500/25 transition-colors"
                >
                  Mark as Disputed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dispute modal ── */}
      <AnimatePresence>
        {showDisputeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDisputeModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] p-6 shadow-2xl"
              style={font}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-bold text-white">Flag Transaction</h3>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] text-white/45 mb-4 leading-relaxed">
                Provide a reason for marking this as disputed. This will freeze all funds immediately.
              </p>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Reason for dispute..."
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-red-500/40 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleAction(() => markDisputed(disputeReason));
                    setShowDisputeModal(false);
                  }}
                  disabled={!disputeReason || processing}
                  className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-red-600 transition-colors disabled:opacity-40"
                >
                  Confirm Dispute
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}