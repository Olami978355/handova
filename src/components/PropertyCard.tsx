import React from 'react';
import { Link } from 'react-router-dom';
import { Home, MapPin, Bed, Bath, Shield, CheckCircle, ArrowRight, Video } from 'lucide-react';
import { Property } from '../types';
import { formatNaira } from '../utils/format';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-zinc-100 hover:shadow-xl transition-all group">
      <Link to={`/property/${property.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img 
          src={property.images[0] || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80'} 
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-[#1a6b3c] uppercase tracking-wider shadow-sm">
            {property.transaction_type === 'rent' ? `Rent / ${property.price_period}` : 'For Sale'}
          </div>
          {property.escrow_verified && (
            <div className="bg-[#1a6b3c] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm">
              <Shield className="w-3 h-3 mr-1" fill="currentColor" /> Verified
            </div>
          )}
          {property.videos && property.videos.length > 0 && (
            <div className="bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center shadow-sm">
              <Video className="w-3 h-3 mr-1" /> {property.videos.length}
            </div>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg">
            <div className="text-lg font-bold text-zinc-900">{formatNaira(property.price)}</div>
            <div className="text-xs text-zinc-500 font-medium truncate">{property.title}</div>
          </div>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-center text-zinc-500 text-xs mb-4">
          <MapPin className="w-3.5 h-3.5 mr-1 text-[#1a6b3c]" />
          <span className="truncate">{property.address}</span>
        </div>

        <div className="flex items-center justify-between py-4 border-y border-zinc-50">
          {property.listing_type === 'house' ? (
            <>
              <div className="flex items-center">
                <Bed className="w-4 h-4 mr-1.5 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-700">{property.bedrooms} Bed</span>
              </div>
              <div className="flex items-center">
                <Bath className="w-4 h-4 mr-1.5 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-700">{property.bathrooms} Bath</span>
              </div>
            </>
          ) : (
            <div className="flex items-center">
              <Home className="w-4 h-4 mr-1.5 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-700">{property.land_size_value} {property.land_size_unit}</span>
            </div>
          )}
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-1.5 text-[#1a6b3c]" />
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-tighter">{property.category}</span>
          </div>
        </div>

        <Link 
          to={`/property/${property.id}`}
          className="mt-4 w-full flex items-center justify-center space-x-2 text-sm font-bold text-[#1a6b3c] hover:text-[#14522e] transition-colors group/btn"
        >
          <span>View Details</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
