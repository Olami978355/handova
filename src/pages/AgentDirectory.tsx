import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Loader2, Star, CheckCircle2, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VerifiedBadge } from '../components/VerifiedBadge';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const PAGE_SIZE = 24;
const MIN_REVIEWS_FOR_TOP = 3;

interface AgentProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string;
  lasrera_id: string | null;
  avgRating: number | null;
  reviewCount: number;
  dealsCompleted: number;
}

type SortOption = 'top_rated' | 'most_deals' | 'recent';

export default function AgentDirectory() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [topAgents, setTopAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('top_rated');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enrichAgents = async (base: { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verification_status: string; lasrera_id: string | null }[]): Promise<AgentProfile[]> => {
    if (base.length === 0) return [];
    const ids = base.map(a => a.id);

    const [{ data: reviews }, { data: completedDeals }] = await Promise.all([
      supabase.from('deal_reviews').select('reviewee_id, rating').in('reviewee_id', ids),
      supabase.from('deals').select('agent_id').in('agent_id', ids).eq('status', 'funds_released'),
    ]);

    const ratingMap: Record<string, number[]> = {};
    (reviews || []).forEach(r => {
      if (!ratingMap[r.reviewee_id]) ratingMap[r.reviewee_id] = [];
      ratingMap[r.reviewee_id].push(r.rating);
    });

    const dealCountMap: Record<string, number> = {};
    (completedDeals || []).forEach(d => {
      if (d.agent_id) dealCountMap[d.agent_id] = (dealCountMap[d.agent_id] || 0) + 1;
    });

    return base.map(a => {
      const ratings = ratingMap[a.id] || [];
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
        : null;
      return {
        ...a,
        avgRating,
        reviewCount: ratings.length,
        dealsCompleted: dealCountMap[a.id] || 0,
      };
    });
  };

  const fetchAgents = useCallback(async (searchTerm: string, onlyVerified: boolean, offset: number) => {
    let query = supabase
      .from('public_profiles')
      .select('id, full_name, username, avatar_url, verification_status, lasrera_id')
      .eq('role', 'agent')
      .not('username', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (onlyVerified) {
      query = query.eq('verification_status', 'verified');
    }
    if (searchTerm.trim()) {
      query = query.or(`full_name.ilike.%${searchTerm.trim()}%,username.ilike.%${searchTerm.trim()}%,lasrera_id.ilike.%${searchTerm.trim()}%`);
    }

    const { data } = await query;
    return await enrichAgents(data || []);
  }, []);

  const fetchTopAgents = useCallback(async () => {
    const { data } = await supabase
      .from('public_profiles')
      .select('id, full_name, username, avatar_url, verification_status, lasrera_id')
      .eq('role', 'agent')
      .not('username', 'is', null)
      .limit(50);

    const enriched = await enrichAgents(data || []);
    const qualified = enriched
      .filter(a => a.reviewCount >= MIN_REVIEWS_FOR_TOP && a.avgRating !== null)
      .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

    setTopAgents(qualified.slice(0, 3));
  }, []);

  useEffect(() => {
    fetchTopAgents();
  }, [fetchTopAgents]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await fetchAgents(search, verifiedOnly, 0);
      setAgents(sortAgents(data, sort));
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, verifiedOnly, sort, fetchAgents]);

  const sortAgents = (list: AgentProfile[], sortBy: SortOption): AgentProfile[] => {
    const copy = [...list];
    if (sortBy === 'top_rated') {
      return copy.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    }
    if (sortBy === 'most_deals') {
      return copy.sort((a, b) => b.dealsCompleted - a.dealsCompleted);
    }
    return copy;
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const more = await fetchAgents(search, verifiedOnly, agents.length);
    setAgents(prev => sortAgents([...prev, ...more], sort));
    setHasMore(more.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const AgentCard = ({ a, featured }: { a: AgentProfile; featured?: boolean }) => (
    <Link
      to={`/u/${a.username}`}
      className={`bg-ink border rounded-2xl p-4 flex items-center gap-3 transition-all ${
        featured ? 'border-gold/30 hover:border-gold/50' : 'border-white/6 hover:border-white/12'
      }`}
    >
      <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center text-gold text-[16px] font-bold flex-shrink-0 overflow-hidden">
        {a.avatar_url ? (
          <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          (a.full_name || 'U').charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-bold text-paper truncate">{a.full_name || 'Handova Agent'}</p>
          <VerifiedBadge status={a.verification_status} size={12} />
        </div>
        <div className="flex items-center gap-2.5 mt-0.5">
          {a.avgRating !== null ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-gold">
              <Star className="w-3 h-3 fill-gold" /> {a.avgRating.toFixed(1)}
              <span className="text-paper/30 font-normal">({a.reviewCount})</span>
            </span>
          ) : (
            <span className="text-[11px] text-paper/25">No reviews yet</span>
          )}
          {a.dealsCompleted > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-paper/40">
              <CheckCircle2 className="w-3 h-3" /> {a.dealsCompleted} deal{a.dealsCompleted !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {a.lasrera_id && (
          <p className="text-[10px] text-paper/25 font-mono mt-0.5 truncate">{a.lasrera_id}</p>
        )}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-ink pb-24" style={font}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-black text-paper mb-1">Find an Agent</h1>
          <p className="text-[13px] text-paper/40">Browse verified agents by rating and track record</p>
        </div>

        {topAgents.length > 0 && !search.trim() && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gold" />
              <h2 className="text-[13px] font-bold text-paper/60 uppercase tracking-wider">Top Agents</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topAgents.map(a => <AgentCard key={a.id} a={a} featured />)}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, or LASRERA ID..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <button
            onClick={() => setVerifiedOnly(v => !v)}
            className={`px-4 py-3 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              verifiedOnly ? 'bg-gold text-paper' : 'bg-white/5 text-paper/40 hover:text-paper/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Only
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {([
            { key: 'top_rated', label: 'Top Rated' },
            { key: 'most_deals', label: 'Most Deals' },
            { key: 'recent', label: 'Newest' },
          ] as { key: SortOption; label: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`px-3.5 py-2 rounded-lg text-[12px] font-bold whitespace-nowrap transition-colors ${
                sort === opt.key ? 'bg-white/10 text-paper' : 'text-paper/35 hover:text-paper/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-paper/30">Loading...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-paper/20" />
            </div>
            <p className="text-[15px] font-bold text-paper/40 mb-1">No agents match your filters</p>
            <p className="text-[12px] text-paper/20">Try a different search or clear a filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map(a => <AgentCard key={a.id} a={a} />)}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-paper/60 hover:text-paper transition-colors disabled:opacity-40"
                >
                  {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
