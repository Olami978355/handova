import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import {
  MapPin,
  Home,
  Map as LandIcon,
  Shield,
  AlertCircle,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  BedDouble,
  Bath,
  Ruler,
  Wallet,
} from 'lucide-react';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);

export const Step6_Review: React.FC<StepProps> = ({ form }) => {
  const { watch } = form;
  const v = watch();

  const isHouse = v.listing_type === 'house';
  const isRental = v.transaction_type === 'rent';

  const getPeriodLabel = () => {
    if (!isRental) return 'Outright price';

    const periods: Record<string, string> = {
      yearly: 'per year',
      monthly: 'per month',
      nightly: 'per night',
    };

    return v.price_period ? periods[v.price_period] || '' : '';
  };

  const Row = ({
    label,
    value,
  }: {
    label: string;
    value?: string | number;
  }) => (
    <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] py-3 last:border-0">
      <span className="shrink-0 text-[11px] text-paper/40">{label}</span>
      <span className="max-w-[65%] text-right text-[12px] font-medium leading-5 text-paper/85">
        {value !== undefined && value !== null && value !== ''
          ? value
          : 'Not provided'}
      </span>
    </div>
  );

  const location = [v.address, v.lga, v.state]
    .filter(Boolean)
    .join(', ');

  const photos = v.images || [];
  const videos = v.videos || [];

  return (
    <div
      className="space-y-8"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-px w-7 bg-gold" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
            Final step · 06
          </span>
        </div>

        <h2 className="font-serif text-[30px] font-medium leading-tight tracking-tight text-paper sm:text-[34px]">
          One last look.
        </h2>

        <p className="max-w-lg text-[13px] leading-6 text-paper/50">
          Review the details below before publishing your listing. Make sure
          the information and uploaded documents are accurate.
        </p>
      </header>

      {/* Listing overview */}
      <section className="overflow-hidden border border-white/10 bg-white/[0.025]">
        <div className="relative">
          {photos.length > 0 ? (
            <div className="relative aspect-[16/8] overflow-hidden bg-black">
              <img
                src={photos[0]}
                alt="Listing cover"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="inline-flex items-center gap-1.5 border border-white/20 bg-black/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-white/85 backdrop-blur-sm">
                  <CheckCircle2 size={11} className="text-gold" />
                  Cover photograph
                </span>
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/6] items-center justify-center border-b border-white/10 bg-white/[0.025]">
              {isHouse ? (
                <Home size={35} className="text-paper/20" />
              ) : (
                <LandIcon size={35} className="text-paper/20" />
              )}
            </div>
          )}
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gold">
                  {isHouse ? 'Property' : 'Land'}
                </span>
                <span className="h-1 w-1 rounded-full bg-paper/25" />
                <span className="text-[10px] text-paper/40">
                  {isRental ? 'For rent' : 'For sale'}
                </span>
              </div>

              <h3 className="font-serif text-[23px] font-medium leading-tight text-paper">
                {v.title || 'Untitled listing'}
              </h3>

              <p className="mt-2 text-[11px] text-paper/45">
                {v.category || 'Category not selected'}
              </p>
            </div>

            <div className="shrink-0 sm:text-right">
              <p className="font-serif text-[23px] font-medium tabular-nums text-gold">
                {v.price ? formatNaira(Number(v.price)) : 'Not set'}
              </p>
              <p className="mt-1 text-[10px] text-paper/40">
                {getPeriodLabel()}
              </p>
            </div>
          </div>

          {location && (
            <div className="flex items-start gap-2 border-t border-white/[0.07] pt-4">
              <MapPin size={15} className="mt-0.5 shrink-0 text-gold" />
              <p className="text-[11px] leading-5 text-paper/60">
                {location}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Property information */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/70">
            Property information
          </h3>
          <span className="text-[9px] uppercase tracking-wider text-paper/30">
            Listing details
          </span>
        </div>

        <div className="border-y border-white/10 px-4">
          {isHouse ? (
            <>
              <Row label="Property type" value={v.category} />
              <Row label="Bedrooms" value={v.bedrooms} />
              <Row label="Bathrooms" value={v.bathrooms} />
              {v.min_rental_duration && (
                <Row label="Minimum rental duration" value={v.min_rental_duration} />
              )}
              {v.house_rules && (
                <Row
                  label="House rules"
                  value={
                    v.house_rules.length > 100
                      ? `${v.house_rules.substring(0, 100)}...`
                      : v.house_rules
                  }
                />
              )}
            </>
          ) : (
            <>
              <Row label="Land type" value={v.category} />
              <Row
                label="Land size"
                value={
                  v.land_size_value
                    ? `${v.land_size_value} ${v.land_size_unit || ''}`.trim()
                    : undefined
                }
              />
              <Row label="Land title" value={v.land_title} />
            </>
          )}

          <Row label="Transaction" value={isRental ? 'Rent' : 'Sale'} />
        </div>
      </section>

      {/* Description */}
      {v.description && (
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-paper/70">
            Description
          </h3>
          <div className="border-l-2 border-gold/50 bg-white/[0.025] px-4 py-4">
            <p className="whitespace-pre-wrap text-[12px] leading-6 text-paper/65">
              {v.description}
            </p>
          </div>
        </section>
      )}

      {/* Amenities */}
      {v.amenities && v.amenities.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-paper/70">
            Amenities and features
            <span className="ml-2 font-normal text-paper/35">
              {v.amenities.length}
            </span>
          </h3>

          <div className="flex flex-wrap gap-2">
            {v.amenities.map((amenity) => (
              <span
                key={amenity}
                className="border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] text-paper/65"
              >
                {amenity}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Media */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/70">
            Listing media
          </h3>
          <span className="text-[10px] tabular-nums text-paper/40">
            {photos.length} photos · {videos.length} videos
          </span>
        </div>

        <div className="border border-white/10 bg-white/[0.02] p-4">
          {photos.length > 0 || videos.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((url, i) => (
                <div
                  key={i}
                  className="relative h-[76px] w-[76px] shrink-0 overflow-hidden border border-white/10"
                >
                  <img
                    src={url}
                    alt={`Property photograph ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/75 py-1 text-center text-[8px] font-bold uppercase tracking-wider text-gold">
                      Cover
                    </span>
                  )}
                </div>
              ))}

              {videos.map((_, i) => (
                <div
                  key={`video-${i}`}
                  className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-2 border border-white/10 bg-white/[0.035]"
                >
                  <Video size={19} className="text-gold" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-paper/40">
                    Video {i + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2 text-paper/35">
              <ImageIcon size={19} />
              <p className="text-[11px]">No media uploaded yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Survey plan */}
      {!isHouse && (
        <section>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-paper/70">
            Land documentation
          </h3>

          <div className="flex items-center gap-3 border border-white/10 bg-white/[0.025] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/[0.05]">
              <FileText size={18} className="text-paper/50" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-paper/75">
                Survey plan
              </p>
              <p className="mt-1 text-[10px] text-paper/40">
                {v.survey_plan_url
                  ? 'Document uploaded'
                  : 'No survey plan attached'}
              </p>
            </div>

            {v.survey_plan_url && (
              <a
                href={v.survey_plan_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-gold hover:underline"
              >
                View
              </a>
            )}
          </div>
        </section>
      )}

      {/* Pricing summary */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Wallet size={15} className="text-gold" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/70">
            Pricing information
          </h3>
        </div>

        <div className="border border-white/10 bg-white/[0.025] px-4">
          <Row
            label={isRental ? 'Rental amount' : 'Asking price'}
            value={
              v.price
                ? `${formatNaira(Number(v.price))} ${getPeriodLabel()}`
                : undefined
            }
          />

          {Number(v.caution_fee) > 0 && (
            <Row
              label="Caution fee"
              value={formatNaira(Number(v.caution_fee))}
            />
          )}
        </div>

        <p className="mt-2 text-[10px] leading-5 text-paper/35">
          Applicable Handova fees and payment details will be presented to
          the customer during checkout.
        </p>
      </section>

      {/* Verification notice */}
      <section className="flex items-start gap-3 border border-gold/20 bg-gold/[0.045] p-4">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-gold" />
        <div>
          <p className="text-[11px] font-bold text-gold">
            Verification notice
          </p>
          <p className="mt-1.5 text-[10px] leading-5 text-paper/50">
            {isHouse
              ? 'Verified accounts go live immediately. Unverified listings wait for moderator review (2–4 hours).'
              : 'Land listings require moderator review regardless of verification status.'}
          </p>
        </div>
      </section>

      {/* Transaction protection */}
      <section className="flex items-start gap-3 border border-white/10 bg-white/[0.025] p-4">
        <Shield size={17} className="mt-0.5 shrink-0 text-gold" />
        <div>
          <p className="text-[11px] font-bold text-paper/85">
            Handova transaction protection
          </p>
          <p className="mt-1.5 text-[10px] leading-5 text-paper/45">
            Transactions arranged through Handova follow the applicable
            protected payment process. For rentals, the tenant confirms
            key handover and move-in before funds are released.
          </p>
        </div>
      </section>
    </div>
  );
};
