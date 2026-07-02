import React, { useState, useEffect } from 'react';
import { DollarSign, Loader2, CheckCircle, Eye, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface EscrowDeal {
  id: string;
  amount: number;
  platform_fee: number;
  agent_commission_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
  properties: { title: string; address?: string };
  tenant?: { full_name: string; email: string };
  landlord?: { full_name: string };
  agent?: { full_name: string };
}

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

  const handleRelease = async (dealId: string) => {
    setReleasing(dealId);
    try {
      const { error } = await supabase.functions.invoke('release-funds', {
        body: { dealId },
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
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading escrow queue...</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <CheckCircle className="w-10 h-10 text-[#1a6b3c]" />
        <p className="text-[15px] font-bold text-white">No pending fund releases</p>
        <p className="text-[12px] text-white/30">All confirmed move-ins have been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" style={font}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[16px] font-black text-white">Pending Fund Releases</h3>
          <p className="text-[12px] text-white/30 mt-0.5">{deals.length} deal{deals.length !== 1 ? 's' : ''} awaiting release</p>
        </div>
        <span className="text-[11px] font-bold text-[#f0c040] bg-[#f0c040]/10 border border-[#f0c040]/20 px-3 py-1.5 rounded-xl">
          {deals.length} Pending
        </span>
      </div>

      {deals.map(deal => {
        const commission = Math.floor(deal.amount * (deal.agent_commission_rate / 100 || 0.10));
        const platformFee = Math.floor(deal.amount * 0.02);
        const payout = deal.amount - commission - platformFee;

        return (
          <div key={deal.id} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 hover:border-white/12 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[#f0c040] bg-[#f0c040]/10 px-2 py-0.5 rounded-lg">
                    MOVE-IN CONFIRMED
                  </span>
                </div>
                <h4 className="text-[14px] font-bold text-white truncate">{deal.properties?.title}</h4>
                <p className="text-[12px] text-white/40 mt-0.5">
                  Tenant: {deal.tenant?.full_name || 'Unknown'} · {deal.tenant?.email}
                </p>
                <p className="text-[12px] text-white/30 mt-0.5">
                  Agent/Landlord: {deal.agent?.full_name || deal.landlord?.full_name || 'Unknown'}
                </p>
                <p className="text-[11px] text-white/20 mt-1">
                  Confirmed {format(new Date(deal.updated_at), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[18px] font-black text-white">{formatNaira(deal.amount)}</p>
                <p className="text-[11px] text-white/30">Payout: {formatNaira(payout)}</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white/3 rounded-xl space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Total Escrowed</span>
                <span className="text-white font-bold">{formatNaira(deal.amount)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Platform Fee (2%)</span>
                <span className="text-red-400">-{formatNaira(platformFee)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Agent Commission ({deal.agent_commission_rate || 10}%)</span>
                <span className="text-red-400">-{formatNaira(commission)}</span>
              </div>
              <div className="flex justify-between text-[12px] pt-1 border-t border-white/6">
                <span className="text-white/60 font-bold">Agent Payout</span>
                <span className="text-[#1a6b3c] font-black">{formatNaira(payout)}</span>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => window.open(`/deals/${deal.id}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[12px] font-bold text-white/60 hover:text-white hover:bg-white/8 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                View Deal
              </button>
              <button
                onClick={() => setSelectedDeal(deal)}
                disabled={releasing === deal.id || released.includes(deal.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a6b3c] rounded-xl text-[12px] font-bold text-white hover:bg-[#0f4a2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {releasing === deal.id ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Releasing...</>
                ) : released.includes(deal.id) ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Released</>
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
          <div className="bg-[#0a1f11] border border-white/10 rounded-2xl p-6 max-w-sm w-full" style={font}>
            <div className="w-12 h-12 bg-[#1a6b3c]/20 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-[#1a6b3c]" />
            </div>
            <h3 className="text-[16px] font-black text-white mb-2">Release Funds?</h3>
            <p className="text-[13px] text-white/50 mb-1">You are about to release funds for:</p>
            <p className="text-[14px] font-bold text-white mb-1">{selectedDeal.properties?.title}</p>
            <p className="text-[13px] text-white/40 mb-4">Tenant: {selectedDeal.tenant?.full_name}</p>
            <div className="p-3 bg-white/3 rounded-xl mb-5 space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Amount to Release</span>
                <span className="text-white font-bold">
                  {formatNaira(selectedDeal.amount - Math.floor(selectedDeal.amount * 0.02) - Math.floor(selectedDeal.amount * (selectedDeal.agent_commission_rate / 100 || 0.10)))}
                </span>
              </div>
              <p className="text-[11px] text-[#f0c040]/70">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDeal(null)}
                className="flex-1 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-white/50 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRelease(selectedDeal.id)}
                disabled={!!releasing}
                className="flex-1 py-2.5 bg-[#1a6b3c] rounded-xl text-[13px] font-bold text-white hover:bg-[#0f4a2a] transition-all disabled:opacity-40"
              >
                {releasing ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}