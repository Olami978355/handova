import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle2, 
  Clock, 
  FileText, 
  CreditCard, 
  Home, 
  AlertTriangle, 
  Loader2, 
  ArrowLeft, 
  Download, 
  Signature, 
  Key,
  History,
  User,
  ExternalLink,
  MessageSquare,
  Mail
} from 'lucide-react';
import { useDeal } from '../hooks/useDeal';
import { formatNaira } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { PaystackButton } from '../components/payment/PaystackButton';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    deal, 
    logs, 
    loading, 
    error, 
    uploadAgreement, 
    signAgreement, 
    confirmMoveIn, 
    releaseFunds, 
    markDisputed,
    isTenant,
    isLandlord,
    isAgent,
    isAdmin,
    isModerator
  } = useDeal(id || '');

  const [processing, setProcessing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading deal details...</p>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Deal Not Found</h1>
        <p className="text-zinc-500 mb-8 max-w-md">{error || "This deal doesn't exist or you don't have permission to view it."}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleAction = async (action: () => Promise<any>) => {
    setProcessing(true);
    const result = await action();
    setProcessing(false);
    if (!result.success) {
      alert(result.error || 'Action failed');
    }
  };

  const statusSteps = [
    { id: 'pending_payment', label: 'Payment', icon: CreditCard },
    { id: 'agreement_sent', label: 'Agreement Uploaded', icon: FileText },
    { id: 'agreement_signed', label: 'Agreement Signed by Both Parties', icon: Signature },
    { id: 'move_in_confirmed', label: 'Move In', icon: Key },
    { id: 'funds_released', label: 'Completed', icon: CheckCircle2 },
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.id === deal.status);

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-[#1a6b3c] pt-12 pb-32 px-4">
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-white/70 hover:text-white mb-8 transition-colors font-bold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mr-6 border border-white/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Escrow Transaction</h1>
                <p className="text-white/70 font-medium">ID: {deal.id.slice(0, 8)}...{deal.id.slice(-8)}</p>
              </div>
            </div>
            
            <div className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest ${
              deal.status === 'funds_released' ? 'bg-emerald-500 text-white' :
              deal.status === 'disputed' ? 'bg-red-500 text-white' :
              'bg-[#f0c040] text-zinc-900'
            }`}>
              {deal.status.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-20 space-y-8">
        {/* Status Stepper */}
        <div className="bg-white rounded-[40px] shadow-xl border border-zinc-100 p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative">
            {/* Progress Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-zinc-100 -translate-y-1/2 z-0" />
            
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex || deal.status === 'funds_released';
              const isCurrent = index === currentStepIndex && deal.status !== 'funds_released';
              const Icon = step.icon;

              return (
                <div key={step.id} className="relative z-10 flex flex-row md:flex-col items-center gap-4 md:gap-2">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isCompleted ? 'bg-[#1a6b3c] text-white shadow-lg shadow-[#1a6b3c]/20' :
                    isCurrent ? 'bg-[#f0c040] text-zinc-900 shadow-lg shadow-[#f0c040]/20 scale-110' :
                    'bg-zinc-100 text-zinc-400'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-left md:text-center">
                    <p className={`text-xs font-black uppercase tracking-widest ${
                      isCompleted ? 'text-[#1a6b3c]' :
                      isCurrent ? 'text-zinc-900' :
                      'text-zinc-400'
                    }`}>{step.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Summary */}
            <div className="bg-white rounded-[40px] shadow-xl border border-zinc-100 overflow-hidden">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#1a6b3c]/10 rounded-2xl flex items-center justify-center">
                    <Home className="w-6 h-6 text-[#1a6b3c]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900">Property Details</h3>
                    <p className="text-zinc-500 font-medium text-sm">Listing Information</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/property/${deal.property_id}`)}
                  className="p-3 hover:bg-zinc-50 rounded-2xl transition-colors text-zinc-400 hover:text-[#1a6b3c]"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100">
                    <img src={deal.properties?.images[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-zinc-900 mb-1">{deal.properties?.title}</h4>
                    <p className="text-sm text-zinc-500 mb-4">{deal.properties?.address}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Amount</p>
                        <p className="text-sm font-black text-[#1a6b3c]">{formatNaira(deal.amount)}</p>
                      </div>
                      <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Type</p>
                        <p className="text-sm font-black text-zinc-700 capitalize">{deal.properties?.listing_type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="bg-white rounded-[40px] shadow-xl border border-zinc-100 p-8 md:p-12">
              <h3 className="text-xl font-bold text-zinc-900 mb-8">Required Actions</h3>
              
              <div className="space-y-6">
                {/* 1. Payment Action (Tenant) */}
                {deal.status === 'pending_payment' && isTenant && (
                  <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8">
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                        <CreditCard className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-amber-900 mb-2">Initialize Payment</h4>
                        <p className="text-amber-700 text-sm mb-6 font-medium">
                          Secure your property by paying into our escrow account. Funds will be held safely until you move in.
                        </p>
                        
                        {deal.inspection_fee_credit && deal.inspection_fee_credit > 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
                            <div className="flex items-center text-emerald-800 font-bold text-sm">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Inspection Fee Credit Applied
                            </div>
                            <span className="text-xs font-black text-emerald-600">-{formatNaira(deal.inspection_fee_credit)}</span>
                          </div>
                        )}

                        <PaystackButton 
                          amount={deal.amount - (deal.inspection_fee_credit || 0)}
                          email={user?.email || ''}
                          reference={`ESCROW_${deal.id}_${Date.now()}`}
                          label="Pay Now"
                          className="w-full"
                          onSuccess={async (reference) => {
                            setProcessing(true);
                            try {
                              const { error } = await supabase.functions.invoke('process-payment-webhook', {
                                body: { 
                                  event: 'charge.success',
                                  data: {
                                    reference,
                                    metadata: {
                                      deal_id: deal.id,
                                      type: 'escrow_payment'
                                    }
                                  }
                                }
                              });
                              if (error) throw error;
                              // Refresh will be handled by realtime subscription in useDeal
                            } catch (err: any) {
                              console.error('Payment processing error:', err);
                              alert('Payment successful but processing failed. Please contact support with reference: ' + reference);
                            } finally {
                              setProcessing(false);
                            }
                          }}
                          onClose={() => {
                            console.log('Payment closed');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Upload Agreement (Landlord/Agent) */}
                {deal.status === 'payment_received' && (isLandlord || isAgent) && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8">
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-emerald-900 mb-2">Upload Tenancy Agreement</h4>
                        <p className="text-emerald-700 text-sm mb-6 font-medium">
                          Payment has been received. Please upload the tenancy agreement (PDF, max 20MB) for the tenant to review and sign.
                        </p>
                        
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                alert('Please upload a PDF file');
                                return;
                              }
                              if (file.size > 20 * 1024 * 1024) {
                                alert('File size exceeds 20MB limit');
                                return;
                              }
                              
                              setProcessing(true);
                              setUploadProgress(30); // Mock progress
                              const result = await uploadAgreement(file);
                              setUploadProgress(100);
                              setProcessing(false);
                              
                              if (!result.success) {
                                alert(result.error || 'Upload failed');
                                setUploadProgress(0);
                              }
                            }
                          }}
                        />

                        {processing && uploadProgress > 0 && (
                          <div className="w-full bg-emerald-200 h-2 rounded-full mb-6 overflow-hidden">
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
                          className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#14522e] transition-all flex items-center justify-center"
                        >
                          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Select & Upload PDF'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Sign Agreement (Tenant/Landlord) */}
                {deal.status === 'agreement_sent' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8">
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                        <Signature className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-blue-900 mb-2">Sign Tenancy Agreement</h4>
                        <p className="text-blue-700 text-sm mb-6 font-medium">
                          Please review the uploaded agreement and sign to proceed.
                        </p>
                        
                        <div className="bg-white/50 border border-blue-200 rounded-2xl p-6 mb-6">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center mt-1">
                              <input 
                                type="checkbox" 
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-blue-300 transition-all checked:bg-blue-600 checked:border-blue-600"
                              />
                              <CheckCircle2 className="absolute h-5 w-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none p-0.5" />
                            </div>
                            <span className="text-sm font-bold text-blue-900 select-none">
                              I have read and agree to this tenancy agreement
                            </span>
                          </label>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                          <a 
                            href={deal.agreement_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 bg-white text-blue-600 border border-blue-200 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-100 transition-all flex items-center justify-center"
                          >
                            <Download className="w-5 h-5 mr-2" /> View Agreement
                          </a>
                          {((isTenant && !deal.tenant_signed_at) || (isLandlord && !deal.landlord_signed_at)) && (
                            <button 
                              onClick={() => handleAction(signAgreement)}
                              disabled={processing || !agreedToTerms}
                              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Agreement'}
                            </button>
                          )}
                        </div>
                        {((isTenant && deal.tenant_signed_at) || (isLandlord && deal.landlord_signed_at)) && (
                          <p className="mt-4 text-center text-xs font-black text-blue-600 uppercase tracking-widest">
                            You have signed this agreement
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Confirm Move In (Tenant) */}
                {deal.status === 'agreement_signed' && isTenant && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8">
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                        <Key className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-emerald-900 mb-2">Confirm Move-in</h4>
                        <p className="text-emerald-700 text-sm mb-6 font-medium">
                          Have you successfully moved into the property? Confirming this will release the funds to the landlord.
                        </p>
                        <button 
                          onClick={() => handleAction(confirmMoveIn)}
                          disabled={processing}
                          className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#14522e] transition-all flex items-center justify-center"
                        >
                          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Move-in'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Release Funds (Admin/Moderator) */}
                {deal.status === 'move_in_confirmed' && (isAdmin || isModerator) && (
                  <div className="bg-zinc-900 rounded-3xl p-8 text-white">
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <Shield className="w-6 h-6 text-[#f0c040]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold mb-2">Admin: Release Funds</h4>
                        <p className="text-white/60 text-sm mb-6 font-medium">
                          Move-in has been confirmed by the tenant. Verify all documents and release the funds to complete the transaction.
                        </p>
                        <button 
                          onClick={() => handleAction(releaseFunds)}
                          disabled={processing}
                          className="w-full bg-[#f0c040] text-zinc-900 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#e0b030] transition-all flex items-center justify-center"
                        >
                          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Release Funds to Landlord'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Actions Available */}
                {deal.status === 'funds_released' && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-12 text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h4 className="text-2xl font-black text-emerald-900 mb-2">Transaction Completed</h4>
                    <p className="text-emerald-700 font-medium max-w-md mx-auto">
                      All funds have been released and the tenancy agreement is finalized. Thank you for using Rent Easy!
                    </p>
                  </div>
                )}

                {deal.status === 'disputed' && (
                  <div className="bg-red-50 border border-red-100 rounded-3xl p-12 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle className="w-10 h-10 text-red-600" />
                    </div>
                    <h4 className="text-2xl font-black text-red-900 mb-2">Under Dispute</h4>
                    <p className="text-red-700 font-medium max-w-md mx-auto">
                      This transaction has been flagged for dispute. Our moderation team is currently reviewing the case.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Parties */}
            <div className="bg-white rounded-[40px] shadow-xl border border-zinc-100 p-8">
              <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-[#1a6b3c]" /> Parties Involved
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">T</div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tenant</p>
                    <p className="text-sm font-bold text-zinc-700">{deal.profiles?.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">L</div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Landlord</p>
                    <p className="text-sm font-bold text-zinc-700">ID: {deal.landlord_id.slice(0, 8)}...</p>
                  </div>
                </div>
                {deal.agent_id && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400">A</div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agent</p>
                      <p className="text-sm font-bold text-zinc-700">ID: {deal.agent_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline/Logs */}
            <div className="bg-white rounded-[40px] shadow-xl border border-zinc-100 p-8">
              <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center">
                <History className="w-5 h-5 mr-2 text-[#1a6b3c]" /> Activity Log
              </h3>
              <div className="space-y-6">
                {logs.map((log, index) => (
                  <div key={log.id} className="relative flex gap-4">
                    {index !== logs.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-px bg-zinc-100" />
                    )}
                    <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 z-10">
                      <Clock className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Actions */}
            {isAdmin && deal.status !== 'disputed' && deal.status !== 'funds_released' && (
              <div className="bg-red-50 rounded-[40px] border border-red-100 p-8">
                <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" /> Danger Zone
                </h3>
                <button 
                  onClick={() => setShowDisputeModal(true)}
                  className="w-full bg-red-600 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all"
                >
                  Mark as Disputed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      <AnimatePresence>
        {showDisputeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDisputeModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 md:p-12"
            >
              <h3 className="text-2xl font-black text-zinc-900 mb-4">Flag Transaction</h3>
              <p className="text-zinc-500 font-medium mb-8">
                Please provide a reason for marking this transaction as disputed. This will freeze all funds.
              </p>
              
              <textarea 
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Reason for dispute..."
                className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 text-sm mb-8 resize-none"
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-zinc-400 hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleAction(() => markDisputed(disputeReason));
                    setShowDisputeModal(false);
                  }}
                  disabled={!disputeReason || processing}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  Confirm Dispute
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
