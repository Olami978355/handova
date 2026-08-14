import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2, CheckCircle, Eye, ArrowRight } from 'lucide-react';
import { supabase, requireValidSession  } from '../../lib/supabase';
import { format } from 'date-fns';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface EscrowDeal {
  id: string;
  amount: number;
  platform_fee: number;
  agent_commission_rate: number;
  status: string;
  transfer_status?: string;
  created_at: string;
  updated_at: string;
  properties: { title: string; address?: string };
  tenant?: { full_name: string; email: string };
  landlord?: { full_name: string };
  agent?: { full_name: string };
}

const computeEscrowBreakdown = (deal: EscrowDeal) => {
  const platformFee = deal.platform_fee ?? Math.floor(deal.amount * 0.02);
  const commission = Math.floor(deal.amount * ((deal.agent_commission_rate ?? 10) / 100));
  const payout = deal.amount - platformFee - commission;
  return { platformFee, commission, payout };
};

export default function EscrowQueue() {
  const [deals, setDeals] = useState<EscrowDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<EscrowDeal | null>(null);
  const [released, setReleased] = useState<string[]>([]);

  useEffect(() => { fetchDeals(); }, []);

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          properties(*),
          tenant:profiles!tenant_id(full_name, email),
          landlord:profiles!landlord_id(full_name),
          agent:profiles!agent_id(full_name)
        `)
        .eq('status', 'move_in_confirmed')
        .order('updated_at', { ascending: true });
      if (error) throw error;
      setDeals(data || []);
    } catch (err) {
      console.error('Error fetching escrow deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (dealId: string, confirmFirstPayout: boolean = false) => {
    setReleasing(dealId);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke('release-funds', {
        body: { dealId, confirmFirstPayout },
      });
      if (error) throw new Error(error.message);
      setReleased(prev => [...prev, dealId]);
      setSelectedDeal(null);
      await fetchDeals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to release funds';
      alert(msg);
    } finally {
      setReleasing(null);
    }
  };

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-paper/30">Loading escrow queue...</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <CheckCircle className="w-10 h-10 text-gold" />
        <p className="text-[15px] font-bold text-paper">No pending fund releases</p>
        <p className="text-[12px] text-paper/30">All confirmed move-ins have been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={font}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[16px] font-black text-paper">Pending Fund Releases</h3>
          <p className="text-[12px] text-paper/30 mt-0.5">{deals.length} deal{deals.length !== 1 ? 's' : ''} awaiting release</p>
        </div>
        <span className="text-[11px] font-bold text-gold bg-gold/10 border border-gold/20 px-3 py-1.5 rounded-xl">
          {deals.length} Pending
        </span>
      </div>

      {deals.map(deal => {
        const { platformFee, commission, payout } = computeEscrowBreakdown(deal);

        return (
          <div key={deal.id} className="bg-slate/20 border border-white/6 rounded-2xl p-5 hover:border-white/12 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-lg">
                    MOVE-IN CONFIRMED
                  </span>
                  {deal.transfer_status === 'first_payout_review' && (
                    <span className="text-[11px] font-bold text-paper/50 bg-white/6 px-2 py-0.5 rounded-lg">
                      FIRST PAYOUT · HELD FOR REVIEW
                    </span>
                  )}
                </div>
                <h4 className="text-[14px] font-bold text-paper truncate">{deal.properties?.title}</h4>
                <p className="text-[12px] text-paper/40 mt-0.5">
                  Tenant: {deal.tenant?.full_name || 'Unknown'} · {deal.tenant?.email}
                </p>
                <p className="text-[12px] text-paper/30 mt-0.5">
                  Agent/Landlord: {deal.agent?.full_name || deal.landlord?.full_name || 'Unknown'}
                </p>
                <p className="text-[11px] text-white/20 mt-1">
                  Confirmed {format(new Date(deal.updated_at), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[18px] font-black text-paper"><span className="tabular-nums">{formatNaira(deal.amount)}</span></p>
                <p className="text-[11px] text-paper/30">Payout: <span className="tabular-nums">{formatNaira(payout)}</span></p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white/3 rounded-xl space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-paper/40">Total Escrowed</span>
                <span className="text-paper font-bold"><span className="tabular-nums">{formatNaira(deal.amount)}</span></span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-paper/40">Platform Fee (2%)</span>
                <span className="text-danger">-<span className="tabular-nums">{formatNaira(platformFee)}</span></span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-paper/40">Agent Commission ({deal.agent_commission_rate ?? 0}%)</span>
                <span className="text-danger">-<span className="tabular-nums">{formatNaira(commission)}</span></span>
              </div>
              <div className="flex justify-between text-[12px] pt-1 border-t border-white/6">
                <span className="text-paper/60 font-bold">Agent Payout</span>
                <span className="text-gold font-black"><span className="tabular-nums">{formatNaira(payout)}</span></span>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => window.open(`/deals/${deal.id}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[12px] font-bold text-paper/60 hover:text-paper hover:bg-white/8 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                View Deal
              </button>
              <button
                onClick={() => setSelectedDeal(deal)}
                disabled={releasing === deal.id || released.includes(deal.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold rounded-xl text-[12px] font-bold text-paper hover:bg-gold-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {releasing === deal.id ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Releasing...</>
                ) : released.includes(deal.id) ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Released</>
                ) : deal.transfer_status === 'first_payout_review' ? (
                  <><DollarSign className="w-3.5 h-3.5" /> Approve First Payout <ArrowRight className="w-3.5 h-3.5" /></>
                ) : (
                  <><DollarSign className="w-3.5 h-3.5" /> Release Funds <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </div>
        );
      })}

      {selectedDeal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate/20 border border-white/10 rounded-2xl p-6 max-w-sm w-full" style={font}>
            <div className="w-12 h-12 bg-gold/15 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-gold" />
            </div>
            <h3 className="text-[16px] font-black text-paper mb-2">
              {selectedDeal.transfer_status === 'first_payout_review' ? 'Approve First Payout?' : 'Release Funds?'}
            </h3>
            <p className="text-[13px] text-paper/50 mb-1">
              {selectedDeal.transfer_status === 'first_payout_review'
                ? "This is the recipient's first payout on Handova. It was automatically held for review. Approving sends the transfer now."
                : 'You are about to release funds for:'}
            </p>
            <p className="text-[14px] font-bold text-paper mb-1">{selectedDeal.properties?.title}</p>
            <p className="text-[13px] text-paper/40 mb-4">Tenant: {selectedDeal.tenant?.full_name}</p>
            <div className="p-3 bg-white/3 rounded-xl mb-5 space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-paper/40">Amount to Release</span>
                <span className="text-paper font-bold">
                  {formatNaira(computeEscrowBreakdown(selectedDeal).payout)}
                </span>
              </div>
              <p className="text-[11px] text-gold/70">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDeal(null)}
                className="flex-1 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-paper/50 hover:text-paper transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRelease(selectedDeal.id, selectedDeal.transfer_status === 'first_payout_review')}
                disabled={!!releasing}
                className="flex-1 py-2.5 bg-gold rounded-xl text-[13px] font-bold text-paper hover:bg-gold-dark transition-all disabled:opacity-40"
              >
                {releasing ? 'Releasing...' : selectedDeal.transfer_status === 'first_payout_review' ? 'Approve First Payout' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}