import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Search, MapPin, Home, Shield, Loader2, AlertCircle,
  X, SlidersHorizontal, Map as MapIcon, ArrowRight,
  RefreshCw, ChevronDown, Check, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Property, PropertyType, TransactionType } from '../types';

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
const PropertyCard = ({ property }: { property: Property }) => {
  const navigate = useNavigate();
  const img = property.images?.[0];
  const periodLabel: Record<string, string> = {
    yearly: '/yr', monthly: '/mo', nightly: '/night', outright: ''
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/property/${property.id}`)}
      className="group bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden cursor-pointer hover:border-[#f0c040]/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30"
    >
      {/* Image */}
      <div className="relative h-44 bg-[#111a14] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-[#f0c040] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">
            {property.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          {property.escrow_verified && (
            <span className="bg-[#1a6b3c] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Verified
            </span>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-black/50 backdrop-blur-sm text-white/70 text-[10px] font-medium px-2 py-1 rounded-lg capitalize flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" />
            {property.listing_type}
          </span>
        </div>

        {/* Video indicator */}
        {property.videos && property.videos.length > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1">
              ▶ {property.videos.length} video{property.videos.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="mb-2">
          <h3 className="text-[14px] font-semibold text-white line-clamp-1 leading-snug">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-white/30 flex-shrink-0" />
            <span className="text-[12px] text-white/40 truncate">
              {property.lga}, {property.state}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div>
            <span className="text-[17px] font-black text-[#f0c040]">
              {formatNaira(property.price)}
            </span>
            {property.price_period && (
              <span className="text-[11px] text-white/35 ml-1">
                {periodLabel[property.price_period]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {property.bedrooms && (
              <span className="text-[11px] text-white/35">
                {property.bedrooms}bd · {property.bathrooms}ba
              </span>
            )}
            {property.land_size_value && (
              <span className="text-[11px] text-white/35">
                {property.land_size_value} {property.land_size_unit}
              </span>
            )}
            {property.inspection_fee && (
              <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-lg">
                Inspect: {formatNaira(property.inspection_fee)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Filter toggle button ─────────────────────────────────────────
const FilterBtn = ({
  label, active, onClick
}: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap ${
      active
        ? 'bg-[#f0c040] text-black'
        : 'bg-white/5 text-white/55 hover:bg-white/8 hover:text-white border border-white/8'
    }`}
  >
    {label}
  </button>
);

