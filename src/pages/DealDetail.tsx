import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield, CheckCircle2, Clock, FileText, CreditCard,
  Home, AlertTriangle, Loader2, ArrowLeft, Download,
  Key, History, User, ExternalLink, X, Upload,
  Eye, ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react';
import { useDeal } from '../hooks/useDeal';
import { ReceiptPanel } from '../components/receipt/ReceiptCards';
import { DelegatesSection } from '../components/deal/DelegatesSection';
import { DealReviewSection } from '../components/deal/DealReviewSection';
import { DealDelegatePreview } from '../components/deal/DealDelegatePreview';
import { formatNaira } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { PaystackButton } from '../components/payment/PaystackButton';
import { supabase } from '../lib/supabase';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    deal, logs, loading, error, delegatePreview,
    uploadAgreement, generateAgreement, approveDraftAgreement, requestAgreementChanges, getAgreementViewUrl,
    signAgreement, confirmMoveIn, confirmHandover, releaseFunds, markDisputed, cancelDeal, cancelDealAsTenant,
    isTenant, isLandlord, isAgent, isAdmin, isModerator,
    refresh,
  } = useDeal(id || '');

  const [processing, setProcessing] = useState(false);
  const [agreementViewUrl, setAgreementViewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (deal?.agreement_path || deal?.agreement_url) {
      getAgreementViewUrl().then(setAgreementViewUrl);
    }
  }, [deal?.agreement_path]);
  const [disputeReason, setDisputeReason] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showTenantCancelModal, setShowTenantCancelModal] = useState(false);
  const [tenantCancelReason, setTenantCancelReason] = useState('');
  const [showReceiptPanel, setShowReceiptPanel] = useState(false);
  const [canPayAsDelegate, setCanPayAsDelegate] = useState(false);

  useEffect(() => {
    if (!deal || !user || isTenant) return;
    supabase
      .from('deal_delegates')
      .select('id')
      .eq('deal_id', deal.id)
      .eq('delegate_id', user.id)
      .eq('principal_id', deal.tenant_id)
      .eq('status', 'accepted')
      .eq('can_pay', true)
      .maybeSingle()
      .then(({ data }) => setCanPayAsDelegate(!!data));
  }, [deal?.id, user?.id, isTenant]);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    if (processing) return;
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

  if (delegatePreview) {
    return <DealDelegatePreview preview={delegatePreview} onResponded={refresh} />;
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

  const isSaleDeal = deal.properties?.transaction_type === 'sell';

  const statusSteps = [
    { id: 'agreement_draft', label: 'Agreement', icon: FileText },
    { id: 'agreement_sent', label: 'Signed', icon: CheckCircle2 },
    { id: 'pending_payment', label: 'Payment', icon: CreditCard },
    { id: 'payment_received', label: 'Received', icon: CheckCircle2 },
    { id: 'move_in_confirmed', label: isSaleDeal ? 'Handover' : 'Move In', icon: Key },
    { id: 'funds_released', label: 'Completed', icon: Shield },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.id === deal.status);

  const statusColor =
    deal.status === 'funds_released'
      ? 'bg-[#1a6b3c] text-white'
      : deal.status === 'disputed'
      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
      : 'bg-[#f0c040]/15 text-[#f0c040] border border-[#f0c040]/20';

  const isAgentDeal = !!deal.agent_id;
  const isLandlordDeal = !!deal.landlord_id && deal.landlord_id !== deal.agent_id;

  const parties = [
    { label: 'Tenant', name: deal.profiles?.full_name || 'Tenant', initial: 'T', verification_status: deal.profiles?.verification_status },
    ...(isLandlordDeal
      ? [{ label: 'Landlord', name: deal.landlord?.full_name || 'Landlord', initial: 'L', verification_status: deal.landlord?.verification_status }]
      : []),
    ...(isAgentDeal
      ? [{ label: 'Agent', name: deal.agent?.full_name || 'Agent', initial: 'A', verification_status: deal.agent?.verification_status }]
      : []),
    ...(deal.accepted_delegates || []).map((d) => {
      const principalRole =
        d.principal_id === deal.tenant_id ? 'Tenant' :
        d.principal_id === deal.landlord_id ? 'Landlord' :
        d.principal_id === deal.agent_id ? 'Agent' : 'Principal';
      const delegateName = d.delegate?.full_name || 'Delegate';
      return {
        label: `${principalRole}'s Delegate`,
        name: delegateName,
        initial: delegateName.charAt(0).toUpperCase(),
        verification_status: d.delegate?.verification_status,
      };
    }),
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24" style={font}>

      {/* Top bar */}
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

        {/* Header card */}
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

          {/* Progress stepper */}
          <div className="flex items-center overflow-x-auto pb-2">
            {statusSteps.map((s, i) => {
              const Icon = s.icon;
              const done = i < currentStepIndex || deal.status === 'funds_released';
              const active = i === currentStepIndex && deal.status !== 'funds_released';
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
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
                    <div className={`flex-1 h-px mx-1 mb-4 min-w-[16px] ${
                      i < currentStepIndex ? 'bg-[#1a6b3c]' : 'bg-white/8'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Actions */}
          <div className="lg:col-span-2 space-y-5">

            {/* Property summary */}
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-[#1a6b3c]" />
                  <h3 className="text-[14px] font-bold text-white">Property Details</h3>
                </div>
                <div className="flex items-center gap-2">
                  {deal.agreement_url && (
                    
                    <a
                      href={agreementViewUrl || deal.agreement_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 h-8 bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors text-[11px] font-bold"
                    >
                      <FileText className="w-3.5 h-3.5" /> Agreement
                    </a>
                  )}
                  <Link
                    to={`/property/${deal.property_id}`}
                    className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/30 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
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
                        {deal.duration || '1 year'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <h3 className="text-[14px] font-bold text-white mb-5">Required Actions</h3>

              {/* STEP 1: Agent/Landlord uploads agreement draft */}
              {deal.status === 'agreement_draft' && !deal.agreement_url && (isLandlord || isAgent) && (
                <div className="p-5 bg-[#1a6b3c]/8 border border-[#1a6b3c]/20 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Upload className="w-4 h-4 text-[#1a6b3c]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">{isSaleDeal ? 'Upload or Generate Contract' : 'Upload or Generate Agreement'}</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        Upload the tenancy agreement for the tenant to review before they pay. PDF or image (JPG, PNG, WebP), max 20MB.
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) { alert('Please upload a PDF or image file (JPG, PNG, WebP)'); return; }
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
                    {processing ? 'Uploading...' : 'Upload Agreement PDF'}
                  </button>
                  <button
                    onClick={async () => {
                      setProcessing(true);
                      const result = await generateAgreement();
                      setProcessing(false);
                      if (!result.success) alert(result.error || 'Failed to generate agreement');
                    }}
                    disabled={processing}
                    className="w-full mt-3 bg-white/5 text-white/70 border border-white/10 py-3 rounded-xl font-bold text-[13px] hover:bg-white/8 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    Generate {isSaleDeal ? 'Contract' : 'Agreement'} for Me (₦10,000 fee, deducted from payout)
                  </button>
                </div>
              )}

              {/* Tenant waiting for agreement */}
              {deal.status === 'agreement_draft' && !deal.agreement_url && isTenant && (
                <div className="p-5 bg-white/4 border border-white/8 rounded-xl text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-6 h-6 text-white/30" />
                  </div>
                  <h4 className="text-[14px] font-bold text-white mb-2">Waiting for Agreement</h4>
                  <p className="text-[13px] text-white/45 leading-relaxed">
                    The agent or landlord is preparing your tenancy agreement. You will be notified once it is ready for your review.
                  </p>
                </div>
              )}

              {/* STEP 2: Tenant reviews draft agreement */}
              {deal.status === 'agreement_draft' && deal.agreement_url && isTenant && (
                <div className="p-5 bg-[#f0c040]/6 border border-[#f0c040]/15 rounded-xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-[#f0c040]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4 text-[#f0c040]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Review Your Tenancy Agreement</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        Read the agreement carefully before approving. Once you approve and pay into escrow, the agreement becomes binding.
                      </p>
                    </div>
                  </div>

                  {/* View agreement button */}
                  <a
                    href={agreementViewUrl || deal.agreement_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w/full py-3 bg-white/5 border border-white/10 rounded-xl text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    View / Download Agreement PDF
                  </a>

                  {/* Change requested note */}
                  {deal.notes?.startsWith('Change requested:') && (
                    <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[12px] text-orange-400">{deal.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowChangeModal(true)}
                      disabled={processing}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-[13px] font-bold text-white/60 hover:text-white hover:bg-white/8 transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => handleAction(approveDraftAgreement)}
                      disabled={processing}
                      className="flex-[2] flex items-center justify-center gap-2 bg-[#f0c040] text-black py-3 rounded-xl font-bold text-[13px] hover:bg-[#e0b030] transition-colors disabled:opacity-40"
                    >
                      {processing
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ThumbsUp className="w-4 h-4" />
                      }
                      Approve & Proceed to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Agent waiting for tenant to review */}
              {deal.status === 'agreement_draft' && deal.agreement_url && (isLandlord || isAgent) && (
                <div className="p-5 bg-white/4 border border-white/8 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-white/8 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Agreement Uploaded</h4>
                      <p className="text-[12px] text-white/45">
                        The tenant is reviewing the agreement. You will be notified once they approve or request changes.
                      </p>
                    </div>
                  </div>
                  <a
                    href={agreementViewUrl || deal.agreement_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-semibold text-white/50 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" /> View Uploaded Agreement
                  </a>
                  {deal.notes?.startsWith('Change requested:') && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[12px] font-bold text-orange-400 mb-1">Tenant Requested Changes</p>
                        <p className="text-[12px] text-orange-400/70">{deal.notes}</p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 flex items-center gap-2 text-[12px] font-bold text-[#f0c040] hover:text-[#e0b030] transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Revised Agreement
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setProcessing(true);
                            const result = await uploadAgreement(file);
                            setProcessing(false);
                            if (!result.success) alert(result.error || 'Upload failed');
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Tenant pays into escrow */}
              {deal.status === 'pending_payment' && (isTenant || canPayAsDelegate) && (
                <div className="p-5 bg-[#f0c040]/6 border border-[#f0c040]/15 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#f0c040]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-[#f0c040]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Initialize Escrow Payment</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        You have approved the tenancy agreement. Now pay your rent securely into escrow. Funds are held safely until you confirm move-in.
                      </p>
                    </div>
                  </div>

                  {/* Show agreement for final reference */}
                  {deal.agreement_url && (
                    <a
                      href={agreementViewUrl || deal.agreement_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mb-4 text-[12px] text-[#f0c040]/60 hover:text-[#f0c040] transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View agreed tenancy agreement
                    </a>
                  )}

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
                      disabled={!deal.agreement_url && !deal.agreement_skipped}
                      metadata={{ deal_id: deal.id, type: 'escrow_payment' }}
                      onSuccess={async (reference) => {
                        setProcessing(true);
                        try {
                          let confirmed = false;
                          for (let i = 0; i < 10; i++) {
                            await new Promise(r => setTimeout(r, 2000));
                            await refresh();
                            const { data: updated } = await supabase
                              .from('deals')
                              .select('status')
                              .eq('id', deal.id)
                              .single();
                            if (updated?.status === 'payment_received') {
                              confirmed = true;
                              break;
                            }
                          }
                          if (!confirmed) {
                            alert(
                              'Your payment was received by Paystack (ref: ' + reference + '). ' +
                              'Our system is confirming it — please refresh in a moment. ' +
                              'Contact support if this persists after 5 minutes.'
                            );
                          }
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      onClose={() => {}}
                    />
                  )}
                </div>
              )}

              {/* Agent waiting for payment */}
              {deal.status === 'pending_payment' && (isLandlord || isAgent) && (
                <div className="p-5 bg-white/4 border border-white/8 rounded-xl text-center">
                  <Clock className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <h4 className="text-[14px] font-bold text-white mb-2">Waiting for Escrow Payment</h4>
                  <p className="text-[13px] text-white/40">
                    The tenant has approved the agreement and will now make their escrow payment.
                  </p>
                </div>
              )}

              {/* STEP 4: Payment received — both parties sign */}

              {/* STEP 4 (skipped agreement path): tenant confirms move-in directly */}
              {deal.status === 'payment_received' && deal.agreement_skipped && isTenant && (
                <div className="p-5 bg-[#1a6b3c]/8 border border-[#1a6b3c]/20 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-[#1a6b3c]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">{isSaleDeal ? 'Confirm Handover' : 'Confirm Move-in'}</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        {isSaleDeal
                          ? 'No written contract was uploaded for this deal — you confirmed terms directly with the landlord/agent when you paid. Only confirm below after you have physically received the property and all relevant documents. This will release funds to the seller.'
                          : 'No written tenancy agreement was uploaded for this deal — you confirmed terms directly with the landlord/agent when you paid. Only confirm below after you have physically received the keys and access to the property. This will release funds to the owner.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAction(isSaleDeal ? confirmHandover : confirmMoveIn)}
                    disabled={processing}
                    className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSaleDeal ? 'Confirm Handover & Release Funds' : 'Confirm Move-in & Release Funds')}
                  </button>
                  <p className="text-[11px] text-white/25 text-center mt-3">
                    {isSaleDeal ? '⚠️ Only confirm after you have received the property. This action cannot be undone.' : '⚠️ Only confirm after you have received the keys. This action cannot be undone.'}
                  </p>
                </div>
              )}

              {deal.status === 'payment_received' && deal.agreement_skipped && (isLandlord || isAgent) && (
                <div className="p-5 bg-white/4 border border-white/8 rounded-xl text-center">
                  <Key className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <h4 className="text-[14px] font-bold text-white mb-2">Hand Over the Keys</h4>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    Payment received in escrow. No written agreement was required for this deal. Please give the tenant access to the property — funds will be released once they confirm move-in.
                  </p>
                </div>
              )}
              {deal.status === 'agreement_sent' && !deal.agreement_skipped && (
                <div className="p-5 bg-white/4 border border-white/8 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-white/8 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Sign Tenancy Agreement</h4>
                      <p className="text-[12px] text-white/45">
                        Payment received and secured in escrow. Both parties must now formally sign the agreement.
                      </p>
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
                      I confirm I have read and agree to all terms of this tenancy agreement
                    </span>
                  </label>
                  <div className="flex gap-3">
                    {deal.agreement_url && (
                      <a
                        href={agreementViewUrl || deal.agreement_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-white/60 hover:text-white transition-colors"
                      >
                        <Download className="w-4 h-4" /> View
                      </a>
                    )}
                    {((isTenant && !deal.tenant_signed_at) || ((isLandlord || isAgent) && !deal.landlord_signed_at)) && (
                      <button
                        onClick={() => handleAction(signAgreement)}
                        disabled={processing || !agreedToTerms}
                        className="flex-[2] bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Agreement'}
                      </button>
                    )}
                  </div>
                  {((isTenant && deal.tenant_signed_at) || ((isLandlord || isAgent) && deal.landlord_signed_at)) && (
                    <p className="mt-3 text-center text-[11px] font-bold text-[#1a6b3c]">
                      ✓ You have signed — waiting for the other party
                    </p>
                  )}
                </div>
              )}

              {/* STEP 5: Confirm move-in */}
              {deal.status === 'payment_received' && !deal.agreement_skipped && isTenant && (
                <div className="p-5 bg-[#1a6b3c]/8 border border-[#1a6b3c]/20 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-[#1a6b3c]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">{isSaleDeal ? 'Confirm Handover' : 'Confirm Move-in'}</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        {isSaleDeal
                          ? 'Has the property been handed over successfully? Only confirm after you have physically received the property and all relevant documents. This will release funds to the seller.'
                          : 'Have you moved in successfully? Only confirm after you have physically received the keys and access to the property. This will release funds to the owner.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAction(isSaleDeal ? confirmHandover : confirmMoveIn)}
                    disabled={processing}
                    className="w-full bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSaleDeal ? 'Confirm Handover & Release Funds' : 'Confirm Move-in & Release Funds')}
                  </button>
                  <p className="text-[11px] text-white/25 text-center mt-3">
                    {isSaleDeal ? '⚠️ Only confirm after you have received the property. This action cannot be undone.' : '⚠️ Only confirm after you have received the keys. This action cannot be undone.'}
                  </p>
                </div>
              )}

              {deal.status === 'payment_received' && !deal.agreement_skipped && (isLandlord || isAgent) && (
                <div className="p-5 bg-white/4 border border-white/8 rounded-xl text-center">
                  <Key className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <h4 className="text-[14px] font-bold text-white mb-2">Hand Over the Keys</h4>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    Both parties have signed. Please give the tenant access to the property. Funds will be released once they confirm move-in.
                  </p>
                </div>
              )}

              {/* STEP 6: Admin release funds */}
              {deal.status === 'move_in_confirmed' && (isAdmin || isModerator) && (
                <div className="p-5 bg-[#f0c040]/6 border border-[#f0c040]/15 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#f0c040]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-[#f0c040]" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white mb-1">Admin: Release Funds</h4>
                      <p className="text-[12px] text-white/45 leading-relaxed">
                        Move-in confirmed by tenant. Verify everything is in order and release funds to the owner.
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

              {deal.status === 'move_in_confirmed' && !isAdmin && !isModerator && (
                <div className="p-5 bg-[#1a6b3c]/8 border border-[#1a6b3c]/20 rounded-xl text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#4ade80] mx-auto mb-3" />
                  <h4 className="text-[14px] font-bold text-white mb-2">Move-in Confirmed!</h4>
                  <p className="text-[13px] text-white/40">
                    Funds are being reviewed for release by our team. This usually takes less than 24 hours.
                  </p>
                </div>
              )}

              {/* Completed */}
              {deal.status === 'funds_released' && (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-[#1a6b3c] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="text-[18px] font-bold text-white mb-2">Transaction Completed!</h4>
                  <p className="text-[13px] text-white/40 max-w-xs mx-auto">
                    All funds have been released. The tenancy is finalized. Thank you for using RentEasy!
                  </p>
                </div>
              )}

              {/* Cancelled */}
              {deal.status === 'cancelled' && (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <X className="w-7 h-7 text-white/40" />
                  </div>
                  <h4 className="text-[18px] font-bold text-white mb-2">Deal Cancelled</h4>
                  {deal.cancellation_reason && (
                    <div className="mt-4 p-4 bg-white/4 border border-white/8 rounded-xl text-left max-w-xs mx-auto">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">Reason</p>
                      <p className="text-[12px] text-white/60 leading-relaxed">{deal.cancellation_reason}</p>
                    </div>
                  )}
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
                    This transaction has been flagged. Our moderation team is reviewing the case within 3-5 business days.
                  </p>
                  {deal.dispute_reason && (
                    <div className="mt-4 p-4 bg-red-500/6 border border-red-500/15 rounded-xl text-left max-w-xs mx-auto">
                      <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider mb-1">Reason</p>
                      <p className="text-[12px] text-white/60 leading-relaxed">{deal.dispute_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
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
                      <p className="text-[12px] font-semibold text-white flex items-center gap-1"><span>{p.name}</span><VerifiedBadge status={p.verification_status} size={12} /></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DelegatesSection dealId={deal.id} isPrincipal={isTenant || isLandlord || isAgent} isTenantPrincipal={isTenant} />

            <DealReviewSection
              dealId={deal.id}
              dealStatus={deal.status}
              currentUserId={user?.id}
              isTenant={isTenant}
              isLandlord={isLandlord}
              isAgent={isAgent}
              tenantName={deal.profiles?.full_name}
              landlordName={deal.landlord?.full_name}
              agentName={deal.agent?.full_name}
              tenantId={deal.tenant_id}
              landlordId={deal.landlord_id}
              agentId={deal.agent_id}
            />

            {/* Payout breakdown */}
            {(isLandlord || isAgent || isAdmin || isModerator) ? (
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
              <h3 className="text-[13px] font-bold text-white mb-4">Payout Breakdown</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Total Amount', value: formatNaira(deal.amount), highlight: true },
                  { label: 'Platform Fee (2%)', value: `-${formatNaira(deal.platform_fee)}` },
                  ...(deal.agent_id && deal.agent_fee && deal.agent_fee > 0
                    ? [
                        { label: 'Your Commission (10%)', value: formatNaira(deal.agent_fee) },
                        { label: "Landlord's Share (forward to them yourself)", value: formatNaira(deal.landlord_payout) },
                      ]
                    : []),
                  ...(deal.agreement_fee && deal.agreement_fee > 0
                    ? [{ label: 'Agreement Generation Fee', value: `-${formatNaira(deal.agreement_fee)}` }]
                    : []),
                  {
                    label: deal.agent_id ? 'Your Total Payout' : 'Landlord Payout',
                    value: formatNaira(
                      Math.max(0,
                        (deal.agent_id
                          ? Number(deal.agent_fee || 0) + Number(deal.landlord_payout)
                          : Number(deal.landlord_payout)
                        ) - Number(deal.agreement_fee || 0)
                      )
                    ),
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
            ) : (
              <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                <h3 className="text-[13px] font-bold text-white mb-2">Pricing</h3>
                <p className="text-[12px] text-white/40 leading-relaxed">
                  The amount shown includes all applicable fees. 
                </p>
              </div>
            )}

            {!['agreement_draft', 'pending_payment'].includes(deal.status) && (
              <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                <h3 className="text-[13px] font-bold text-white mb-2">Receipt</h3>
                <p className="text-[12px] text-white/40 mb-3 leading-relaxed">
                  Generate a shareable proof of this transaction.
                </p>
                <button
                  onClick={() => setShowReceiptPanel(true)}
                  className="w-full bg-white/5 text-white/70 border border-white/10 py-3 rounded-xl font-bold text-[13px] hover:bg-white/8 transition-colors"
                >
                  Generate Receipt
                </button>
              </div>
            )}

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
            {isTenant && deal.status !== 'move_in_confirmed' && deal.status !== 'funds_released' && deal.status !== 'disputed' && deal.status !== 'cancelled' && (
              <div className="bg-[#0a1f11] border border-red-500/15 rounded-2xl p-5">
                <h3 className="text-[13px] font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Cancel This Deal
                </h3>
                <p className="text-[12px] text-white/40 mb-3">
                  {deal.status === 'agreement_draft' || deal.status === 'pending_payment'
                    ? 'No payment has been made yet — this deal can be cancelled free of charge.'
                    : 'A 5% cancellation fee applies. The rest of your payment will be refunded.'}
                </p>
                <button
                  onClick={() => setShowTenantCancelModal(true)}
                  className="w-full bg-red-500/15 text-red-400 border border-red-500/20 py-3 rounded-xl font-bold text-[13px] hover:bg-red-500/25 transition-colors"
                >
                  Cancel Deal
                </button>
              </div>
            )}

            {isAdmin && deal.status !== 'disputed' && deal.status !== 'funds_released' && (
              <div className="bg-red-500/6 border border-red-500/15 rounded-2xl p-5">
                <h3 className="text-[13px] font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Danger Zone
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="flex-1 bg-red-500/15 text-red-400 border border-red-500/20 py-3 rounded-xl font-bold text-[13px] hover:bg-red-500/25 transition-colors"
                  >
                    Mark as Disputed
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 bg-white/5 text-white/60 border border-white/10 py-3 rounded-xl font-bold text-[13px] hover:bg-white/8 transition-colors"
                  >
                    Cancel Deal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Request Changes Modal */}
      <AnimatePresence>
        {showChangeModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowChangeModal(false)}
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
                <h3 className="text-[16px] font-bold text-white">Request Agreement Changes</h3>
                <button
                  onClick={() => setShowChangeModal(false)}
                  className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] text-white/45 mb-4 leading-relaxed">
                Describe what you would like changed in the agreement. The agent/landlord will upload a revised version.
              </p>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Clause 3 mentions pets are not allowed but we agreed dogs are permitted..."
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#f0c040]/40 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowChangeModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!changeReason.trim()) return;
                    await handleAction(() => requestAgreementChanges(changeReason));
                    setShowChangeModal(false);
                    setChangeReason('');
                  }}
                  disabled={!changeReason.trim() || processing}
                  className="flex-1 bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40"
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cancel Deal Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
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
                <h3 className="text-[16px] font-bold text-white">Cancel This Deal</h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] text-white/45 mb-4 leading-relaxed">
                This voids the deal and frees the property back up for new deals. Cannot be undone.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-red-500/40 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    handleAction(() => cancelDeal(cancelReason));
                    setShowCancelModal(false);
                  }}
                  disabled={!cancelReason || processing}
                  className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-red-600 transition-all disabled:opacity-40"
                >
                  Confirm Cancellation
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Receipt Panel */}
      <AnimatePresence>
        {showReceiptPanel && deal && (
          <ReceiptPanel deal={deal} onClose={() => setShowReceiptPanel(false)} />
        )}
      </AnimatePresence>

      {/* Tenant Cancel Modal */}
      <AnimatePresence>
        {showTenantCancelModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowTenantCancelModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 bg-[#0a1f11] border border-white/10 rounded-t-3xl md:rounded-3xl p-6 z-50 w-full md:max-w-md"
            >
              <h3 className="text-[16px] font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Cancel Deal
              </h3>
              <p className="text-[13px] text-white/45 mb-4 leading-relaxed">
                {deal.status === 'agreement_draft' || deal.status === 'pending_payment'
                  ? 'No payment has been made on this deal, so this cancellation is free. This cannot be undone.'
                  : 'A 5% cancellation fee will be deducted from your refund. This cannot be undone.'}
              </p>
              <textarea
                value={tenantCancelReason}
                onChange={(e) => setTenantCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-red-500/40 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTenantCancelModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    handleAction(() => cancelDealAsTenant(tenantCancelReason));
                    setShowTenantCancelModal(false);
                  }}
                  disabled={!tenantCancelReason || processing}
                  className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-red-600 transition-all disabled:opacity-40"
                >
                  Confirm Cancellation
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dispute Modal */}
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