import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Map as MapIcon, List, Search, SlidersHorizontal, 
  X, Filter, Home, Loader2, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyMap } from '../components/map/PropertyMap';
import { usePropertyMap } from '../hooks/usePropertyMap';
import { Property, PropertyType, TransactionType } from '../types';
import PropertyCard from '../components/PropertyCard';

export default function MapSearch() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Filters
  const [type, setType] = useState<PropertyType | 'all'>('all');
  const [transactionType, setTransactionType] = useState<TransactionType | 'all'>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filters = {
    type,
    transactionType,
    minPrice: minPrice ? parseInt(minPrice) : undefined,
    maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    verifiedOnly
  };

  const { properties, loading, error } = usePropertyMap(filters);

  return (
    <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-zinc-900">Map View</h1>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/listings')}
              className="flex items-center px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all"
            >
              <List className="w-4 h-4 mr-2" /> List View
            </button>
            <button className="p-2 bg-[#1a6b3c] text-white rounded-xl shadow-lg shadow-[#1a6b3c]/20">
              <MapIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Sidebar (Desktop Only) */}
        <div className="hidden lg:flex w-[450px] flex-col bg-white border-r border-zinc-100">
          <div className="p-6 border-b border-zinc-50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-zinc-900 flex items-center text-lg">
                <Filter className="w-5 h-5 mr-2 text-[#1a6b3c]" /> Filters
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

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Property Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as PropertyType | 'all')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
                >
                  <option value="all">All Types</option>
                  <option value="house">House</option>
                  <option value="land">Land</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Listing Type</label>
                <select 
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as TransactionType | 'all')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
                >
                  <option value="all">All Listings</option>
                  <option value="rent">For Rent</option>
                  <option value="sell">For Sale</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
              <span className="text-xs font-bold text-zinc-600">Verified Only</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a6b3c]"></div>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{properties.length} Results Found</span>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#1a6b3c] animate-spin mb-4" />
                <p className="text-zinc-400 font-bold text-sm">Loading properties...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-zinc-200" />
                </div>
                <p className="text-zinc-400 font-bold">No properties found.</p>
              </div>
            ) : (
              properties.map((property) => (
                <div 
                  key={property.id} 
                  className={`cursor-pointer transition-all ${selectedProperty?.id === property.id ? 'ring-2 ring-[#1a6b3c] rounded-3xl' : ''}`}
                  onClick={() => setSelectedProperty(property)}
                >
                  <PropertyCard property={property} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          {/* Mobile Search/Filter Toggle */}
          <div className="absolute top-6 left-6 right-6 z-10 lg:hidden flex gap-2">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search location..."
                className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl shadow-xl outline-none focus:ring-2 focus:ring-[#1a6b3c]/20 text-sm"
              />
            </div>
            <button 
              onClick={() => setShowFilters(true)}
              className="p-3 bg-white rounded-2xl shadow-xl text-[#1a6b3c] border border-zinc-100"
            >
              <SlidersHorizontal className="w-6 h-6" />
            </button>
          </div>

          <PropertyMap 
            properties={properties} 
            loading={loading} 
            error={error}
            onPropertySelect={setSelectedProperty}
          />
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

              <div className="space-y-8 pb-8">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Property Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['all', 'house', 'land'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setType(t as PropertyType | 'all')}
                        className={`py-3 px-4 rounded-2xl text-sm font-bold border transition-all capitalize ${type === t ? 'bg-[#1a6b3c] text-white border-[#1a6b3c]' : 'bg-white text-zinc-600 border-zinc-100'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Listing Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['all', 'rent', 'sell'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTransactionType(t as TransactionType | 'all')}
                        className={`py-3 px-4 rounded-2xl text-sm font-bold border transition-all capitalize ${transactionType === t ? 'bg-[#1a6b3c] text-white border-[#1a6b3c]' : 'bg-white text-zinc-600 border-zinc-100'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <span className="font-bold text-zinc-700">Verified Only</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a6b3c]"></div>
                  </label>
                </div>

                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-[#1a6b3c] text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-[#1a6b3c]/20"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
