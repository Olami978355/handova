import React from 'react';
import { Link } from 'react-router-dom';
import { Home, MapPin, Bed, Bath, Shield, Layers, Video } from 'lucide-react';
import { Property } from '../types';

const abbreviatePrice = (amount: number) => {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return `₦${amount.toLocaleString()}`;
};

const periodLabel: Record<string, string> = {
  yearly: '/yr', monthly: '/mo', nightly: '/night', outright: ''
};

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const img = property.images?.[0];

  return (
    <Link
      to={`/property/${property.id}`}
      className="group block bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden hover:border-[#f0c040]/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Image */}
      <div className="relative h-44 bg-[#111a14] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-[#f0c040] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">
            {property.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          {property.escrow_verified && (
            <span className="bg-[#1a6b3c] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Verified
            </span>
          )}
        </div>

        {/* Top-right type badge */}
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
              <Video className="w-2.5 h-2.5" />
              {property.videos.length} video{property.videos.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-[14px] font-semibold text-white line-clamp-1 leading-snug mb-1">
          {property.title}
        </h3>
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-white/30 flex-shrink-0" />
          <span className="text-[12px] text-white/40 truncate">{property.lga}, {property.state}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div>
            <span className="text-[17px] font-black text-[#f0c040]">
              {abbreviatePrice(property.price)}
            </span>
            {property.price_period && (
              <span className="text-[11px] text-white/35 ml-1">
                {periodLabel[property.price_period]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-white/35">
            {property.listing_type === 'house' ? (
              <>
                {property.bedrooms && (
                  <span className="flex items-center gap-1">
                    <Bed className="w-3 h-3" />{property.bedrooms}
                  </span>
                )}
                {property.bathrooms && (
                  <span className="flex items-center gap-1">
                    <Bath className="w-3 h-3" />{property.bathrooms}
                  </span>
                )}
              </>
            ) : (
              property.land_size_value && (
                <span>{property.land_size_value} {property.land_size_unit}</span>
              )
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}