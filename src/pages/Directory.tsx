import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VerifiedBadge } from '../components/VerifiedBadge';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const PAGE_SIZE = 24;

interface DirectoryProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  verification_status: string;
  lasrera_id: string | null;
}

type RoleFilter = 'all' | 'agent' | 'landlord';

export default function Directory() {
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfiles = useCallback(async (searchTerm: string, role: RoleFilter, offset: number) => {
    let query = supabase
      .from('public_profiles')
      .select('id, full_name, username, avatar_url, role, verification_status, lasrera_id')
      .in('role', role === 'all' ? ['agent', 'landlord'] : [role])
      .order('verification_status', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (searchTerm.trim()) {
      query = query.or(`full_name.ilike.%${searchTerm.trim()}%,username.ilike.%${searchTerm.trim()}%`);
    }

    const { data } = await query;
    return data || [];
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await fetchProfiles(search, roleFilter, 0);
      setProfiles(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, roleFilter, fetchProfiles]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const more = await fetchProfiles(search, roleFilter, profiles.length);
    setProfiles(prev => [...prev, ...more]);
    setHasMore(more.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const CardContent = ({ p }: { p: DirectoryProfile }) => (
    <>
      <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center text-gold text-[16px] font-bold flex-shrink-0 overflow-hidden">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          (p.full_name || 'U').charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-bold text-white truncate">{p.full_name || 'RentEasy User'}</p>
          <VerifiedBadge status={p.verification_status} size={12} />
        </div>
        <p className="text-[11px] text-white/35 capitalize">{p.role}</p>
        {p.lasrera_id && (
          <p className="text-[10px] text-white/25 font-mono mt-0.5 truncate">{p.lasrera_id}</p>
        )}
        {!p.username && (
          <p className="text-[10px] text-white/20 mt-0.5">Profile not public yet</p>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24" style={font}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-black text-white mb-1">Find an Agent or Landlord</h1>
          <p className="text-[13px] text-white/40">Browse verified agents and landlords on RentEasy</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'agent', label: 'Agents' },
              { key: 'landlord', label: 'Landlords' },
            ] as { key: RoleFilter; label: string }[]).map(opt => (
              <button
                key={opt.key}
                onClick={() => setRoleFilter(opt.key)}
                className={`px-4 py-3 rounded-xl text-[13px] font-bold whitespace-nowrap transition-colors ${
                  roleFilter === opt.key
                    ? 'bg-gold text-white'
                    : 'bg-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-white/30">Loading...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-[15px] font-bold text-white/40 mb-1">No matches found</p>
            <p className="text-[12px] text-white/20">Try a different search or filter.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profiles.map(p => (
                p.username ? (
                  <Link
                    key={p.id}
                    to={`/u/${p.username}`}
                    className="bg-ink border border-white/6 rounded-2xl p-4 flex items-center gap-3 hover:border-white/12 transition-all"
                  >
                    <CardContent p={p} />
                  </Link>
                ) : (
                  <div
                    key={p.id}
                    className="bg-ink border border-white/6 rounded-2xl p-4 flex items-center gap-3 opacity-70"
                  >
                    <CardContent p={p} />
                  </div>
                )
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] font-bold text-white/60 hover:text-white transition-colors disabled:opacity-40"
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
