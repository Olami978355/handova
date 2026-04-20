import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Home, MapPin, Bed, Bath, Shield, CheckCircle, ArrowLeft, 
  Share2, Heart, MessageSquare, Calendar, Loader2, AlertCircle,
  Maximize, FileText, Info, Video, Clock, ScrollText, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Property, Profile } from '../types';
import { formatNaira } from '../utils/format';
import { ChatButton } from '../components/chat/ChatButton';
import { InspectionFeeDisplay } from '../components/inspection/InspectionFeeDisplay';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState({ type: 'image', index: 0 });

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, profiles(full_name, avatar_url, role, verification_status)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProperty(data);
      setOwner(data.profiles as any);
    } catch (err: any) {
      console.error('Error fetching property:', err);
      setError(err.message || 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
        <Loader2 className="w-12 h-12 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading property details...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Property not found</h1>
        <p className="text-zinc-500 mb-8 max-w-md">{error || "The property you're looking for doesn't exist or has been removed."}</p>
        <button 
          onClick={() => navigate('/listings')}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors"
        >
          Back to Listings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Navigation Header */}
      <div className="bg-white border-b border-zinc-100 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-zinc-500 font-bold text-sm hover:text-[#1a6b3c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
          <div className="flex items-center space-x-2">
            <button className="p-2 bg-zinc-50 rounded-xl text-zinc-400 hover:text-red-500 transition-colors">
              <Heart className="w-5 h-5" />
            </button>
            <button className="p-2 bg-zinc-50 rounded-xl text-zinc-400 hover:text-[#1a6b3c] transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image/Video Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-[16/9] bg-zinc-200 rounded-[40px] overflow-hidden shadow-2xl">
                {activeMedia.type === 'image' ? (
                  <img 
                    src={property.images[activeMedia.index] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80'} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <video 
                    src={property.videos?.[activeMedia.index]} 
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                  />
                )}
                <div className="absolute top-6 left-6 flex flex-col gap-3">
                  <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl text-xs font-bold text-[#1a6b3c] uppercase tracking-wider shadow-lg">
                    {property.transaction_type === 'rent' ? `Rent / ${property.price_period}` : 'For Sale'}
                  </div>
                  {property.escrow_verified && (
                    <div className="bg-[#1a6b3c] text-white px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center shadow-lg">
                      <Shield className="w-4 h-4 mr-2" fill="currentColor" /> Verified Listing
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {property.images.map((photo, index) => (
                  <button 
                    key={`img-${index}`}
                    onClick={() => setActiveMedia({ type: 'image', index })}
                    className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-4 transition-all ${activeMedia.type === 'image' && activeMedia.index === index ? 'border-[#1a6b3c] scale-95' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
                {property.videos?.map((video, index) => (
                  <button 
                    key={`vid-${index}`}
                    onClick={() => setActiveMedia({ type: 'video', index })}
                    className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-4 transition-all bg-black flex items-center justify-center relative ${activeMedia.type === 'video' && activeMedia.index === index ? 'border-[#1a6b3c] scale-95' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <Video className="text-white" size={24} />
                    <div className="absolute bottom-1 right-1 text-[8px] font-bold text-white uppercase tracking-widest">Video</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-zinc-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">{property.title}</h1>
                  <div className="flex items-center text-zinc-500 font-medium">
                    <MapPin className="w-5 h-5 mr-2 text-[#1a6b3c]" />
                    {property.address}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-[#1a6b3c]">{formatNaira(property.price)}</div>
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mt-1">
                    {property.transaction_type === 'rent' ? `Per ${property.price_period?.replace('ly', '')}` : 'Total Price'}
                  </div>
                </div>
              </div>

              {/* Rental Terms Section */}
              {property.transaction_type === 'rent' && (
                <div className="mb-12 p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center">
                    <ScrollText className="w-5 h-5 mr-2 text-[#1a6b3c]" />
                    Rental Terms
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Tag className="w-5 h-5 text-[#1a6b3c]" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Price & Period</p>
                          <p className="text-sm font-bold text-zinc-700">{formatNaira(property.price)} / {property.price_period}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Clock className="w-5 h-5 text-[#1a6b3c]" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Min. Duration</p>
                          <p className="text-sm font-bold text-zinc-700">{property.min_rental_duration || 'Flexible'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">House Rules</p>
                      <p className="text-sm text-zinc-600 leading-relaxed italic">
                        {property.house_rules || 'No specific house rules mentioned.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {property.listing_type === 'house' ? (
                  <>
                    <div className="bg-zinc-50 p-6 rounded-3xl text-center border border-zinc-100">
                      <Bed className="w-6 h-6 mx-auto mb-2 text-[#1a6b3c]" />
                      <div className="text-xl font-bold text-zinc-900">{property.bedrooms}</div>
                      <div className="text-xs text-zinc-400 font-bold uppercase">Bedrooms</div>
                    </div>
                    <div className="bg-zinc-50 p-6 rounded-3xl text-center border border-zinc-100">
                      <Bath className="w-6 h-6 mx-auto mb-2 text-[#1a6b3c]" />
                      <div className="text-xl font-bold text-zinc-900">{property.bathrooms}</div>
                      <div className="text-xs text-zinc-400 font-bold uppercase">Bathrooms</div>
                    </div>
                  </>
                ) : (
                  <div className="bg-zinc-50 p-6 rounded-3xl text-center border border-zinc-100 col-span-2">
                    <Maximize className="w-6 h-6 mx-auto mb-2 text-[#1a6b3c]" />
                    <div className="text-xl font-bold text-zinc-900">{property.land_size_value} {property.land_size_unit}</div>
                    <div className="text-xs text-zinc-400 font-bold uppercase">Land Size</div>
                  </div>
                )}
                <div className="bg-zinc-50 p-6 rounded-3xl text-center border border-zinc-100">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-[#1a6b3c]" />
                  <div className="text-xl font-bold text-zinc-900 capitalize">{property.category}</div>
                  <div className="text-xs text-zinc-400 font-bold uppercase">Property Type</div>
                </div>
                {property.listing_type === 'land' && (
                  <div className="bg-zinc-50 p-6 rounded-3xl text-center border border-zinc-100">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-[#1a6b3c]" />
                    <div className="text-xl font-bold text-zinc-900 truncate px-2">{property.land_title}</div>
                    <div className="text-xs text-zinc-400 font-bold uppercase">Title</div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-4">Description</h3>
                  <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">{property.description}</p>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-4">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {property.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center text-zinc-600 bg-zinc-50 px-4 py-3 rounded-2xl border border-zinc-100">
                          <CheckCircle className="w-4 h-4 mr-3 text-[#1a6b3c]" />
                          <span className="text-sm font-medium">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            {/* Owner Card */}
            <div className="bg-white rounded-[40px] p-8 shadow-xl border border-zinc-100">
              <h3 className="text-lg font-bold text-zinc-900 mb-6">Listed by</h3>
              <div className="flex items-center mb-8">
                <div className="w-16 h-16 bg-[#1a6b3c]/10 rounded-2xl flex items-center justify-center font-bold text-2xl text-[#1a6b3c] mr-4 overflow-hidden">
                  {owner?.avatar_url ? (
                    <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    owner?.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="font-bold text-zinc-900 text-lg flex items-center">
                    {owner?.full_name}
                    {owner?.verification_status === 'verified' && (
                      <Shield className="w-4 h-4 ml-1.5 text-[#1a6b3c]" fill="currentColor" />
                    )}
                  </div>
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-wider capitalize">{owner?.role}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <ChatButton property={property} />
              </div>
            </div>

            {/* Inspection Booking Card */}
            <InspectionFeeDisplay property={property} />

            {/* Escrow Info */}
            <div className="bg-[#1a6b3c] rounded-[40px] p-8 text-white shadow-xl shadow-[#1a6b3c]/20">
              <div className="flex items-center mb-4">
                <Shield className="w-8 h-8 mr-3" />
                <h3 className="text-xl font-bold">Safe Deal Escrow</h3>
              </div>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Your payment is held securely by Rent Easy and only released to the {owner?.role} after you've inspected and confirmed the property.
              </p>
              <div className="space-y-3">
                <div className="flex items-center text-sm font-bold">
                  <CheckCircle className="w-4 h-4 mr-2 text-[#f0c040]" /> 100% Refundable
                </div>
                <div className="flex items-center text-sm font-bold">
                  <CheckCircle className="w-4 h-4 mr-2 text-[#f0c040]" /> Verified Listings
                </div>
                <div className="flex items-center text-sm font-bold">
                  <CheckCircle className="w-4 h-4 mr-2 text-[#f0c040]" /> No Hidden Fees
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspection Modal removed - handled by InspectionFeeDisplay */}
    </div>
  );
}
