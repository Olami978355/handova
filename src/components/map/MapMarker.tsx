import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { Property } from '../../types';
import { abbreviatePrice } from '../../utils/format';

interface MapMarkerProps {
  property: Property;
  onClick: (property: Property) => void;
  isSelected: boolean;
}

export const MapMarker: React.FC<MapMarkerProps> = ({ property, onClick, isSelected }) => {
  if (!property.lat || !property.lng) return null;

  return (
    <AdvancedMarker
      position={{ lat: property.lat, lng: property.lng }}
      onClick={() => onClick(property)}
    >
      <div className={`
        relative px-3 py-1.5 rounded-full font-bold text-sm shadow-lg transition-all transform hover:scale-110 cursor-pointer
        ${isSelected 
          ? 'bg-[#1a6b3c] text-white scale-110 z-10' 
          : 'bg-white text-zinc-900 border-2 border-[#1a6b3c]'
        }
      `}>
        {abbreviatePrice(property.price)}
        <div className={`
          absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r-2 border-b-2
          ${isSelected ? 'bg-[#1a6b3c] border-[#1a6b3c]' : 'bg-white border-[#1a6b3c]'}
        `} />
      </div>
    </AdvancedMarker>
  );
};
