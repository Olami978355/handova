import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { NIGERIA_STATES_LGAS } from '../../../data/nigeria';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
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
  const { register, watch, setValue, formState: { errors } } = form;
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
      setLocationError('Your device does not support location services. Please pin your location on the map instead.');
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
        setLocationError('We could not access your location. Please pin it on the map instead, or make sure location access is allowed for this site.');
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
    `w-full px-4 py-3.5 bg-white/5 border rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none transition-colors ${
      hasError ? 'border-danger/40' : 'border-white/10 focus:border-gold'
    }`;

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="text-center">
        <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-2">
          Step 3 of 6
        </div>
        <h2 className="font-serif text-[24px] font-semibold text-paper tracking-tight mb-2">
          Location
        </h2>
        <p className="text-[13px] text-paper/45">
          Where is the property located?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
            State <span className="text-danger">*</span>
          </label>
          <Select
            value={selectedState}
            onChange={(v) => setValue('state', v, { shouldValidate: true })}
            placeholder="Select state"
            hasError={!!errors.state}
            options={Object.keys(NIGERIA_STATES_LGAS).map(state => ({ value: state, label: state }))}
          />
          {errors.state && (
            <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
              <AlertCircle className="w-3 h-3" /> {errors.state.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
            LGA <span className="text-danger">*</span>
          </label>
          <Select
            value={selectedLga}
            onChange={(v) => setValue('lga', v, { shouldValidate: true })}
            placeholder="Select LGA"
            disabled={!selectedState}
            hasError={!!errors.lga}
            options={lgas.map(lga => ({ value: lga, label: lga }))}
          />
          {errors.lga && (
            <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
              <AlertCircle className="w-3 h-3" /> {errors.lga.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
          Street Address <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25 pointer-events-none" />
          <input
            {...register('address')}
            placeholder="e.g. 123 Admiralty Way, Lekki Phase 1"
            className={`${inputClass(!!errors.address)} pl-11`}
          />
        </div>
        {errors.address && (
          <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.address.message}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[12px] font-semibold text-paper/40 uppercase tracking-wider">
            Pin on Map <span className="text-paper/20 font-normal normal-case">(optional but recommended)</span>
          </label>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-gold/70 hover:text-gold transition-colors disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5" />
            {locating ? 'Getting location...' : 'Use my location'}
          </button>
        </div>

        {locationError && (
          <p className="flex items-center gap-1.5 text-[12px] text-danger mb-3">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {locationError}
          </p>
        )}

        <div className="h-64 rounded-2xl overflow-hidden border border-white/8 bg-slate/20">
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
              <MapPin className="w-10 h-10 text-paper/10 mb-3" />
              <p className="text-[13px] text-paper/35 font-medium">Map is temporarily unavailable</p>
              <p className="text-[11px] text-paper/20 mt-1">Use the "Use my location" button above instead</p>
            </div>
          )}
        </div>
      </div>

      {lat && lng && (
        <p className="text-[11px] text-gold flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          Location pinned
        </p>
      )}
    </div>
  );
};
