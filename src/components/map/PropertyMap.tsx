import React, { useState } from 'react';
import { APIProvider, Map, InfoWindow } from '@vis.gl/react-google-maps';
import { usePropertyMap } from '../../hooks/usePropertyMap';
import { MapMarker } from './MapMarker';
import { PropertyPopup } from './PropertyPopup';
import { MapFallback } from './MapFallback';
import { Property } from '../../types';
import { Loader2 } from 'lucide-react';

interface PropertyMapProps {
  properties: Property[];
  loading?: boolean;
  error?: string | null;
  onPropertySelect?: (property: Property | null) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const IS_PLACEHOLDER = GOOGLE_MAPS_API_KEY === 'placeholder' || !GOOGLE_MAPS_API_KEY;

export const PropertyMap: React.FC<PropertyMapProps> = ({ 
  properties, 
  loading, 
  error, 
  onPropertySelect 
}) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const handleMarkerClick = (property: Property) => {
    setSelectedProperty(property);
    onPropertySelect?.(property);
  };

  const handleInfoWindowClose = () => {
    setSelectedProperty(null);
    onPropertySelect?.(null);
  };

  if (IS_PLACEHOLDER) {
    return <MapFallback />;
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-zinc-50 flex flex-col items-center justify-center rounded-[40px] border border-zinc-100">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading property map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center p-8 text-center rounded-[40px] border border-red-100">
        <p className="text-red-500 font-bold mb-2">Error loading properties</p>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="w-full h-full relative rounded-[40px] overflow-hidden border border-zinc-100 shadow-xl">
        <Map
          defaultCenter={{ lat: 9.082, lng: 8.6753 }} // Center of Nigeria
          defaultZoom={6}
          mapId="RENT_EASY_MAP"
          gestureHandling={'greedy'}
          disableDefaultUI={true}
        >
          {properties.map((property) => (
            <MapMarker
              key={property.id}
              property={property}
              isSelected={selectedProperty?.id === property.id}
              onClick={handleMarkerClick}
            />
          ))}

          {selectedProperty && (
            <InfoWindow
              position={{ lat: selectedProperty.lat!, lng: selectedProperty.lng! }}
              onCloseClick={handleInfoWindowClose}
              headerDisabled={true}
            >
              <PropertyPopup property={selectedProperty} />
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
};
