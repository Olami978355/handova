import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { NIGERIA_STATES_LGAS } from '../../../data/nigeria';
import { MapPin, Navigation } from 'lucide-react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'placeholder' ? '' : import.meta.env.VITE_GOOGLE_MAPS_API_KEY) || '';

export const Step3_Location: React.FC<StepProps> = ({ form }) => {
  const { register, watch, setValue, formState: { errors } } = form;
  const selectedState = watch('state');
  const lat = watch('lat');
  const lng = watch('lng');
  const [lgas, setLgas] = useState<string[]>([]);

  useEffect(() => {
    if (selectedState && NIGERIA_STATES_LGAS[selectedState]) {
      setLgas(NIGERIA_STATES_LGAS[selectedState]);
    } else {
      setLgas([]);
    }
  }, [selectedState]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('lat', position.coords.latitude);
          setValue('lng', position.coords.longitude);
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Could not get your current location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleMapClick = (e: { detail: { latLng: { lat: number; lng: number } | null } }) => {
    if (e.detail.latLng) {
      setValue('lat', e.detail.latLng.lat);
      setValue('lng', e.detail.latLng.lng);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Location</h2>
        <p className="text-gray-500 mt-2">Where is the property located?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select
            {...register('state')}
            className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c] outline-none ${
              errors.state ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
          >
            <option value="">Select State</option>
            {Object.keys(NIGERIA_STATES_LGAS).map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
          <select
            {...register('lga')}
            disabled={!selectedState}
            className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c] outline-none ${
              errors.lga ? 'border-red-500 bg-red-50' : 'border-gray-200'
            } disabled:bg-gray-50 disabled:text-gray-400`}
          >
            <option value="">Select LGA</option>
            {lgas.map(lga => (
              <option key={lga} value={lga}>{lga}</option>
            ))}
          </select>
          {errors.lga && <p className="text-xs text-red-500 mt-1">{errors.lga.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            {...register('address')}
            placeholder="e.g. 123 Admiralty Way, Lekki Phase 1"
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c] outline-none ${
              errors.address ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
          />
        </div>
        {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">Pin Location on Map</label>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1a6b3c] hover:underline"
          >
            <Navigation size={14} />
            Use my current location
          </button>
        </div>
        
        <div className="h-[300px] rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50 mb-4">
          {GOOGLE_MAPS_API_KEY ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={{ lat: lat || 9.082, lng: lng || 8.6753 }}
                defaultZoom={6}
                onClick={handleMapClick}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
              >
                {lat && lng && <Marker position={{ lat, lng }} />}
              </Map>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <MapPin size={48} className="mb-2 opacity-20" />
              <p className="text-sm">Google Maps API key not configured.</p>
              <p className="text-xs mt-1">Please enter coordinates manually below.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              {...register('lat', { valueAsNumber: true })}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
              placeholder="9.0820"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              {...register('lng', { valueAsNumber: true })}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
              placeholder="8.6753"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 italic mt-2">
          {lat && lng 
            ? `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}` 
            : 'Click on the map or enter coordinates manually for exact location'}
        </p>
      </div>
    </div>
  );
};
