import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Shield, User, Home, 
  CheckCircle, XCircle, Loader2, Eye,
  ExternalLink, MessageSquare, ArrowRight, Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InspectionBooking } from '../../types';
import { format } from 'date-fns';
import { formatFee } from '../../utils/inspectionFee';

export default function DisputeQueue() {
  const [disputes, setDisputes] = useState<InspectionBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<InspectionBooking | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .select('*, properties(*), profiles!tenant_id(*)')
        .eq('status', 'dispute_raised')
        .order('updated_at', { ascending: true });

      if (error) throw error;
      setDisputes(data || []);
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
        body: { 
          bookingId: selectedDispute.id, 
          resolution: resolutionText, 
          landlordAtFault 
        }
      });

      if (error) throw error;
      
      setSelectedDispute(null);
      setResolutionText('');
      await fetchDisputes();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve dispute');
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading dispute queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">Dispute Queue</h2>
          <p className="text-zinc-500 text-sm">Review and resolve inspection fee disputes.</p>
        </div>
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider border border-red-100">
          {disputes.length} Pending Disputes
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          {disputes.length === 0 ? (
            <div className="bg-white rounded-[40px] p-12 text-center border border-zinc-100 shadow-sm">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-900">All Clear!</h3>
              <p className="text-zinc-500">There are no pending disputes to resolve.</p>
            </div>
          ) : (
            disputes.map(dispute => (
              <button 
                key={dispute.id}
                onClick={() => setSelectedDispute(dispute)}
                className={`w-full text-left bg-white rounded-3xl p-6 border transition-all hover:shadow-md ${
                  selectedDispute?.id === dispute.id ? 'border-[#1a6b3c] ring-4 ring-[#1a6b3c]/5' : 'border-zinc-100'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">{dispute.properties?.title}</h4>
                      <p className="text-xs text-zinc-400">Raised {format(new Date(dispute.updated_at!), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-zinc-900">{formatFee(dispute.inspection_fee)}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Fee Amount</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 line-clamp-2 mb-4 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  {dispute.dispute_reason}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                      {dispute.profiles?.full_name.charAt(0)}
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">{dispute.profiles?.full_name} (Tenant)</span>
                  </div>
                  <ArrowRight size={16} className="text-zinc-300" />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="space-y-6">
          {selectedDispute ? (
            <div className="bg-white rounded-[40px] p-8 border border-zinc-100 shadow-xl sticky top-24">
              <h3 className="text-xl font-bold text-zinc-900 mb-6">Dispute Details</h3>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Reason & Description</label>
                  <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    {selectedDispute.dispute_reason}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Evidence ({selectedDispute.dispute_evidence_urls?.length || 0})</label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedDispute.dispute_evidence_urls?.map((url, i) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="aspect-square bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 group relative"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="text-white" size={20} />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-2">Resolution Notes</label>
                  <textarea 
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Explain the reason for your decision..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c] resize-none"
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => handleResolve(true)}
                  disabled={resolving === selectedDispute.id || !resolutionText}
                  className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold hover:bg-[#14522e] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1a6b3c]/20 disabled:opacity-50"
                >
                  {resolving === selectedDispute.id ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                  Landlord at Fault (Refund Tenant)
                </button>
                <button 
                  onClick={() => handleResolve(false)}
                  disabled={resolving === selectedDispute.id || !resolutionText}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {resolving === selectedDispute.id ? <Loader2 size={20} className="animate-spin" /> : <XCircle size={20} />}
                  Tenant at Fault (Reject Dispute)
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-50 rounded-[40px] p-12 text-center border border-dashed border-zinc-200">
              <Info size={40} className="text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-400 text-sm font-bold">Select a dispute to review details and evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
