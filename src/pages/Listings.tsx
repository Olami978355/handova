import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Search, Home, Shield, Loader2, AlertCircle,
  X, SlidersHorizontal, Map as MapIcon, ArrowRight,
  RefreshCw, ChevronDown, Check, Layers, BookmarkPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Property, PropertyType, TransactionType } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import PropertyCard from '../components/PropertyCard';
import { FilterBtn } from '../components/ui/FilterBtn';
import { Select } from '../components/ui/Select';
import { PropertyMap } from '../components/map/PropertyMap';
import { useAuth } from '../context/AuthContext';

// ─── Nigerian States ───────────────────────────────────────────────
const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
  'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau',
  'Rivers','Sokoto','Taraba','Yobe','Zamfara'
];

// ─── Format Naira ──────────────────────────────────────────────────
const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

const abbreviatePrice = (amount: number) => {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return formatNaira(amount);
};

// ─── Property Card (dark horizontal style) ────────────────────────
// ─── Filter toggle button ─────────────────────────────────────────

// ─── Skeleton card ────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-slate/25 rounded-2xl overflow-hidden border border-white/5">
    <div className="skeleton h-44" />
    <div className="p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-5 w-2/5 mt-2" />
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN LISTINGS PAGE
// ═══════════════════════════════════════════════════════════════
export default function Listings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveSearchMsg, setSaveSearchMsg] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state ──
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [type, setType] = useState<PropertyType | 'all'>(
    (searchParams.get('type') as PropertyType) || 'all'
  );
  const [transaction, setTransaction] = useState<TransactionType | 'all'>(
    (searchParams.get('transaction') as TransactionType) || 'all'
  );
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(
    searchParams.get('verified') === 'true'
  );
  const [bedrooms, setBedrooms] = useState(searchParams.get('beds') || '');

  // ── UI state ──
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [totalCount, setTotalCount] = useState(0);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ──
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
  .from('properties')
  .select('*', { count: 'exact' })
  .eq('status', 'active').is('deleted_at', null).eq('is_delisted', false);

      if (type !== 'all') query = query.eq('listing_type', type);
      if (transaction !== 'all') query = query.eq('transaction_type', transaction);
      if (state) query = query.eq('state', state);
      if (verifiedOnly) query = query.eq('escrow_verified', true);
      if (minPrice) query = query.gte('price', parseInt(minPrice));
      if (maxPrice) query = query.lte('price', parseInt(maxPrice));
      if (bedrooms) query = query.gte('bedrooms', parseInt(bedrooms));
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,address.ilike.%${search}%,lga.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      const { data, error: fetchError, count } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const rows = data || [];
      const ownerIds = [...new Set(rows.map(p => p.owner_id).filter(Boolean))];
      let ownerMap: Record<string, { role: string; verification_status: string }> = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('public_profiles')
          .select('id, role, verification_status')
          .in('id', ownerIds);
        if (owners) {
          ownerMap = Object.fromEntries(owners.map(o => [o.id, { role: o.role, verification_status: o.verification_status }]));
        }
      }
      const enriched = rows.map(p => ({
        ...p,
        owner_role: ownerMap[p.owner_id]?.role,
        owner_verification_status: ownerMap[p.owner_id]?.verification_status,
      }));
      setProperties(enriched);
      setTotalCount(count || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load properties';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [type, transaction, state, verifiedOnly, minPrice, maxPrice, bedrooms, search]);

  // ── Debounce search ──
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchProperties();
      // Sync URL
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (state) params.set('state', state);
      if (type !== 'all') params.set('type', type);
      if (transaction !== 'all') params.set('transaction', transaction);
      if (minPrice) params.set('min', minPrice);
      if (maxPrice) params.set('max', maxPrice);
      if (verifiedOnly) params.set('verified', 'true');
      if (bedrooms) params.set('beds', bedrooms);
      setSearchParams(params, { replace: true });
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [fetchProperties]);

  const handleSaveSearch = async () => {
    if (!user || !searchName.trim()) return;
    setSavingSearch(true);
    const filters = { search, state, type, transaction, minPrice, maxPrice, verifiedOnly, bedrooms };
    const { error: saveError } = await supabase
      .from('saved_searches')
      .insert({ user_id: user.id, name: searchName.trim(), filters });
    setSavingSearch(false);
    if (!saveError) {
      setSaveSearchMsg('Search saved');
      setSearchName('');
      setSaveSearchOpen(false);
      setTimeout(() => setSaveSearchMsg(null), 2500);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setState('');
    setType('all');
    setTransaction('all');
    setMinPrice('');
    setMaxPrice('');
    setVerifiedOnly(false);
    setBedrooms('');
  };

  const hasActiveFilters = type !== 'all' || transaction !== 'all' || state ||
    minPrice || maxPrice || verifiedOnly || bedrooms || search;

  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-ink page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Search header ── */}
      <div className="bg-slate/25 border-b border-white/5 pt-8 pb-6 px-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-[22px] font-black text-paper tracking-tight mb-5">
            Find your property
          </h1>

          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/30 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, area, address..."
              className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-paper/30 hover:text-paper transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <FilterBtn label="All" active={type === 'all' && transaction === 'all' && !verifiedOnly} onClick={clearFilters} />
            <FilterBtn label="For Rent" active={transaction === 'rent'} onClick={() => setTransaction(transaction === 'rent' ? 'all' : 'rent')} />
            <FilterBtn label="For Sale" active={transaction === 'sell'} onClick={() => setTransaction(transaction === 'sell' ? 'all' : 'sell')} />
            <FilterBtn label="Houses" active={type === 'house'} onClick={() => setType(type === 'house' ? 'all' : 'house')} />
            <FilterBtn label="Land" active={type === 'land'} onClick={() => setType(type === 'land' ? 'all' : 'land')} />
            <FilterBtn label="✓ Verified" active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)} />

            <div className="w-px h-5 bg-white/10 flex-shrink-0 mx-1" />

            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/8 rounded-xl text-[13px] font-semibold text-paper/55 hover:bg-white/8 hover:text-paper transition-all whitespace-nowrap flex-shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              )}
            </button>

            <button
              onClick={() => setView(view === 'list' ? 'map' : 'list')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/8 rounded-xl text-[13px] font-semibold text-paper/55 hover:bg-white/8 hover:text-paper transition-all whitespace-nowrap flex-shrink-0"
            >
              {view === 'list' ? <MapIcon className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
              {view === 'list' ? 'Map View' : 'List View'}
            </button>
            {user && (
              <button
                onClick={() => setSaveSearchOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/8 rounded-xl text-[13px] font-semibold text-paper/55 hover:bg-white/8 hover:text-paper transition-all whitespace-nowrap flex-shrink-0"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save search
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="flex gap-6">

          {/* ── Desktop sidebar filters ── */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-slate/25 border border-white/6 rounded-2xl p-5 sticky top-24">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[13px] font-bold text-paper">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-gold/70 hover:text-gold transition-colors font-semibold"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-5">
                {/* State */}
                <div>
                  <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                    State
                  </label>
                    <Select
                      value={state}
                      onChange={setState}
                      placeholder="All states"
                      options={[{ value: '', label: 'All states' }, ...NIGERIAN_STATES.map(s => ({ value: s, label: s }))]}
                    />
                </div>

                {/* Property type */}
                <div>
                  <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                    Property Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'house', 'land'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`py-2 rounded-xl text-[12px] font-semibold capitalize transition-all ${
                          type === t
                            ? 'bg-gold text-ink'
                            : 'bg-white/5 text-paper/45 hover:bg-white/8 hover:text-paper'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction */}
                <div>
                  <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                    Listing Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { value: 'all', label: 'All' },
                      { value: 'rent', label: 'Rent' },
                      { value: 'sell', label: 'Buy' },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setTransaction(value)}
                        className={`py-2 rounded-xl text-[12px] font-semibold transition-all ${
                          transaction === value
                            ? 'bg-gold text-ink'
                            : 'bg-white/5 text-paper/45 hover:bg-white/8 hover:text-paper'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                    Min Bedrooms
                  </label>
                  <div className="flex gap-1.5">
                    {['', '1', '2', '3', '4'].map(b => (
                      <button
                        key={b}
                        onClick={() => setBedrooms(b)}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                          bedrooms === b
                            ? 'bg-gold text-ink'
                            : 'bg-white/5 text-paper/45 hover:bg-white/8'
                        }`}
                      >
                        {b || 'Any'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
                    Price Range (₦)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min price"
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-paper placeholder:text-paper/20 focus:outline-none focus:border-gold transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Max price"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-paper placeholder:text-paper/20 focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ── Properties grid ── */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-paper/45">
                {loading ? 'Searching...' : (
                  <>
                    <span className="text-paper font-semibold">{totalCount}</span>
                    {' '}propert{totalCount === 1 ? 'y' : 'ies'} found
                    {state && <span className="text-paper/30"> in {state}</span>}
                  </>
                )}
              </p>
              {hasActiveFilters && !loading && (
                <button
                  onClick={clearFilters}
                  className="text-[12px] text-paper/35 hover:text-gold transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>

            {/* Loading */}
            {view === 'list' ? (
            loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : error ? (
              <div className="bg-slate/25 border border-white/6 rounded-2xl p-12 text-center">
                <AlertCircle className="w-10 h-10 text-danger mx-auto mb-4" />
                <h3 className="text-[16px] font-bold text-paper mb-2">Failed to load properties</h3>
                <p className="text-[13px] text-paper/40 mb-6">{error}</p>
                <button
                  onClick={fetchProperties}
                  className="flex items-center gap-2 bg-gold text-ink px-6 py-3 rounded-xl font-semibold text-[13px] hover:bg-gold-dark transition-colors mx-auto"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-slate/25 border border-white/6 rounded-2xl p-14 text-center">
                <Home className="w-10 h-10 text-paper/15 mx-auto mb-4" />
                <h3 className="text-[16px] font-bold text-paper mb-2">No properties found</h3>
                <p className="text-[13px] text-paper/40 mb-6">
                  Try adjusting your filters or search in a different area.
                </p>
                <button
                  onClick={clearFilters}
                  className="text-[13px] font-semibold text-gold hover:text-gold-dark transition-colors flex items-center gap-1 mx-auto"
                >
                  Clear all filters <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )
            ) : (
              <div className="h-[70vh] rounded-2xl overflow-hidden border border-paper/10">
                <PropertyMap properties={properties} loading={loading} error={error} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save search modal */}
      <AnimatePresence>
        {saveSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaveSearchOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-5"
            >
              <div className="bg-slate/95 border border-paper/10 rounded-2xl p-6 max-w-sm w-full">
                <h3 className="font-sans text-[16px] font-bold text-paper mb-1">Save this search</h3>
                <p className="font-sans text-[13px] text-paper/45 mb-4">Give it a name so you can find it again later.</p>
                <input
                  type="text"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  placeholder="e.g. 2-bed in Lekki under ₦2M"
                  autoFocus
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setSaveSearchOpen(false)}
                    className="flex-1 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] font-semibold text-paper/55 hover:bg-white/8 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSearch}
                    disabled={!searchName.trim() || savingSearch}
                    className="flex-1 py-3 bg-gold text-ink rounded-xl text-[13px] font-bold hover:bg-gold-dark transition-colors disabled:opacity-50"
                  >
                    {savingSearch ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile filter drawer ── */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-slate/25 border-t border-white/8 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5">
                {/* Handle */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[17px] font-bold text-paper">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* State */}
                  <div>
                    <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">State</label>
                    <Select
                      value={state}
                      onChange={setState}
                      placeholder="All states"
                      options={[{ value: '', label: 'All states' }, ...NIGERIAN_STATES.map(s => ({ value: s, label: s }))]}
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">Property Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['all', 'house', 'land'] as const).map(t => (
                        <button key={t} onClick={() => setType(t)}
                          className={`py-3 rounded-xl text-[13px] font-semibold capitalize transition-all ${type === t ? 'bg-gold text-ink' : 'bg-white/5 text-paper/45'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction */}
                  <div>
                    <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">Listing Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ value: 'all', label: 'All' }, { value: 'rent', label: 'Rent' }, { value: 'sell', label: 'Buy' }].map(({ value, label }) => (
                        <button key={value} onClick={() => setTransaction(value as TransactionType | 'all')}
                          className={`py-3 rounded-xl text-[13px] font-semibold transition-all ${transaction === value ? 'bg-gold text-ink' : 'bg-white/5 text-paper/45'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">Min Bedrooms</label>
                    <div className="flex gap-2">
                      {['', '1', '2', '3', '4'].map(b => (
                        <button key={b} onClick={() => setBedrooms(b)}
                          className={`flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all ${bedrooms === b ? 'bg-gold text-ink' : 'bg-white/5 text-paper/45'}`}>
                          {b || 'Any'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[11px] font-semibold text-paper/40 uppercase tracking-wider mb-2">Price Range (₦)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/20 focus:outline-none focus:border-gold" />
                      <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/20 focus:outline-none focus:border-gold" />
                    </div>
                  </div>


                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={clearFilters}
                      className="flex-1 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[14px] font-semibold text-paper/55 hover:bg-white/8 transition-colors">
                      Clear all
                    </button>
                    <button onClick={() => setShowFilters(false)}
                      className="flex-1 py-3.5 bg-gold text-ink rounded-xl text-[14px] font-bold hover:bg-gold-dark transition-colors">
                      Show {totalCount} result{totalCount !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}