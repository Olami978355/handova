import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Scale, Loader2, CheckCircle2, MapPin, Star, Clock } from 'lucide-react';
import { LawyerConsultationModal } from '../components/deal/LawyerConsultationModal';
import { supabase } from '../lib/supabase';
import { VerifiedBadge } from '../components/VerifiedBadge';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const PAGE_SIZE = 24;
const STATE_OPTIONS = ['Lagos', 'Oyo', 'Ogun', 'Rivers', 'FCT', 'Kano', 'Other'];

interface LawyerListing {
  id: string;
  user_id: string;
  specialty: string;
  states_covered: string[];
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
  avgRating?: number | null;
  reviewCount?: number;
  avgResponseHours?: number | null;
  default_fee: number;
}

type SpecialtyFilter = 'all' | 'tenancy' | 'property_title' | 'both';

export default function LawyerDirectory() {
  const [lawyers, setLawyers] = useState<LawyerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState<SpecialtyFilter>('all');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [consultLawyer, setConsultLawyer] = useState<LawyerListing | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLawyers = useCallback(async (searchTerm: string, spec: SpecialtyFilter, state: string | null, offset: number) => {
    let query = supabase
      .from('lawyer_verifications')
      .select('id, user_id, specialty, states_covered, default_fee')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (spec !== 'all') {
      query = query.or(`specialty.eq.${spec},specialty.eq.both`);
    }
    if (state) {
      query = query.contains('states_covered', [state]);
    }

    const { data: verifications } = await query;
    if (!verifications || verifications.length === 0) return [];

    const userIds = verifications.map(v => v.user_id);
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, full_name, username, avatar_url, verification_status')
      .in('id', userIds)
      .not('username', 'is', null);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    let combined: LawyerListing[] = verifications
      .filter(v => profileMap[v.user_id])
      .map(v => ({
        ...v,
        full_name: profileMap[v.user_id].full_name,
        username: profileMap[v.user_id].username,
        avatar_url: profileMap[v.user_id].avatar_url,
        verification_status: profileMap[v.user_id].verification_status,
      }));

    const { data: ratingRows } = await supabase
      .from('lawyer_review_bookings')
      .select('lawyer_id, requester_rating')
      .in('lawyer_id', userIds)
      .not('requester_rating', 'is', null);

    const ratingMap: Record<string, number[]> = {};
    (ratingRows || []).forEach(r => {
      if (!ratingMap[r.lawyer_id]) ratingMap[r.lawyer_id] = [];
      ratingMap[r.lawyer_id].push(r.requester_rating as number);
    });

    combined = combined.map(l => {
      const ratings = ratingMap[l.user_id] || [];
      return {
        ...l,
        avgRating: ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
        reviewCount: ratings.length,
      };
    });

    const { data: responseRows } = await supabase
      .from('lawyer_review_bookings')
      .select('lawyer_id, created_at, verdict_submitted_at')
      .in('lawyer_id', userIds)
      .not('verdict_submitted_at', 'is', null);

    const responseMap: Record<string, number[]> = {};
    (responseRows || []).forEach(r => {
      const hours = (new Date(r.verdict_submitted_at as string).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
      if (!responseMap[r.lawyer_id]) responseMap[r.lawyer_id] = [];
      responseMap[r.lawyer_id].push(hours);
    });

    combined = combined.map(l => {
      const times = responseMap[l.user_id] || [];
      return {
        ...l,
        avgResponseHours: times.length > 0 ? Math.round(times.reduce((s, h) => s + h, 0) / times.length) : null,
      };
    });

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      combined = combined.filter(l =>
        l.full_name?.toLowerCase().includes(term) || l.username?.toLowerCase().includes(term)
      );
    }

    return combined;
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await fetchLawyers(search, specialty, stateFilter, 0);
      setLawyers(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, specialty, stateFilter, fetchLawyers]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const more = await fetchLawyers(search, specialty, stateFilter, lawyers.length);
    setLawyers(prev => [...prev, ...more]);
    setHasMore(more.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const specialtyLabel = (s: string) =>
    s === 'property_title' ? 'Property / Title' : s === 'both' ? 'Tenancy + Property' : 'Tenancy';

  return (
    <div className="min-h-screen bg-ink pb-24" style={font}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-black text-paper mb-1">Find a Lawyer</h1>
          <p className="text-[13px] text-paper/40">NBA-verified lawyers who can review your agreement before you sign</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {([
            { key: 'all', label: 'All Specialties' },
            { key: 'tenancy', label: 'Tenancy' },
            { key: 'property_title', label: 'Property / Title' },
          ] as { key: SpecialtyFilter; label: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setSpecialty(opt.key)}
              className={`px-3.5 py-2 rounded-lg text-[12px] font-bold whitespace-nowrap transition-colors ${
                specialty === opt.key ? 'bg-gold text-paper' : 'bg-white/5 text-paper/40 hover:text-paper/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setStateFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
              stateFilter === null ? 'bg-white/10 text-paper' : 'text-paper/35 hover:text-paper/60'
            }`}
          >
            <MapPin className="w-3 h-3" /> Any State
          </button>
          {STATE_OPTIONS.map(state => (
            <button
              key={state}
              onClick={() => setStateFilter(stateFilter === state ? null : state)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                stateFilter === state ? 'bg-white/10 text-paper' : 'text-paper/35 hover:text-paper/60'
              }`}
            >
              {state}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-paper/30">Loading...</p>
          </div>
        ) : lawyers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
              <Scale className="w-7 h-7 text-paper/20" />
            </div>
            <p className="text-[15px] font-bold text-paper/40 mb-1">No lawyers match your filters</p>
            <p className="text-[12px] text-paper/20">Try a different search or clear a filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lawyers.map(l => (
                <div key={l.id}>
                  <Link
                  to={`/u/${l.username}`}
                  className="bg-ink border border-white/6 rounded-2xl p-4 flex items-center gap-3 hover:border-white/12 transition-all"
                >
                  <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center text-gold text-[16px] font-bold flex-shrink-0 overflow-hidden">
                    {l.avatar_url ? (
                      <img src={l.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (l.full_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-bold text-paper truncate">{l.full_name || 'Handova Lawyer'}</p>
                      <VerifiedBadge status={l.verification_status} size={12} />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-gold flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-gold">NBA Verified</span>
                      {l.avgRating && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-gold ml-2">
                          <Star className="w-3 h-3 fill-gold" /> {l.avgRating.toFixed(1)}
                          <span className="text-paper/30 font-normal">({l.reviewCount})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-paper/40 mt-0.5">{specialtyLabel(l.specialty)}</p>
                    {l.states_covered.length > 0 && (
                      <p className="text-[10px] text-paper/25 mt-0.5 truncate">{l.states_covered.join(', ')}</p>
                    )}
                    {l.avgResponseHours !== null && l.avgResponseHours !== undefined && (
                      <p className="flex items-center gap-1 text-[10px] text-paper/30 mt-0.5">
                        <Clock className="w-2.5 h-2.5" /> Usually responds within {l.avgResponseHours < 24 ? l.avgResponseHours + "h" : Math.round(l.avgResponseHours / 24) + "d"}
                      </p>
                    )}
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConsultLawyer(l); }}
                  className="w-full mt-2 py-2 bg-gold/10 border border-gold/20 rounded-lg text-[11px] font-bold text-gold hover:bg-gold/15 transition-colors"
                >
                  Book a Consultation
                </button>
                </div>
              ))}
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
      {consultLawyer && (
        <LawyerConsultationModal
          lawyerId={consultLawyer.user_id}
          lawyerName={consultLawyer.full_name || 'this lawyer'}
          lawyerFee={consultLawyer.default_fee}
          onClose={() => setConsultLawyer(null)}
        />
      )}
    </div>
  );
}
