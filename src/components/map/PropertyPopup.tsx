import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Maximize, Shield, ArrowRight } from 'lucide-react';
import { Property } from '../../types';
import { formatNaira } from '../../utils/format';
import { motion } from 'framer-motion';

interface PropertyPopupProps {
  property: Property;
}

export const PropertyPopup: React.FC<PropertyPopupProps> = ({ property }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-72 bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100"
    >
      <div className="relative h-32">
        <img 
          src={property.images[0]} 
          alt={property.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg text-[10px] font-bold text-gold uppercase tracking-wider">
            {property.transaction_type === 'rent' ? 'Rent' : 'Sale'}
          </div>
          {property.escrow_verified && (
            <div className="bg-gold text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center">
              <Shield className="w-3 h-3 mr-1" fill="currentColor" /> Verified
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-zinc-900 truncate mb-1">{property.title}</h3>
        <div className="flex items-center text-zinc-500 text-[10px] mb-3">
          <MapPin className="w-3 h-3 mr-1 text-gold" />
          <span className="truncate">{property.address}</span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-black text-gold">
            {formatNaira(property.price)}
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            {property.listing_type === 'house' ? (
              <>
                <div className="flex items-center text-[10px] font-bold">
                  <Bed className="w-3 h-3 mr-0.5" /> {property.bedrooms}
                </div>
                <div className="flex items-center text-[10px] font-bold">
                  <Bath className="w-3 h-3 mr-0.5" /> {property.bathrooms}
                </div>
              </>
            ) : (
              <div className="flex items-center text-[10px] font-bold">
                <Maximize className="w-3 h-3 mr-0.5" /> {property.land_size_value} {property.land_size_unit}
              </div>
            )}
          </div>
        </div>
        
        <Link 
          to={`/property/${property.id}`}
          className="w-full bg-zinc-50 text-gold py-2 rounded-xl font-bold text-xs flex items-center justify-center hover:bg-gold hover:text-white transition-all group"
        >
          View Details <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};
