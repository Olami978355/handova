import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, MapPin, Home, Shield, Loader2, AlertCircle, X, SlidersHorizontal, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Property, PropertyType, TransactionType } from '../types';
import PropertyCard from '../components/PropertyCard';

export default function Listings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [type, setType] = useState<PropertyType | 'all'>((searchParams.get('type') as PropertyType) || 'all');
  const [transactionType, setTransactionType] = useState<TransactionType | 'all'>((searchParams.get('transaction_type') as TransactionType) || 'all');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');

  useEffect(() => {
    fetchProperties();
    
    // Update URL params
    const params = new URLSearchParams();
    if (type !== 'all') params.set('type', type);
    if (transactionType !== 'all') params.set('transaction_type', transactionType);
    if (location) params.set('location', location);
    if (verifiedOnly) params.set('verified', 'true');
    setSearchParams(params, { replace: true });
  }, [type, transactionType, verifiedOnly, location]);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'active');

      if (type !== 'all') {
        query = query.eq('category', type);
      }
      if (transactionType !== 'all') {
        query = query.eq('transaction_type', transactionType);
      }
      if (location) {
        query = query.or(`address.ilike.%${location}%,title.ilike.%${location}%`);
      }
      if (verifiedOnly) {
        query = query.eq('escrow_verified', true);
      }
      if (minPrice) {
        query = query.gte('price', parseInt(minPrice));
      }
      if (maxPrice) {
        query = query.lte('price', parseInt(maxPrice));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Search Header */}
      <div className="bg-[#1a6b3c] pt-12 pb-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">Find your perfect home in Nigeria</h1>
          
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="w-6 h-6 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Search by location, property type, or keyword..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-16 pr-32 py-5 bg-white rounded-3xl shadow-2xl focus:ring-4 focus:ring-[#1a6b3c]/20 outline-none transition-all text-lg"
            />
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#1a6b3c] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-[#14522e] transition-colors flex items-center"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
            </button>
          </div>

          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => navigate('/map')}
              className="flex items-center px-8 py-3 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold text-sm border border-white/20 hover:bg-white/20 transition-all shadow-xl"
            >
              <MapIcon className="w-4 h-4 mr-2" /> Switch to Map View
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar (Desktop) */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-zinc-100 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-zinc-900 flex items-center">
                  <Filter className="w-4 h-4 mr-2 text-[#1a6b3c]" /> Filters
                </h2>
                <button 
                  onClick={() => {
                    setType('all');
                    setTransactionType('all');
                    setMinPrice('');
                    setMaxPrice('');
                    setVerifiedOnly(false);
                  }}
                  className="text-xs font-bold text-[#1a6b3c] hover:underline"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Property Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['all', 'house', 'land'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setType(t as PropertyType | 'all')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all capitalize ${type === t ? 'bg-[#1a6b3c] text-white border-[#1a6b3c]' : 'bg-white text-zinc-600 border-zinc-100 hover:border-zinc-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Listing Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['all', 'rent', 'sell'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTransactionType(t as TransactionType | 'all')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all capitalize ${transactionType === t ? 'bg-[#1a6b3c] text-white border-[#1a6b3c]' : 'bg-white text-zinc-600 border-zinc-100 hover:border-zinc-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Price Range (₦)</label>
                  <div className="space-y-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-50">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={verifiedOnly}
                        onChange={(e) => setVerifiedOnly(e.target.checked)}
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${verifiedOnly ? 'bg-[#1a6b3c]' : 'bg-zinc-200'}`}></div>
                      <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${verifiedOnly ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm font-bold text-zinc-700 group-hover:text-[#1a6b3c] transition-colors">Verified Only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Main Listings Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-bold text-zinc-500">
                Found <span className="text-[#1a6b3c]">{properties.length}</span> properties
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-xl border border-zinc-100">
                <Loader2 className="w-12 h-12 text-[#1a6b3c] animate-spin mb-4" />
                <p className="text-zinc-500 font-bold">Searching for properties...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-xl border border-zinc-100 px-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Oops! Something went wrong</h3>
                <p className="text-zinc-500 mb-6">{error}</p>
                <button 
                  onClick={fetchProperties}
                  className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-xl border border-zinc-100 px-6 text-center">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                  <Home className="w-10 h-10 text-zinc-300" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No properties found</h3>
                <p className="text-zinc-500 mb-8">Try adjusting your filters or search terms to find what you're looking for.</p>
                <button 
                  onClick={() => {
                    setType('all');
                    setTransactionType('all');
                    setMinPrice('');
                    setMaxPrice('');
                    setVerifiedOnly(false);
                  }}
                  className="text-[#1a6b3c] font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-[40px] z-[70] p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-zinc-900">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="p-2 bg-zinc-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Mobile filters content (same as desktop) */}
                {/* ... */}
                <button 
                  onClick={() => {
                    fetchProperties();
                    setShowFilters(false);
                  }}
                  className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#1a6b3c]/20"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
