import React, { useState, useEffect, useRef } from 'react';
import { formatNaira } from '../utils/format';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, List, SlidersHorizontal,
  X, Home, Loader2, MapPin, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyMap } from '../components/map/PropertyMap';
import { usePropertyMap } from '../hooks/usePropertyMap';
import { Property, PropertyType, TransactionType } from '../types';
import { Link } from 'react-router-dom';
import { FilterBtn } from '../components/ui/FilterBtn';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const abbreviatePrice = (amount: number) => {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return `₦${amount.toLocaleString()}`;
};

const periodLabel: Record<string, string> = {
  yearly: '/yr', monthly: '/mo', nightly: '/night', outright: ''
};

const MapPropertyCard = ({ property, selected, onClick }: {
  property: Property;
  selected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-pressed={selected}
    aria-label={`View ${property.title} on map`}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
      selected
        ? 'bg-gold/15 border-gold/40'
        : 'bg-white/4 border-white/6 hover:bg-white/6 hover:border-white/12'
    }`}
  >
    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#111a14] flex-shrink-0">
      {property.images?.[0]
        ? <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center"><Home className="w-5 h-5 text-paper/15" /></div>
      }
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-bold text-paper truncate">{property.title}</p>
      <div className="flex items-center gap-1 mt-0.5">
        <MapPin className="w-3 h-3 text-paper/25 flex-shrink-0" />
        <span className="text-[11px] text-paper/40 truncate">{property.lga}, {property.state}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[13px] font-black text-gold">
          {formatNaira(property.price)}
          {property.price_period && (
            <span className="text-[10px] font-normal text-paper/30 ml-0.5">
              {periodLabel[property.price_period]}
            </span>
          )}
        </span>
        {property.escrow_verified && (
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-gold">
            <Shield className="w-2.5 h-2.5" /> Verified
          </span>
        )}
      </div>
    </div>
    <Link
      to={`/property/${property.id}`}
      onClick={e => e.stopPropagation()}
      className="text-[11px] font-bold text-gold/60 hover:text-gold transition-colors flex-shrink-0"
    >
      View →
    </Link>
  </div>
);

export default function MapSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [type, setType] = useState<PropertyType | 'all'>((searchParams.get('type') as PropertyType) || 'all');
  const [transactionType, setTransactionType] = useState<TransactionType | 'all'>((searchParams.get('transaction') as TransactionType) || 'all');
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (transactionType !== 'all') params.set('transaction', transactionType);
      if (minPrice) params.set('min', minPrice);
      if (maxPrice) params.set('max', maxPrice);
      if (verifiedOnly) params.set('verified', 'true');
      setSearchParams(params, { replace: true });
    }, 300);
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, [type, transactionType, minPrice, maxPrice, verifiedOnly]);

  const filters = {
    type, transactionType,
    minPrice: minPrice ? parseInt(minPrice) : undefined,
    maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    verifiedOnly,
  };

  const { properties, loading, error } = usePropertyMap(filters);

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setType('all');
    setTransactionType('all');
    setMinPrice('');
    setMaxPrice('');
    setVerifiedOnly(false);
  };

  const FilterContent = () => (
    <div className="space-y-5">
      {/* Property type */}
      <div>
        <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Property Type</label>
        <div className="grid grid-cols-3 gap-2">
          {(['all', 'house', 'land'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`py-2.5 rounded-xl text-[12px] font-bold capitalize transition-all ${
                type === t ? 'bg-gold text-paper' : 'bg-white/5 text-paper/45 hover:bg-white/8'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Listing type */}
      <div>
        <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Listing Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[{ v: 'all', l: 'All' }, { v: 'rent', l: 'Rent' }, { v: 'sell', l: 'Buy' }].map(({ v, l }) => (
            <button key={v} onClick={() => setTransactionType(v as TransactionType | 'all')}
              className={`py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                transactionType === v ? 'bg-gold text-paper' : 'bg-white/5 text-paper/45 hover:bg-white/8'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Price Range (₦)</label>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-white/20 outline-none focus:border-gold/50" />
          <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-white/20 outline-none focus:border-gold/50" />
        </div>
      </div>

      {/* Verified filter */}
      <FilterBtn label="✓ Verified only" active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)} />
    </div>
  );

  return (
    <div className="h-screen bg-ink flex flex-col overflow-hidden" style={font}>

      {/* Header */}
      <div className="bg-ink border-b border-white/5 z-40 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/50 hover:text-paper transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[15px] font-bold text-paper">Map View</h1>
            {!loading && (
              <span className="text-[11px] text-paper/30 font-medium">
                {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/listings')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 text-paper/55 rounded-xl font-semibold text-[12px] hover:bg-white/8 hover:text-paper transition-all">
              <List className="w-3.5 h-3.5" /> List View
            </button>
            <button onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gold/10 border border-gold/20 text-gold rounded-xl font-bold text-[12px] hover:bg-gold/15 transition-all lg:hidden">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">

        {/* Desktop sidebar */}
        <div className="hidden lg:flex w-96 flex-col bg-ink border-r border-white/5 overflow-hidden">

          {/* Filters panel */}
          <div className="p-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold text-paper flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-gold" /> Filters
              </h2>
              <button onClick={resetFilters} className="text-[11px] font-bold text-gold/60 hover:text-gold transition-colors">
                Reset all
              </button>
            </div>
            <FilterContent />
          </div>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-[12px] text-paper/30">Loading properties...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-[13px] text-red-400 mb-2">Failed to load properties</p>
                <p className="text-[11px] text-paper/30">{error}</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-white/4 rounded-2xl flex items-center justify-center mb-3">
                  <Home className="w-6 h-6 text-paper/15" />
                </div>
                <p className="text-[13px] font-semibold text-paper/35 mb-1">No properties found</p>
                <p className="text-[11px] text-paper/20 mb-3">Try adjusting your filters</p>
                <button
                  onClick={() => {
                    setType('all');
                    setTransactionType('all');
                    setMinPrice('');
                    setMaxPrice('');
                    setVerifiedOnly(false);
                  }}
                  className="text-[12px] font-semibold text-gold hover:text-[#e0b030] transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              properties.map(property => (
                <MapPropertyCard
                  key={property.id}
                  property={property}
                  selected={selectedProperty?.id === property.id}
                  onClick={() => setSelectedProperty(property)}
                />
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <PropertyMap
            properties={properties}
            loading={loading}
            error={error}
            onPropertySelect={setSelectedProperty}
          />

          {/* Selected property popup — mobile */}
          <AnimatePresence>
            {selectedProperty && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-6 left-4 right-4 lg:hidden z-10"
              >
                <div className="bg-ink border border-white/8 rounded-2xl p-3 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#111a14] flex-shrink-0">
                      {selectedProperty.images?.[0]
                        ? <img src={selectedProperty.images[0]} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Home className="w-5 h-5 text-paper/15" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-paper truncate">{selectedProperty.title}</p>
                      <p className="text-[11px] text-paper/40">{selectedProperty.lga}, {selectedProperty.state}</p>
                      <p className="text-[14px] font-black text-gold mt-0.5">
                        {formatNaira(selectedProperty.price)}
                        {selectedProperty.price_period && (
                          <span className="text-[10px] font-normal text-paper/30 ml-0.5">
                            {periodLabel[selectedProperty.price_period]}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link to={`/property/${selectedProperty.id}`}
                        className="px-3 py-2 bg-gold text-black rounded-xl font-bold text-[12px] hover:bg-[#e0b030] transition-colors text-center">
                        View
                      </Link>
                      <button onClick={() => setSelectedProperty(null)}
                        className="px-3 py-2 bg-white/5 text-paper/40 rounded-xl text-[12px] hover:bg-white/8 transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black z-[60]"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-ink border-t border-white/8 rounded-t-3xl z-[70] max-h-[90vh] overflow-y-auto"
              style={font}
            >
              <div className="p-5">
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[17px] font-bold text-paper">Filters</h2>
                  <button onClick={() => setShowFilters(false)}
                    className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/50 hover:text-paper transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <FilterContent />
                <div className="flex gap-3 mt-5 pt-4 border-t border-white/5">
                  <button onClick={resetFilters}
                    className="flex-1 py-3.5 bg-white/5 border border-white/8 rounded-xl text-[14px] font-bold text-paper/50 hover:bg-white/8 transition-colors">
                    Reset
                  </button>
                  <button onClick={() => setShowFilters(false)}
                    className="flex-[2] py-3.5 bg-gold text-black rounded-xl text-[14px] font-bold hover:bg-[#e0b030] transition-colors">
                    Show {properties.length} result{properties.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}