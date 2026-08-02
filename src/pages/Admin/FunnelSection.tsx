import React, { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type RangeOption = '7' | '30' | '90' | 'all';

interface FunnelCounts {
  views: number;
  bookings: number;
  dealsStarted: number;
  dealsCompleted: number;
}

const RANGE_OPTIONS: { key: RangeOption; label: string }[] = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'all', label: 'All time' },
];

export default function FunnelSection() {
  const [range, setRange] = useState<RangeOption>('30');
  const [counts, setCounts] = useState<FunnelCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFunnel = async (selectedRange: RangeOption) => {
    setLoading(true);
    try {
      let cutoffIso: string | null = null;
      if (selectedRange !== 'all') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(selectedRange, 10));
        cutoffIso = cutoff.toISOString();
      }

      const viewsQuery = supabase.from('property_views').select('id', { count: 'exact', head: true });
      const bookingsQuery = supabase.from('inspection_bookings').select('id', { count: 'exact', head: true });
      const dealsQuery = supabase.from('deals').select('id', { count: 'exact', head: true });
      const completedQuery = supabase.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'funds_released');

      if (cutoffIso) {
        viewsQuery.gte('created_at', cutoffIso);
        bookingsQuery.gte('created_at', cutoffIso);
        dealsQuery.gte('created_at', cutoffIso);
        completedQuery.gte('created_at', cutoffIso);
      }

      const [{ count: views }, { count: bookings }, { count: dealsStarted }, { count: dealsCompleted }] =
        await Promise.all([viewsQuery, bookingsQuery, dealsQuery, completedQuery]);

      setCounts({
        views: views || 0,
        bookings: bookings || 0,
        dealsStarted: dealsStarted || 0,
        dealsCompleted: dealsCompleted || 0,
      });
    } catch (err) {
      console.error('Error fetching funnel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFunnel(range); }, [range]);

  const stages = counts
    ? [
        { label: 'Property Views', value: counts.views },
        { label: 'Inspections Booked', value: counts.bookings },
        { label: 'Deals Started', value: counts.dealsStarted },
        { label: 'Deals Completed', value: counts.dealsCompleted },
      ]
    : [];

  const maxValue = stages.length > 0 ? Math.max(stages[0].value, 1) : 1;

  return (
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[13px] font-bold text-white">Conversion Funnel</h3>
          <p className="text-[11px] text-white/30 mt-0.5">Where people drop off, from viewing a listing to completing a deal</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 rounded-xl p-1">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                range === opt.key ? 'bg-[#1a6b3c] text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stages.every(s => s.value === 0) ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Filter className="w-7 h-7 text-white/15 mb-3" />
          <p className="text-[13px] text-white/30">No funnel activity in this period.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {stages.map((stage, i) => {
            const widthPct = (stage.value / maxValue) * 100;
            const prevValue = i > 0 ? stages[i - 1].value : null;
            const stepConversion = prevValue && prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : null;
            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-white/70">{stage.label}</span>
                  <span className="text-[12px] font-bold text-white">
                    {stage.value.toLocaleString()}
                    {stepConversion && (
                      <span className="text-white/30 font-normal ml-1.5">({stepConversion}% of previous)</span>
                    )}
                  </span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a6b3c] rounded-full transition-all"
                    style={{ width: `${Math.max(widthPct, stage.value > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
