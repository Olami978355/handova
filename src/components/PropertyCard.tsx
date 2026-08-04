import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, MapPin, Bed, Bath, Shield, Layers, Video, Heart, Loader2 } from 'lucide-react';
import { Property } from '../types';
import { formatNaira } from '../utils/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from './VerifiedBadge';

const periodLabel: Record<string, string> = {
  yearly: '/yr', monthly: '/mo', nightly: '/night', outright: ''
};

interface PropertyCardProps {
  property: Property;
  showOwnerBadge?: boolean;
  onSaveChange?: (saved: boolean) => void;
}

export default function PropertyCard({ property, showOwnerBadge = true, onSaveChange }: PropertyCardProps) {
  const { user } = useAuth();
  const img = property.images?.[0];
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', property.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSaved(!!data);
      });
    return () => { cancelled = true; };
  }, [user, property.id]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || savePending) return;
    setSavePending(true);
    try {
      if (saved) {
        await supabase.from('saved_properties').delete().eq('user_id', user.id).eq('property_id', property.id);
        setSaved(false);
        onSaveChange?.(false);
      } else {
        await supabase.from('saved_properties').insert({ user_id: user.id, property_id: property.id });
        setSaved(true);
        onSaveChange?.(true);
      }
    } finally {
      setSavePending(false);
    }
  };

  return (
    <Link
      to={`/property/${property.id}`}
      className="group block bg-slate/25 border border-white/6 rounded-2xl overflow-hidden hover:border-gold/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="relative h-44 bg-ink overflow-hidden">
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
            <Home className="w-10 h-10 text-paper/10" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="bg-gold text-ink text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">
            {property.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          {property.escrow_verified && (
            <span className="bg-gold/20 border border-gold/30 text-gold text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Verified
            </span>
          )}
          {showOwnerBadge && (property as any).owner_role && (
            <span className="bg-ink/70 backdrop-blur-sm text-paper/80 text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize flex items-center gap-1">
              {(property as any).owner_role}
              <VerifiedBadge status={(property as any).owner_verification_status} size={11} />
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="bg-ink/60 backdrop-blur-sm text-paper/70 text-[10px] font-medium px-2 py-1 rounded-lg capitalize flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" />
            {property.listing_type}
          </span>
          {user && (
            <button
              type="button"
              onClick={toggleSave}
              disabled={savePending}
              aria-label={saved ? 'Remove from saved properties' : 'Save this property'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm transition-colors ${
                saved ? 'bg-gold/25 text-gold' : 'bg-ink/60 text-paper/60 hover:text-paper'
              }`}
            >
              {savePending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
              }
            </button>
          )}
        </div>

        {property.videos && property.videos.length > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-ink/60 backdrop-blur-sm text-paper text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1">
              <Video className="w-2.5 h-2.5" />
              {property.videos.length} video{property.videos.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-[14px] font-semibold text-paper line-clamp-1 leading-snug mb-1">
          {property.title}
        </h3>
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 text-paper/30 flex-shrink-0" />
          <span className="text-[12px] text-paper/40 truncate">{property.lga}, {property.state}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div>
            <span className="text-[17px] font-black text-gold tabular-nums">
              {formatNaira(property.price)}
            </span>
            {property.price_period && (
              <span className="text-[11px] text-paper/35 ml-1">
                {periodLabel[property.price_period]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-paper/35">
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
