import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle, XCircle, Loader2,
  Eye, Info, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { InspectionBooking } from '../../types';
import { format } from 'date-fns';
import { formatFee } from '../../utils/inspectionFee';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function DisputeQueue() {
  const [disputes, setDisputes] = useState<InspectionBooking[]>([]);
  const [dealDisputes, setDealDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<InspectionBooking | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => { fetchDisputes(); }, []);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .select('*, properties(*), profiles!tenant_id(*)')
        .eq('status', 'dispute_raised')
        .order('updated_at', { ascending: true });
      if (error) throw error;
      setDisputes(data || []);

      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*, properties(*), tenant:profiles!tenant_id(full_name), landlord:profiles!landlord_id(full_name), agent:profiles!agent_id(full_name)')
        .eq('status', 'disputed')
        .order('updated_at', { ascending: true });
      if (dealError) throw dealError;
      setDealDisputes(dealData || []);
    } catch (err) {
      console.error('Error fetching disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (landlordAtFault: boolean) => {
    if (!selectedDispute || !resolutionText) return;
    setResolving(selectedDispute.id);
    try {
      const { error } = await supabase.functions.invoke('resolve-inspection-dispute', {
        body: { bookingId: selectedDispute.id, resolution: resolutionText, landlordAtFault },
      });
      if (error) throw error;
      setSelectedDispute(null);
      setResolutionText('');
      await fetchDisputes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve dispute';
      alert(msg);
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading dispute queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={font}>
      {/* Deal disputes — full escrow transactions flagged as disputed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[16px] font-bold text-white">Deal Disputes</h2>
            <p className="text-[12px] text-white/35">Escrow transactions flagged for review</p>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
            dealDisputes.length > 0
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-[#1a6b3c]/10 text-[#1a6b3c] border-[#1a6b3c]/20'
          }`}>
            {dealDisputes.length} Disputed
          </span>
        </div>
        {dealDisputes.length === 0 ? (
          <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 text-center">
            <p className="text-[12px] text-white/25">No disputed deals right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dealDisputes.map((d) => (
              <Link
                key={d.id}
                to={`/deals/${d.id}`}
                className="block bg-[#0a1f11] border border-red-500/15 rounded-2xl p-5 hover:border-red-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-[13px] font-bold text-white">{d.properties?.title}</h4>
                    <p className="text-[11px] text-white/30">
                      {d.tenant?.full_name} (Tenant) · {d.agent?.full_name || d.landlord?.full_name} ({d.agent_id ? 'Agent' : 'Landlord'})
                    </p>
                  </div>
                  <p className="text-[13px] font-black text-[#f0c040]">₦{Number(d.amount).toLocaleString()}</p>
                </div>
                {d.dispute_reason && (
                  <p className="text-[12px] text-white/50 bg-white/4 border border-white/5 rounded-xl p-3 mt-2">
                    {d.dispute_reason}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white">Dispute Queue</h2>
          <p className="text-[12px] text-white/35">Review and resolve inspection fee disputes</p>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
          disputes.length > 0
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-[#1a6b3c]/10 text-[#1a6b3c] border-[#1a6b3c]/20'
        }`}>
          {disputes.length} Pending
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* List */}
        <div className="xl:col-span-2 space-y-3">
          {disputes.length === 0 ? (
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-12 text-center">
              <div className="w-14 h-14 bg-[#1a6b3c]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-[#1a6b3c]" />
              </div>
              <h3 className="text-[16px] font-bold text-white mb-2">All Clear!</h3>
              <p className="text-[13px] text-white/35">No pending disputes to resolve.</p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <button
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute)}
                className={`w-full text-left bg-[#0a1f11] border rounded-2xl p-5 transition-all hover:border-white/12 ${
                  selectedDispute?.id === dispute.id
                    ? 'border-[#f0c040]/30 bg-[#f0c040]/4'
                    : 'border-white/6'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white">{dispute.properties?.title}</h4>
                      <p className="text-[11px] text-white/30">
                        {dispute.updated_at ? format(new Date(dispute.updated_at), 'MMM d, yyyy HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-black text-[#f0c040]">{formatFee(dispute.inspection_fee)}</p>
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">Fee</p>
                  </div>
                </div>
                <p className="text-[12px] text-white/45 line-clamp-2 bg-white/4 border border-white/5 rounded-xl p-3 mb-3">
                  {dispute.dispute_reason}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a6b3c]/20 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#1a6b3c]">
                      {dispute.profiles?.full_name?.charAt(0) || 'T'}
                    </div>
                    <span className="text-[11px] text-white/35">{dispute.profiles?.full_name} (Tenant)</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selectedDispute ? (
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 sticky top-20 space-y-5">
              <h3 className="text-[14px] font-bold text-white">Dispute Details</h3>

              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Reason</p>
                <p className="text-[12px] text-white/60 leading-relaxed bg-white/4 border border-white/5 rounded-xl p-3">
                  {selectedDispute.dispute_reason}
                </p>
              </div>

              {selectedDispute.dispute_evidence_urls && selectedDispute.dispute_evidence_urls.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
                    Evidence ({selectedDispute.dispute_evidence_urls.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedDispute.dispute_evidence_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        className="aspect-square bg-white/5 rounded-xl overflow-hidden group relative border border-white/8"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Resolution Notes</p>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Explain your decision..."
                  className="w-full h-24 px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[12px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/50 transition-colors resize-none"
                />
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleResolve(true)}
                  disabled={!!resolving || !resolutionText}
                  className="w-full bg-[#1a6b3c] text-white py-3.5 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Landlord at Fault — Refund Tenant
                </button>
                <button
                  onClick={() => handleResolve(false)}
                  disabled={!!resolving || !resolutionText}
                  className="w-full bg-red-500/15 text-red-400 border border-red-500/20 py-3.5 rounded-xl font-bold text-[13px] hover:bg-red-500/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Tenant at Fault — Reject Dispute
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0a1f11] border border-white/6 border-dashed rounded-2xl p-12 text-center">
              <Info className="w-8 h-8 text-white/15 mx-auto mb-3" />
              <p className="text-[12px] text-white/25">Select a dispute to review details and evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}