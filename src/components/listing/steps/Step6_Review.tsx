import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import {
  MapPin, Home, Map as LandIcon, Shield,
  CheckCircle, AlertCircle, Video, Image as ImageIcon
} from 'lucide-react';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

export const Step6_Review: React.FC<StepProps> = ({ form }) => {
  const { watch } = form;
  const v = watch();

  const getPeriodLabel = () => {
    if (v.transaction_type === 'sell') return 'Outright price';
    const map: Record<string, string> = {
      yearly: '/ year', monthly: '/ month', nightly: '/ night'
    };
    return v.price_period ? map[v.price_period] || '' : '';
  };

  const Row = ({ label, value }: { label: string; value?: string | number }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-[12px] text-white/40 flex-shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-white text-right">{value || '—'}</span>
    </div>
  );

  return (
    <div
      className="space-y-5"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
          Step 6 of 6
        </div>
        <h2 className="text-[22px] font-black text-white tracking-tight mb-2">
          Review & Submit
        </h2>
        <p className="text-[13px] text-white/45">
          Double-check your listing before submitting
        </p>
      </div>

      {/* Main info */}
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-[#1a6b3c]/20 rounded-xl flex items-center justify-center flex-shrink-0">
              {v.listing_type === 'house'
                ? <Home className="w-5 h-5 text-[#1a6b3c]" />
                : <LandIcon className="w-5 h-5 text-[#1a6b3c]" />
              }
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-white truncate">{v.title || 'Untitled listing'}</h3>
              <p className="text-[12px] text-white/40">
                {v.category} · {v.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[20px] font-black text-[#f0c040]">
              {v.price ? formatNaira(v.price) : '—'}
            </div>
            <p className="text-[11px] text-white/35">{getPeriodLabel()}</p>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-0">
          <Row label="Location" value={[v.address, v.lga, v.state].filter(Boolean).join(', ')} />
          {v.listing_type === 'house' ? (
            <>
              <Row label="Bedrooms" value={v.bedrooms} />
              <Row label="Bathrooms" value={v.bathrooms} />
            </>
          ) : (
            <>
              <Row label="Land Size" value={v.land_size_value ? `${v.land_size_value} ${v.land_size_unit}` : undefined} />
              <Row label="Land Title" value={v.land_title} />
            </>
          )}
          {v.min_rental_duration && (
            <Row label="Min Duration" value={v.min_rental_duration} />
          )}
          {v.house_rules && (
            <Row label="House Rules" value={v.house_rules.substring(0, 60) + (v.house_rules.length > 60 ? '...' : '')} />
          )}
        </div>
      </div>

      {/* Amenities */}
      {v.amenities && v.amenities.length > 0 && (
        <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
          <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            Amenities ({v.amenities.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {v.amenities.map(a => (
              <span
                key={a}
                className="px-2.5 py-1 bg-[#1a6b3c]/15 border border-[#1a6b3c]/20 rounded-lg text-[11px] text-[#4ade80] font-medium"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Media preview */}
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
        <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">
          Media — {v.images?.length || 0} photo{(v.images?.length || 0) !== 1 ? 's' : ''}
          {v.videos?.length ? ` · ${v.videos.length} video${v.videos.length > 1 ? 's' : ''}` : ''}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {v.images?.map((url, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/8"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {v.videos?.map((_, i) => (
            <div
              key={`v-${i}`}
              className="w-16 h-16 rounded-xl flex-shrink-0 bg-black border border-white/8 flex flex-col items-center justify-center gap-1"
            >
              <Video className="w-5 h-5 text-white/40" />
              <span className="text-[8px] text-white/25 font-bold uppercase">Video</span>
            </div>
          ))}
          {(!v.images || v.images.length === 0) && (
            <div className="flex items-center gap-2 text-white/25">
              <ImageIcon className="w-5 h-5" />
              <span className="text-[12px]">No photos uploaded yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Notices */}
      <div className="flex items-start gap-3 p-4 bg-[#f0c040]/5 border border-[#f0c040]/15 rounded-xl">
        <AlertCircle className="w-4 h-4 text-[#f0c040] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-[#f0c040] mb-0.5">Verification notice</p>
          <p className="text-[11px] text-white/45 leading-relaxed">
            {v.listing_type === 'house'
              ? 'Verified accounts go live immediately. Unverified listings wait for moderator review (2-4 hours).'
              : 'Land listings require moderator review regardless of verification status.'
            }
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-[#1a6b3c]/10 border border-[#1a6b3c]/20 rounded-xl">
        <Shield className="w-4 h-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-[#4ade80] mb-0.5">Escrow enabled</p>
          <p className="text-[11px] text-white/45 leading-relaxed">
            By submitting this listing you agree to use the Rent Easy escrow system for all transactions. You receive funds after move-in is confirmed.
          </p>
        </div>
      </div>
    </div>
  );
};
