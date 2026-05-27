import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { NIGERIA_STATES_LGAS } from '../../../data/nigeria';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'placeholder'
    ? ''
    : import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const Step3_Location: React.FC<StepProps> = ({ form }) => {
  const { register, watch, setValue, formState: { errors } } = form;
  const selectedState = watch('state');
  const lat = watch('lat');
  const lng = watch('lng');
  const [lgas, setLgas] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (selectedState && NIGERIA_STATES_LGAS[selectedState]) {
      setLgas(NIGERIA_STATES_LGAS[selectedState]);
    } else {
      setLgas([]);
    }
  }, [selectedState]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', pos.coords.latitude);
        setValue('lng', pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
      }
    );
  };

  const handleMapClick = (e: { detail: { latLng: { lat: number; lng: number } | null } }) => {
    if (e.detail.latLng) {
      setValue('lat', e.detail.latLng.lat);
      setValue('lng', e.detail.latLng.lng);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-3.5 bg-white/5 border rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none transition-colors ${
      hasError ? 'border-red-500/40' : 'border-white/10 focus:border-[#1a6b3c]'
    }`;

  const selectClass = (hasError?: boolean) =>
    `w-full px-4 py-3.5 bg-[#0a1f11] border rounded-xl text-[14px] text-white focus:outline-none transition-colors appearance-none cursor-pointer ${
      hasError ? 'border-red-500/40' : 'border-white/10 focus:border-[#1a6b3c]'
    }`;

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
          Step 3 of 6
        </div>
        <h2 className="text-[22px] font-black text-white tracking-tight mb-2">
          Location
        </h2>
        <p className="text-[13px] text-white/45">
          Where is the property located?
        </p>
      </div>

      {/* State + LGA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
            State <span className="text-red-400">*</span>
          </label>
          <select
            {...register('state')}
            className={selectClass(!!errors.state)}
          >
            <option value="" className="bg-[#0a1f11]">Select state</option>
            {Object.keys(NIGERIA_STATES_LGAS).map(state => (
              <option key={state} value={state} className="bg-[#0a1f11]">{state}</option>
            ))}
          </select>
          {errors.state && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
              <AlertCircle className="w-3 h-3" /> {errors.state.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
            LGA <span className="text-red-400">*</span>
          </label>
          <select
            {...register('lga')}
            disabled={!selectedState}
            className={`${selectClass(!!errors.lga)} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <option value="" className="bg-[#0a1f11]">Select LGA</option>
            {lgas.map(lga => (
              <option key={lga} value={lga} className="bg-[#0a1f11]">{lga}</option>
            ))}
          </select>
          {errors.lga && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
              <AlertCircle className="w-3 h-3" /> {errors.lga.message}
            </p>
          )}
        </div>
      </div>

      {/* Street address */}
      <div>
        <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          Street Address <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
          <input
            {...register('address')}
            placeholder="e.g. 123 Admiralty Way, Lekki Phase 1"
            className={`${inputClass(!!errors.address)} pl-11`}
          />
        </div>
        {errors.address && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.address.message}
          </p>
        )}
      </div>

      {/* Map */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">
            Pin on Map <span className="text-white/20 font-normal normal-case">(optional but recommended)</span>
          </label>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#f0c040]/70 hover:text-[#f0c040] transition-colors disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5" />
            {locating ? 'Getting location...' : 'Use my location'}
          </button>
        </div>

        <div className="h-64 rounded-2xl overflow-hidden border border-white/8 bg-[#111a14]">
          {GOOGLE_MAPS_API_KEY ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={{ lat: lat || 9.082, lng: lng || 8.6753 }}
                defaultZoom={6}
                onClick={handleMapClick}
                gestureHandling="greedy"
                disableDefaultUI
              >
                {lat && lng && <Marker position={{ lat, lng }} />}
              </Map>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
              <MapPin className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-[13px] text-white/35 font-medium">Map not available</p>
              <p className="text-[11px] text-white/20 mt-1">Enter coordinates manually below</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual coordinates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            {...register('lat', { valueAsNumber: true })}
            placeholder="e.g. 6.5244"
            className={inputClass()}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            {...register('lng', { valueAsNumber: true })}
            placeholder="e.g. 3.3792"
            className={inputClass()}
          />
        </div>
      </div>

      {lat && lng && (
        <p className="text-[11px] text-[#4ade80] flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          Location pinned: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};