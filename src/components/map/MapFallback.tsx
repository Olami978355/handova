import React from 'react';
import { MapPin, AlertCircle } from 'lucide-react';

export const MapFallback: React.FC = () => {
  return (
    <div className="w-full h-full bg-zinc-100 flex flex-col items-center justify-center p-8 text-center rounded-[40px] border-2 border-dashed border-zinc-200">
      <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-6">
        <MapPin className="w-8 h-8 text-gold" />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 mb-2">Interactive Map Unavailable</h3>
      <p className="text-zinc-500 max-w-md mb-6">
        The Google Maps API key is currently set to 'placeholder'. Please configure a valid API key in your environment variables to enable the interactive map view.
      </p>
      <div className="flex items-center text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
        <AlertCircle className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">VITE_GOOGLE_MAPS_API_KEY is missing or invalid</span>
      </div>
    </div>
  );
};
