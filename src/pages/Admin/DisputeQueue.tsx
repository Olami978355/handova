import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle, XCircle, Loader2,
  Eye, Info, ArrowRight
} from 'lucide-react';
import { supabase, requireValidSession  } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { InspectionBooking } from '../../types';
import { format } from 'date-fns';
import { formatFee } from '../../utils/inspectionFee';
import { formatNaira } from '../../utils/format';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function DisputeQueue() {
  const [disputes, setDisputes] = useState<InspectionBooking[]>([]);
  const [dealDisputes, setDealDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<InspectionBooking | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [refundTenant, setRefundTenant] = useState(true);
  const [atFaultPartyId, setAtFaultPartyId] = useState<'landlord' | 'agent' | null>('landlord');
  const [resolvingDealId, setResolvingDealId] = useState<string | null>(null);
  const [dealResolutionNote, setDealResolutionNote] = useState('');
  const [dealResolving, setDealResolving] = useState<{ id: string; outcome: 'release' | 'refund' } | null>(null);

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

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionText) return;
    setResolving(selectedDispute.id);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke('resolve-inspection-dispute', {
        body: { bookingId: selectedDispute.id, resolution: resolutionText, refundTenant, atFaultPartyId },
      });
      if (error) throw error;
      setSelectedDispute(null);
      setResolutionText('');
      setRefundTenant(true);
      setAtFaultPartyId('landlord');
      await fetchDisputes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve dispute';
      alert(msg);
    } finally {
      setResolving(null);
    }
  };

  const handleResolveDeal = async (dealId: string, outcome: 'release' | 'refund') => {
    if (!dealResolutionNote.trim()) return;
    setDealResolving({ id: dealId, outcome });
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke('resolve-deal-dispute', {
        body: { dealId, outcome, note: dealResolutionNote },
      });
      if (error) throw error;
      setResolvingDealId(null);
      setDealResolutionNote('');
      await fetchDisputes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve dispute';
      alert(msg);
    } finally {
      setDealResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-paper/30">Loading dispute queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={font}>
      {/* Deal disputes: full escrow transactions flagged as disputed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[16px] font-bold text-paper">Deal Disputes</h2>
            <p className="text-[12px] text-paper/35">Escrow transactions flagged for review</p>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
            dealDisputes.length > 0
              ? 'bg-danger/10 text-danger border-danger/20'
              : 'bg-gold/10 text-gold border-gold/20'
          }`}>
            {dealDisputes.length} Disputed
          </span>
        </div>
        {dealDisputes.length === 0 ? (
          <div className="bg-slate/20 border border-white/6 rounded-2xl p-6 text-center">
            <p className="text-[12px] text-paper/25">No disputed deals right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dealDisputes.map((d) => (
              <div
                key={d.id}
                className="bg-slate/20 border border-danger/15 rounded-2xl p-5 hover:border-danger/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-[13px] font-bold text-paper">{d.properties?.title}</h4>
                    <p className="text-[11px] text-paper/30">
                      {d.tenant?.full_name} (Tenant) · {d.agent?.full_name || d.landlord?.full_name} ({d.agent_id ? 'Agent' : 'Landlord'})
                    </p>
                  </div>
                  <p className="text-[13px] font-black text-gold tabular-nums">{formatNaira(d.amount)}</p>
                </div>

                {d.dispute_reason && (
                  <p className="text-[12px] text-paper/50 bg-white/4 border border-white/5 rounded-xl p-3 mt-2">
                    {d.dispute_reason}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <Link to={`/deals/${d.id}`} className="text-[11px] text-paper/35 hover:text-paper/60 flex items-center gap-1">
                    View Deal <ArrowRight className="w-3 h-3" />
                  </Link>
                  {resolvingDealId !== d.id && (
                    <button
                      onClick={() => setResolvingDealId(d.id)}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>

                {resolvingDealId === d.id && (
                  <div className="mt-4 pt-4 border-t border-white/6 space-y-3">
                    <textarea
                      value={dealResolutionNote}
                      onChange={(e) => setDealResolutionNote(e.target.value)}
                      placeholder="Resolution note (required, visible to both parties)..."
                      className="w-full h-20 px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[12px] text-paper placeholder-paper/25 outline-none focus:border-gold/50 transition-colors resize-none"
                    />
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleResolveDeal(d.id, 'release')}
                        disabled={!!dealResolving || !dealResolutionNote.trim()}
                        className="flex-1 bg-gold text-ink py-3 rounded-xl font-bold text-[12px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {dealResolving?.id === d.id && dealResolving?.outcome === 'release' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Release Funds
                      </button>
                      <button
                        onClick={() => handleResolveDeal(d.id, 'refund')}
                        disabled={!!dealResolving || !dealResolutionNote.trim()}
                        className="flex-1 bg-danger/15 text-danger border border-danger/20 py-3 rounded-xl font-bold text-[12px] hover:bg-danger/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {dealResolving?.id === d.id && dealResolving?.outcome === 'refund' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Refund Tenant
                      </button>
                    </div>
                    <button
                      onClick={() => { setResolvingDealId(null); setDealResolutionNote(''); }}
                      className="text-[11px] text-paper/25 hover:text-paper/45 w-full text-center"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-paper">Inspection Fee Disputes</h2>
          <p className="text-[12px] text-paper/35">Review and resolve inspection fee disputes</p>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
          disputes.length > 0
            ? 'bg-danger/10 text-danger border-danger/20'
            : 'bg-gold/10 text-gold border-gold/20'
        }`}>
          {disputes.length} Pending
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* List */}
        <div className="xl:col-span-2 space-y-3">
          {disputes.length === 0 ? (
            <div className="bg-slate/20 border border-white/6 rounded-2xl p-12 text-center">
              <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-gold" />
              </div>
              <h3 className="text-[16px] font-bold text-paper mb-2">All Clear!</h3>
              <p className="text-[13px] text-paper/35">No pending disputes to resolve.</p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <button
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute)}
                className={`w-full text-left bg-slate/20 border rounded-2xl p-5 transition-all hover:border-white/12 ${
                  selectedDispute?.id === dispute.id
                    ? 'border-gold/30 bg-gold/4'
                    : 'border-white/6'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-danger/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-danger" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-paper">{dispute.properties?.title}</h4>
                      <p className="text-[11px] text-paper/30">
                        {dispute.updated_at ? format(new Date(dispute.updated_at), 'MMM d, yyyy HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-black text-gold">{formatFee(dispute.inspection_fee)}</p>
                    <p className="text-[10px] text-paper/25 uppercase tracking-wider">Fee</p>
                  </div>
                </div>
                <p className="text-[12px] text-paper/45 line-clamp-2 bg-white/4 border border-white/5 rounded-xl p-3 mb-3">
                  {dispute.dispute_reason}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gold/20 rounded-lg flex items-center justify-center text-[10px] font-bold text-gold">
                      {dispute.profiles?.full_name?.charAt(0) || 'T'}
                    </div>
                    <span className="text-[11px] text-paper/35">{dispute.profiles?.full_name} (Tenant)</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-paper/20" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selectedDispute ? (
            <div className="bg-slate/20 border border-white/6 rounded-2xl p-5 sticky top-20 space-y-5">
              <h3 className="text-[14px] font-bold text-paper">Dispute Details</h3>

              <div>
                <p className="text-[10px] text-paper/30 uppercase tracking-wider mb-2">Reason</p>
                <p className="text-[12px] text-paper/60 leading-relaxed bg-white/4 border border-white/5 rounded-xl p-3">
                  {selectedDispute.dispute_reason}
                </p>
              </div>

              {selectedDispute.dispute_evidence_urls && selectedDispute.dispute_evidence_urls.length > 0 && (
                <div>
                  <p className="text-[10px] text-paper/30 uppercase tracking-wider mb-2">
                    Evidence ({selectedDispute.dispute_evidence_urls.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedDispute.dispute_evidence_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        className="aspect-square bg-white/5 rounded-xl overflow-hidden group relative border border-white/8"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-paper" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] text-paper/30 uppercase tracking-wider mb-2">Resolution Notes</p>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Explain your decision..."
                  className="w-full h-24 px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[12px] text-paper placeholder-paper/25 outline-none focus:border-gold/50 transition-colors resize-none"
                />
              </div>

              <div className="space-y-2.5">
              <div className="space-y-2">
                <p className="text-[10px] text-paper/30 uppercase tracking-wider">Refund Tenant?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRefundTenant(true)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors ${
                      refundTenant ? 'bg-gold/15 border-gold/30 text-gold' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'
                    }`}
                  >
                    Yes, refund 100%
                  </button>
                  <button
                    onClick={() => setRefundTenant(false)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors ${
                      !refundTenant ? 'bg-danger/15 border-danger/30 text-danger' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'
                    }`}
                  >
                    No refund
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-paper/30 uppercase tracking-wider">Who is at fault?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAtFaultPartyId('landlord')}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors ${
                      atFaultPartyId === 'landlord' ? 'bg-danger/15 border-danger/30 text-danger' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'
                    }`}
                  >
                    Landlord
                  </button>
                  {selectedDispute.agent_id && (
                    <button
                      onClick={() => setAtFaultPartyId('agent')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors ${
                        atFaultPartyId === 'agent' ? 'bg-danger/15 border-danger/30 text-danger' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'
                      }`}
                    >
                      Agent
                    </button>
                  )}
                  <button
                    onClick={() => setAtFaultPartyId(null)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-[12px] border transition-colors ${
                      atFaultPartyId === null ? 'bg-white/10 border-white/20 text-paper' : 'bg-white/5 border-white/8 text-paper/50 hover:text-paper'
                    }`}
                  >
                    No fault
                  </button>
                </div>
                {atFaultPartyId && (
                  <p className="text-[11px] text-paper/30">A strike will be issued to the {atFaultPartyId}.</p>
                )}
              </div>
              <button
                onClick={handleResolve}
                disabled={!!resolving || !resolutionText}
                className="w-full bg-gold text-ink py-3.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Resolution
              </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate/20 border border-white/6 border-dashed rounded-2xl p-12 text-center">
              <Info className="w-8 h-8 text-paper/15 mx-auto mb-3" />
              <p className="text-[12px] text-paper/25">Select a dispute to review details and evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}