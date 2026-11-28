import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  ShieldCheck,
  Layers,
  Video,
  Heart,
  Loader2,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { Property, PropertyOffer } from '../types';
import { formatNaira } from '../utils/format';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge } from './VerifiedBadge';

const periodLabel: Record<string, string> = {
  yearly: '/year',
  monthly: '/month',
  nightly: '/night',
  outright: '',
};

interface PropertyCardProps {
  property: Property;
  offer?: PropertyOffer | null;
  showOwnerBadge?: boolean;
  onSaveChange?: (saved: boolean) => void;
  compareMode?: boolean;
  isComparing?: boolean;
  onToggleCompare?: (id: string) => void;
}

export default function PropertyCard({
  property,
  offer = null,
  showOwnerBadge = true,
  onSaveChange,
  compareMode = false,
  isComparing = false,
  onToggleCompare,
}: PropertyCardProps) {
  const { user } = useAuth();
  const img = property.images?.[0];

  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(false);
      return;
    }

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

    return () => {
      cancelled = true;
    };
  }, [user, property.id]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || savePending) return;

    setSavePending(true);

    try {
      if (saved) {
        const { error } = await supabase
          .from('saved_properties')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', property.id);

        if (error) throw error;

        setSaved(false);
        onSaveChange?.(false);
      } else {
        const { error } = await supabase
          .from('saved_properties')
          .insert({
            user_id: user.id,
            property_id: property.id,
          });

        if (error) throw error;

        setSaved(true);
        onSaveChange?.(true);
      }
    } catch (error) {
      console.error('Unable to update saved property:', error);
    } finally {
      setSavePending(false);
    }
  };

  const isRent = property.transaction_type === 'rent';
  const ownerRole = (property as any).owner_role;
  const ownerVerification = (property as any).owner_verification_status;

  return (
    <Link
      to={`/property/${property.id}`}
      onClick={(e) => {
        if (compareMode) {
          e.preventDefault();
          onToggleCompare?.(property.id);
        }
      }}
      className="group block overflow-hidden rounded-xl border border-white/[0.09] bg-[#111419] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.18] hover:shadow-[0_22px_55px_rgba(0,0,0,0.35)]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Property photography */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#191d23]">
        {img ? (
          <img
            src={img}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#171b20]">
            <Home className="h-10 w-10 text-white/15" strokeWidth={1} />
          </div>
        )}

        {/* Image contrast */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />

        {/* Compare control */}
        {compareMode && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCompare?.(property.id);
            }}
            aria-label={isComparing ? 'Remove from compare' : 'Add to compare'}
            aria-pressed={isComparing}
            className={`absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
              isComparing
                ? 'border-gold bg-gold text-ink'
                : 'border-white/50 bg-black/45 text-white backdrop-blur-md hover:border-white hover:bg-black/70'
            }`}
          >
            <Check className="h-4 w-4" />
          </button>
        )}

        {/* Listing status */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          {!compareMode && (
            <span
              className={`rounded-sm px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] ${
                isRent
                  ? 'bg-white text-[#15171a]'
                  : 'bg-gold text-[#15171a]'
              }`}
            >
              {isRent ? 'For rent' : 'For sale'}
            </span>
          )}

          {property.escrow_verified && (
            <span className="flex items-center gap-1 rounded-sm border border-white/25 bg-black/45 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-md">
              <ShieldCheck className="h-3 w-3 text-gold" />
              Verified
            </span>
          )}
        </div>

        {/* Save property */}
        {user && (
          <button
            type="button"
            onClick={toggleSave}
            disabled={savePending}
            aria-label={saved ? 'Remove from saved properties' : 'Save this property'}
            aria-pressed={saved}
            className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 backdrop-blur-md transition-all ${
              saved
                ? 'bg-white text-[#17191d]'
                : 'bg-black/40 text-white hover:bg-white hover:text-[#17191d]'
            }`}
          >
            {savePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
            )}
          </button>
        )}

        {/* Owner identity */}
        {showOwnerBadge && ownerRole && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] font-medium capitalize text-white/90">
            <span>{ownerRole}</span>
            <VerifiedBadge status={ownerVerification} size={12} />
          </div>
        )}

        {/* Listing type and video indicator */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {property.videos && property.videos.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-sm bg-black/45 px-2 py-1.5 text-[10px] font-medium text-white backdrop-blur-md">
              <Video className="h-3 w-3" />
              {property.videos.length} video{property.videos.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Property information */}
      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">
            <Layers className="h-3 w-3" />
            {property.listing_type}
          </span>

          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/30">
            {isRent ? 'Rental property' : 'Property sale'}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-1 font-serif text-[21px] font-medium leading-tight tracking-[-0.025em] text-white transition-colors group-hover:text-gold">
          {property.title}
        </h3>

        <div className="mb-5 flex min-w-0 items-center gap-1.5 text-[11px] text-white/45">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gold/70" />
          <span className="truncate">
            {property.lga}, {property.state}
          </span>
        </div>

        <div className="border-t border-white/[0.09] pt-4">
          <div className="flex items-center justify-between gap-3">
            {/* Price */}
            <div className="min-w-0 flex-1">
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {isRent ? 'Rental price' : 'Asking price'}
              </span>

              {offer?.offer_type === 'price_reduction' && offer.offer_price != null ? (
                <>
                  <span className="mb-1 inline-flex rounded-sm bg-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">Special offer</span>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[19px] font-semibold tracking-[-0.04em] text-gold tabular-nums sm:text-[21px]">
                      {formatNaira(Number(offer.offer_price))}
                    </span>
                    <span className="text-[10px] text-white/35 line-through">{formatNaira(property.price)}</span>
                    {property.price_period && periodLabel[property.price_period] && (
                      <span className="text-[10px] font-medium text-white/40">{periodLabel[property.price_period]}</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {offer && <span className="mb-1 inline-flex rounded-sm bg-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">Special offer</span>}
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="text-[19px] font-semibold tracking-[-0.04em] text-white tabular-nums sm:text-[21px]">
                      {formatNaira(property.price)}
                    </span>
                    {property.price_period && periodLabel[property.price_period] && (
                      <span className="text-[10px] font-medium text-white/40">{periodLabel[property.price_period]}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55 transition-all group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>

          {/* Property specifications */}
          {(property.listing_type === 'house'
            ? !!(property.bedrooms || property.bathrooms)
            : !!property.land_size_value) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3 text-[11px] text-white/50">
              {property.listing_type === 'house' ? (
                <>
                  {property.bedrooms != null && property.bedrooms > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Bed className="h-3.5 w-3.5 text-white/35" />
                      {property.bedrooms} beds
                    </span>
                  )}
                  {property.bathrooms != null && property.bathrooms > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Bath className="h-3.5 w-3.5 text-white/35" />
                      {property.bathrooms} baths
                    </span>
                  )}
                </>
              ) : (
                <span className="whitespace-nowrap">
                  {property.land_size_value} {property.land_size_unit}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
