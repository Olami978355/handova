import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { AMENITIES } from '../../../constants';
import { AlertCircle } from 'lucide-react';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step2_BasicDetails: React.FC<StepProps> = ({ form }) => {
  const { register, watch, formState: { errors }, setValue } = form;
  const listingType = watch('listing_type');
  const transactionType = watch('transaction_type');
  const selectedAmenities = watch('amenities') || [];
  const houseRules = watch('house_rules') || '';

  const houseCategories = [
    'Apartment / Flat', 'Duplex', 'Bungalow', 'Terraced House',
    'Self Contain', 'Mini Flat', 'Mansion', 'Penthouse',
    'Room & Parlour', 'Shop', 'Office Space', 'Warehouse',
  ];

  const landCategories = [
    'Residential Land', 'Commercial Land',
    'Industrial Land', 'Agricultural Land', 'Mixed Use Land',
  ];

  const landTitles = [
    'C of O', 'Deed of Assignment',
    "Governor's Consent", 'Gazette', 'Freehold',
  ];

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setValue('amenities', selectedAmenities.filter(a => a !== amenity));
    } else {
      setValue('amenities', [...selectedAmenities, amenity]);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-3.5 bg-white/5 border rounded-xl text-[14px] text-white placeholder:text-white/25 focus:outline-none transition-colors ${
      hasError
        ? 'border-red-500/40 focus:border-red-500/60'
        : 'border-white/10 focus:border-[#1a6b3c]'
    }`;

  const selectClass = (hasError?: boolean) =>
    `w-full px-4 py-3.5 bg-[#0a1f11] border rounded-xl text-[14px] text-white focus:outline-none transition-colors appearance-none cursor-pointer ${
      hasError
        ? 'border-red-500/40 focus:border-red-500/60'
        : 'border-white/10 focus:border-[#1a6b3c]'
    }`;

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
          Step 2 of 6
        </div>
        <h2 className="text-[22px] font-black text-white tracking-tight mb-2">
          Basic Details
        </h2>
        <p className="text-[13px] text-white/45">
          Tell us more about the {listingType === 'house' ? 'property' : 'land'}
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          Listing Title <span className="text-red-400">*</span>
        </label>
        <input
          {...register('title')}
          placeholder="e.g. Luxury 3 Bedroom Flat in Lekki Phase 1"
          className={inputClass(!!errors.title)}
        />
        {errors.title && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.title.message}
          </p>
        )}
      </div>

      {/* Category + bedrooms/bathrooms or land title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            {...register('category')}
            className={selectClass(!!errors.category)}
          >
            <option value="" className="bg-[#0a1f11]">Select category</option>
            {(listingType === 'house' ? houseCategories : landCategories).map(cat => (
              <option key={cat} value={cat} className="bg-[#0a1f11]">{cat}</option>
            ))}
          </select>
          {errors.category && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
              <AlertCircle className="w-3 h-3" /> {errors.category.message}
            </p>
          )}
        </div>

        {listingType === 'house' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                Bedrooms
              </label>
              <input
                type="number"
                min={0}
                {...register('bedrooms', { valueAsNumber: true })}
                className={inputClass()}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                Bathrooms
              </label>
              <input
                type="number"
                min={0}
                {...register('bathrooms', { valueAsNumber: true })}
                className={inputClass()}
                placeholder="0"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
              Land Title
            </label>
            <select {...register('land_title')} className={selectClass()}>
              <option value="" className="bg-[#0a1f11]">Select title type</option>
              {landTitles.map(t => (
                <option key={t} value={t} className="bg-[#0a1f11]">{t}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Land size */}
      {listingType === 'land' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
              Land Size
            </label>
            <input
              type="number"
              step="0.01"
              {...register('land_size_value', { valueAsNumber: true })}
              placeholder="e.g. 600"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
              Unit
            </label>
            <select {...register('land_size_unit')} className={selectClass()}>
              <option value="sqm" className="bg-[#0a1f11]">Square Metres (sqm)</option>
              <option value="plots" className="bg-[#0a1f11]">Plots</option>
              <option value="acres" className="bg-[#0a1f11]">Acres</option>
            </select>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder="Describe the property features, surroundings, and any other important details..."
          className={`${inputClass(!!errors.description)} resize-none`}
        />
        {errors.description && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.description.message}
          </p>
        )}
      </div>

      {/* Min rental duration */}
      {transactionType === 'rent' && (
        <div>
          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
            Minimum Rental Duration
          </label>
          <select {...register('min_rental_duration')} className={selectClass()}>
            <option value="" className="bg-[#0a1f11]">Select duration</option>
            <option value="6 months" className="bg-[#0a1f11]">6 Months</option>
            <option value="1 year" className="bg-[#0a1f11]">1 Year</option>
            <option value="2 years" className="bg-[#0a1f11]">2 Years</option>
            <option value="Flexible" className="bg-[#0a1f11]">Flexible</option>
          </select>
        </div>
      )}

      {/* House rules */}
      <div>
        <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          House Rules <span className="text-white/20 font-normal normal-case">(optional)</span>
        </label>
        <textarea
          {...register('house_rules')}
          rows={3}
          maxLength={500}
          placeholder="e.g. No pets, No smoking, Quiet hours after 10pm..."
          className={`${inputClass()} resize-none`}
        />
        <div className="flex justify-end mt-1">
          <span className="text-[11px] text-white/25">{houseRules.length}/500</span>
        </div>
      </div>

      {/* Amenities */}
      {listingType === 'house' && (
        <div>
          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            Amenities <span className="text-white/20 font-normal normal-case">(select all that apply)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMENITIES.map(amenity => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${
                    selected
                      ? 'bg-[#1a6b3c]/20 border-[#1a6b3c]/40 text-[#4ade80]'
                      : 'bg-white/4 border-white/8 text-white/50 hover:bg-white/6 hover:text-white/70'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selected ? 'bg-[#1a6b3c] border-[#1a6b3c]' : 'border-white/20'
                  }`}>
                    {selected && (
                      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {amenity}
                </button>
              );
            })}
          </div>
          {selectedAmenities.length > 0 && (
            <p className="text-[11px] text-white/35 mt-2">
              {selectedAmenities.length} amenit{selectedAmenities.length === 1 ? 'y' : 'ies'} selected
            </p>
          )}
        </div>
      )}
    </div>
  );
};