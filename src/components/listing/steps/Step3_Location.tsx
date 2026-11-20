import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { NIGERIA_STATES_LGAS } from '../../../data/nigeria';
import {
  MapPin,
  Navigation,
  AlertCircle,
  Check,
  MapPinned,
  LocateFixed,
} from 'lucide-react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Select } from '../../ui/Select';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'placeholder'
    ? ''
    : import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const Step3_Location: React.FC<StepProps> = ({ form }) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const selectedState = watch('state') || '';
  const selectedLga = watch('lga') || '';
  const lat = watch('lat');
  const lng = watch('lng');

  const [lgas, setLgas] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedState && NIGERIA_STATES_LGAS[selectedState]) {
      setLgas(NIGERIA_STATES_LGAS[selectedState]);
    } else {
      setLgas([]);
    }
  }, [selectedState]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        'Your device does not support location services. Please pin your location on the map instead.'
      );
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', pos.coords.latitude);
        setValue('lng', pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError(
          'We could not access your location. Please pin it on the map instead, or make sure location access is allowed for this site.'
        );
      }
    );
  };

  const handleMapClick = (e: {
    detail: { latLng: { lat: number; lng: number } | null };
  }) => {
    if (e.detail.latLng) {
      setValue('lat', e.detail.latLng.lat);
      setValue('lng', e.detail.latLng.lng);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full min-h-[48px] px-4 py-3 bg-white/[0.04] border text-[13px] text-paper placeholder:text-paper/25 outline-none transition-all duration-200 ${
      hasError
        ? 'border-danger/60 focus:border-danger'
        : 'border-white/10 focus:border-gold/60 hover:border-white/20'
    }`;

  const labelClass =
    'block text-[10px] font-bold tracking-[0.15em] uppercase text-paper/55 mb-2.5';

  return (
    <div
      className="space-y-9"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-px w-7 bg-gold" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold">
            Listing details · 03
          </span>
        </div>

        <h2 className="font-serif text-[30px] sm:text-[34px] font-medium leading-tight tracking-tight text-paper">
          Where is it located?
        </h2>

        <p className="max-w-lg text-[13px] leading-6 text-paper/50">
          Add the property's location so prospective tenants and buyers know
          exactly where to find it.
        </p>
      </header>

      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <MapPin size={16} className="text-gold" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/75">
            Address information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              State <span className="text-danger">*</span>
            </label>

            <Select
              value={selectedState}
              onChange={(v) =>
                setValue('state', v, { shouldValidate: true })
              }
              placeholder="Select state"
              hasError={!!errors.state}
              options={Object.keys(NIGERIA_STATES_LGAS).map((state) => ({
                value: state,
                label: state,
              }))}
            />

            {errors.state && (
              <p className="flex items-center gap-1.5 text-[11px] text-danger mt-2">
                <AlertCircle size={12} />
                {errors.state.message}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Local Government Area <span className="text-danger">*</span>
            </label>

            <Select
              value={selectedLga}
              onChange={(v) =>
                setValue('lga', v, { shouldValidate: true })
              }
              placeholder="Select LGA"
              disabled={!selectedState}
              hasError={!!errors.lga}
              options={lgas.map((lga) => ({
                value: lga,
                label: lga,
              }))}
            />

            {errors.lga && (
              <p className="flex items-center gap-1.5 text-[11px] text-danger mt-2">
                <AlertCircle size={12} />
                {errors.lga.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Street address <span className="text-danger">*</span>
          </label>

          <div className="relative">
            <MapPin
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/30 pointer-events-none"
            />
            <input
              {...register('address')}
              placeholder="e.g. 123 Admiralty Way, Lekki Phase 1"
              className={`${inputClass(!!errors.address)} pl-11`}
            />
          </div>

          {errors.address && (
            <p className="flex items-center gap-1.5 text-[11px] text-danger mt-2">
              <AlertCircle size={12} />
              {errors.address.message}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <MapPinned size={17} className="text-gold" />
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/75">
                Pin property on map
              </h3>
              <p className="mt-1 text-[11px] text-paper/35">
                Optional, but recommended for accurate directions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="inline-flex items-center justify-center gap-2 border border-gold/30 px-4 py-2.5 text-[11px] font-semibold text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
          >
            {locating ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
            ) : (
              <Navigation size={14} />
            )}
            {locating ? 'Getting location...' : 'Use my location'}
          </button>
        </div>

        {locationError && (
          <div className="flex items-start gap-2 border border-danger/30 bg-danger/5 p-3 text-[11px] leading-5 text-danger">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {locationError}
          </div>
        )}

        <div className="relative h-[280px] sm:h-[340px] overflow-hidden border border-white/10 bg-[#15191E]">
          {GOOGLE_MAPS_API_KEY ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={{
                  lat: lat || 9.082,
                  lng: lng || 8.6753,
                }}
                defaultZoom={6}
                onClick={handleMapClick}
                gestureHandling="greedy"
                disableDefaultUI
              >
                {lat && lng && <Marker position={{ lat, lng }} />}
              </Map>
            </APIProvider>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center border border-white/10 bg-white/[0.04]">
                <MapPin size={25} className="text-paper/25" />
              </div>
              <p className="mt-4 text-[13px] font-semibold text-paper/55">
                Map temporarily unavailable
              </p>
              <p className="mt-2 max-w-xs text-[11px] leading-5 text-paper/30">
                You can still use your device's location service if available.
                Your address details can also be entered above.
              </p>
            </div>
          )}
        </div>

        {lat && lng ? (
          <div className="flex items-center gap-2 border border-gold/25 bg-gold/[0.06] px-4 py-3">
            <Check size={15} className="text-gold" />
            <span className="text-[11px] font-semibold text-gold">
              Property location pinned successfully
            </span>
            <span className="ml-auto text-[10px] tabular-nums text-paper/35">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-[11px] leading-5 text-paper/35">
            <LocateFixed size={14} className="mt-0.5 shrink-0" />
            Click directly on the map to place a pin, or use your current
            location.
          </div>
        )}
      </section>
    </div>
  );
};
