import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { AMENITIES } from '../../../constants';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step2_BasicDetails: React.FC<StepProps> = ({ form }) => {
  const { register, watch, formState: { errors }, setValue } = form;
  const listingType = watch('listing_type');
  const selectedAmenities = watch('amenities') || [];

  const houseCategories = [
    'Apartment / Flat', 'Duplex', 'Bungalow', 'Terraced House', 'Self Contain', 'Mini Flat', 'Mansion', 'Penthouse'
  ];

  const landCategories = [
    'Residential Land', 'Commercial Land', 'Industrial Land', 'Agricultural Land', 'Mixed Use Land'
  ];

  const landTitles = [
    'C of O', 'Deed of Assignment', 'Governor\'s Consent', 'Gazette', 'Freehold'
  ];

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setValue('amenities', selectedAmenities.filter(a => a !== amenity));
    } else {
      setValue('amenities', [...selectedAmenities, amenity]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Basic Details</h2>
        <p className="text-gray-500 mt-2">Tell us more about the {listingType}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Listing Title</label>
          <input
            {...register('title')}
            placeholder="e.g. Luxury 3 Bedroom Flat in Lekki Phase 1"
            className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c] outline-none ${
              errors.title ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              {...register('category')}
              className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c] outline-none ${
                errors.category ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            >
              <option value="">Select Category</option>
              {(listingType === 'house' ? houseCategories : landCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
          </div>

          {listingType === 'house' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  {...register('bedrooms', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#1a6b3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  {...register('bathrooms', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#1a6b3c]"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Land Title</label>
              <select
                {...register('land_title')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#1a6b3c]"
              >
                <option value="">Select Title Type</option>
                {landTitles.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {listingType === 'land' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Land Size</label>
              <input
                type="number"
                step="0.01"
                {...register('land_size_value', { valueAsNumber: true })}
                placeholder="e.g. 600"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#1a6b3c]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                {...register('land_size_unit')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#1a6b3c]"
              >
                <option value="sqm">Sqm</option>
                <option value="plots">Plots</option>
                <option value="acres">Acres</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Describe the property features, surroundings, and any other important details..."
            className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:ring-2 focus:ring-[#1a6b3c]/20 focus:border-[#1a6b3c] outline-none ${
              errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
        </div>

        {form.watch('transaction_type') === 'rent' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rental Duration</label>
            <select
              {...register('min_rental_duration')}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#1a6b3c]"
            >
              <option value="">Select Duration</option>
              <option value="6 months">6 Months</option>
              <option value="1 year">1 Year</option>
              <option value="2 years">2 Years</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">House Rules (Optional)</label>
          <textarea
            {...register('house_rules')}
            rows={3}
            maxLength={500}
            placeholder="e.g. No pets, No smoking, Quiet hours after 10pm"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#1a6b3c] resize-none"
          />
          <div className="flex justify-end mt-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {form.watch('house_rules')?.length || 0}/500
            </span>
          </div>
        </div>

        {listingType === 'house' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Amenities</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AMENITIES.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    selectedAmenities.includes(amenity)
                      ? 'border-[#1a6b3c] bg-[#1a6b3c]/5 text-[#1a6b3c]'
                      : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedAmenities.includes(amenity) ? 'bg-[#1a6b3c] border-[#1a6b3c]' : 'border-gray-300'
                  }`}>
                    {selectedAmenities.includes(amenity) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  {amenity}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