// ─── Skeleton card ────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-[#0a1f11] rounded-2xl overflow-hidden border border-white/5">
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
  .eq('status', 'active');

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
      setProperties(data || []);
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
      className="min-h-screen bg-[#0a0a0a] page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Search header ── */}
      <div className="bg-[#0a1f11] border-b border-white/5 pt-8 pb-6 px-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-[22px] font-black text-white tracking-tight mb-5">
            Find your property
          </h1>

          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, area, address..."
              className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
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
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/8 rounded-xl text-[13px] font-semibold text-white/55 hover:bg-white/8 hover:text-white transition-all whitespace-nowrap flex-shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0c040]" />
              )}
            </button>

            <Link
              to="/map"
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/8 rounded-xl text-[13px] font-semibold text-white/55 hover:bg-white/8 hover:text-white transition-all whitespace-nowrap flex-shrink-0"
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map View
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="flex gap-6">

          {/* ── Desktop sidebar filters ── */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 sticky top-24">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[13px] font-bold text-white">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-[#f0c040]/70 hover:text-[#f0c040] transition-colors font-semibold"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-5">
                {/* State */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                    State
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                    <select
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white focus:outline-none focus:border-[#1a6b3c] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#0a1f11]">All states</option>
                      {NIGERIAN_STATES.map(s => (
                        <option key={s} value={s} className="bg-[#0a1f11]">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Property type */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                    Property Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'house', 'land'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`py-2 rounded-xl text-[12px] font-semibold capitalize transition-all ${
                          type === t
                            ? 'bg-[#1a6b3c] text-white'
                            : 'bg-white/5 text-white/45 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
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
                            ? 'bg-[#1a6b3c] text-white'
                            : 'bg-white/5 text-white/45 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                    Min Bedrooms
                  </label>
                  <div className="flex gap-1.5">
                    {['', '1', '2', '3', '4'].map(b => (
                      <button
                        key={b}
                        onClick={() => setBedrooms(b)}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                          bedrooms === b
                            ? 'bg-[#1a6b3c] text-white'
                            : 'bg-white/5 text-white/45 hover:bg-white/8'
                        }`}
                      >
                        {b || 'Any'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                    Price Range (₦)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min price"
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Max price"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                    />
                  </div>
                </div>

                {/* Verified only */}
                <div className="pt-4 border-t border-white/5">
                  <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#1a6b3c]" />
                      <span className="text-[13px] font-semibold text-white/70">Verified only</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${verifiedOnly ? 'bg-[#1a6b3c]' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${verifiedOnly ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Properties grid ── */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-white/45">
                {loading ? 'Searching...' : (
                  <>
                    <span className="text-white font-semibold">{totalCount}</span>
                    {' '}propert{totalCount === 1 ? 'y' : 'ies'} found
                    {state && <span className="text-white/30"> in {state}</span>}
                  </>
                )}
              </p>
              {hasActiveFilters && !loading && (
                <button
                  onClick={clearFilters}
                  className="text-[12px] text-white/35 hover:text-[#f0c040] transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>

            {/* Loading */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : error ? (
              <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-12 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                <h3 className="text-[16px] font-bold text-white mb-2">Failed to load properties</h3>
                <p className="text-[13px] text-white/40 mb-6">{error}</p>
                <button
                  onClick={fetchProperties}
                  className="flex items-center gap-2 bg-[#1a6b3c] text-white px-6 py-3 rounded-xl font-semibold text-[13px] hover:bg-[#0f4a2a] transition-colors mx-auto"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            ) : properties.length === 0 ? (
              <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-14 text-center">
                <Home className="w-10 h-10 text-white/15 mx-auto mb-4" />
                <h3 className="text-[16px] font-bold text-white mb-2">No properties found</h3>
                <p className="text-[13px] text-white/40 mb-6">
                  Try adjusting your filters or search in a different area.
                </p>
                <button
                  onClick={clearFilters}
                  className="text-[13px] font-semibold text-[#f0c040] hover:text-[#e0b030] transition-colors flex items-center gap-1 mx-auto"
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
            )}
          </div>
        </div>
      </div>

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
              className="fixed inset-x-0 bottom-0 bg-[#0a1f11] border-t border-white/8 rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5">
                {/* Handle */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[17px] font-bold text-white">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* State */}
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">State</label>
                    <select
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white focus:outline-none focus:border-[#1a6b3c] transition-colors"
                    >
                      <option value="" className="bg-[#0a1f11]">All states</option>
                      {NIGERIAN_STATES.map(s => (
                        <option key={s} value={s} className="bg-[#0a1f11]">{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Property Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['all', 'house', 'land'] as const).map(t => (
                        <button key={t} onClick={() => setType(t)}
                          className={`py-3 rounded-xl text-[13px] font-semibold capitalize transition-all ${type === t ? 'bg-[#1a6b3c] text-white' : 'bg-white/5 text-white/45'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction */}
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Listing Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ value: 'all', label: 'All' }, { value: 'rent', label: 'Rent' }, { value: 'sell', label: 'Buy' }].map(({ value, label }) => (
                        <button key={value} onClick={() => setTransaction(value as TransactionType | 'all')}
                          className={`py-3 rounded-xl text-[13px] font-semibold transition-all ${transaction === value ? 'bg-[#1a6b3c] text-white' : 'bg-white/5 text-white/45'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Min Bedrooms</label>
                    <div className="flex gap-2">
                      {['', '1', '2', '3', '4'].map(b => (
                        <button key={b} onClick={() => setBedrooms(b)}
                          className={`flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all ${bedrooms === b ? 'bg-[#1a6b3c] text-white' : 'bg-white/5 text-white/45'}`}>
                          {b || 'Any'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Price Range (₦)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#1a6b3c]" />
                      <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#1a6b3c]" />
                    </div>
                  </div>

                  {/* Verified */}
                  <button onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className="flex items-center justify-between w-full py-3 px-4 bg-white/5 rounded-xl border border-white/8">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#1a6b3c]" />
                      <span className="text-[13px] font-semibold text-white/70">Verified listings only</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${verifiedOnly ? 'bg-[#1a6b3c]' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${verifiedOnly ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={clearFilters}
                      className="flex-1 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[14px] font-semibold text-white/55 hover:bg-white/8 transition-colors">
                      Clear all
                    </button>
                    <button onClick={() => setShowFilters(false)}
                      className="flex-1 py-3.5 bg-[#f0c040] text-black rounded-xl text-[14px] font-bold hover:bg-[#e0b030] transition-colors">
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