import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DealRow {
  id: string;
  status: string;
  deal_type: string;
  amount: number;
  platform_fee: number | null;
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  house_rent: 'House Rent',
  house_sale: 'House Sale',
  land_sale: 'Land Sale',
  land_rent: 'Land Rent',
};

export default function AnalyticsDashboard() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('deals')
        .select('id, status, deal_type, amount, platform_fee');
      if (fetchError) throw fetchError;
      setDeals(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeals(); }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 aspect-square animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-500/8 border border-red-500/15 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-[15px] font-bold text-white mb-2">Error loading analytics</h3>
        <p className="text-[12px] text-white/40 mb-4">{error}</p>
        <button onClick={fetchDeals} className="bg-[#1a6b3c] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const totalDeals = deals.length;
  const completedCount = deals.filter(d => d.status === 'funds_released').length;
  const disputedCount = deals.filter(d => d.status === 'disputed').length;
  const cancelledCount = deals.filter(d => d.status === 'cancelled').length;
  const refundedCount = deals.filter(d => d.status === 'refunded').length;
  const abandonedCount = cancelledCount + refundedCount;
  const inProgressCount = totalDeals - completedCount - disputedCount - abandonedCount;

  const pct = (n: number) => totalDeals > 0 ? ((n / totalDeals) * 100).toFixed(1) : '0.0';

  const revenueByType = Object.keys(DEAL_TYPE_LABELS).map(type => {
    const typeDeals = deals.filter(d => d.deal_type === type && d.status === 'funds_released');
    const revenue = typeDeals.reduce((sum, d) => sum + (d.platform_fee || (d.amount || 0) * 0.02), 0);
    return { type, label: DEAL_TYPE_LABELS[type], revenue, count: typeDeals.length };
  }).sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = Math.max(...revenueByType.map(r => r.revenue), 1);

  const statCards = [
    { label: 'Total Deals', value: totalDeals.toLocaleString(), icon: TrendingUp, color: '#60a5fa' },
    { label: 'Completed Rate', value: `${pct(completedCount)}%`, icon: CheckCircle2, color: '#4ade80' },
    { label: 'Dispute Rate', value: `${pct(disputedCount)}%`, icon: AlertCircle, color: '#f0c040' },
    { label: 'Cancellation Rate', value: `${pct(cancelledCount)}%`, icon: XCircle, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[20px] font-black text-white">Analytics</h3>
          <p className="text-[12px] text-white/30 mt-1">Revenue, disputes, and deal outcomes across the platform</p>
        </div>
        <button
          onClick={fetchDeals}
          className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${stat.color}1a` }}
            >
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-[22px] font-black text-white">{stat.value}</p>
            <p className="text-[11px] text-white/35 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue by deal type */}
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
        <h3 className="text-[13px] font-bold text-white mb-4">Revenue by Transaction Type</h3>
        {revenueByType.every(r => r.revenue === 0) ? (
          <p className="text-[12px] text-white/25 text-center py-6">No completed deals yet.</p>
        ) : (
          <div className="space-y-3">
            {revenueByType.map(r => (
              <div key={r.type}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-white/70">{r.label}</span>
                  <span className="text-[12px] font-bold text-white">
                    ₦{r.revenue.toLocaleString('en-NG')} <span className="text-white/25 font-normal">({r.count})</span>
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a6b3c] rounded-full transition-all"
                    style={{ width: `${(r.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deal outcome breakdown */}
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
        <h3 className="text-[13px] font-bold text-white mb-4">Deal Outcomes</h3>
        {totalDeals === 0 ? (
          <p className="text-[12px] text-white/25 text-center py-6">No deals yet.</p>
        ) : (
          <>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden flex mb-4">
              <div className="h-full bg-[#4ade80]" style={{ width: `${pct(completedCount)}%` }} title="Completed" />
              <div className="h-full bg-[#60a5fa]" style={{ width: `${pct(Math.max(inProgressCount, 0))}%` }} title="In Progress" />
              <div className="h-full bg-[#f0c040]" style={{ width: `${pct(disputedCount)}%` }} title="Disputed" />
              <div className="h-full bg-[#ef4444]" style={{ width: `${pct(abandonedCount)}%` }} title="Cancelled/Refunded" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Completed', value: completedCount, color: '#4ade80' },
                { label: 'In Progress', value: Math.max(inProgressCount, 0), color: '#60a5fa' },
                { label: 'Disputed', value: disputedCount, color: '#f0c040' },
                { label: 'Cancelled/Refunded', value: abandonedCount, color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-[13px] font-bold text-white">{item.value}</p>
                    <p className="text-[10px] text-white/35">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
