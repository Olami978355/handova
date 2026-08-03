import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { AMENITIES } from '../../../constants';
import { AlertCircle } from 'lucide-react';
import { Select } from '../../ui/Select';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step2_BasicDetails: React.FC<StepProps> = ({ form }) => {
  const { register, watch, formState: { errors }, setValue } = form;
  const listingType = watch('listing_type');
  const transactionType = watch('transaction_type');
  const selectedAmenities = watch('amenities') || [];
  const houseRules = watch('house_rules') || '';
  const category = watch('category') || '';
  const landTitle = watch('land_title') || '';
  const landSizeUnit = watch('land_size_unit') || 'sqm';
  const minRentalDuration = watch('min_rental_duration') || '';

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
    `w-full px-4 py-3.5 bg-white/5 border rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none transition-colors ${
      hasError
        ? 'border-danger/40 focus:border-danger/60'
        : 'border-white/10 focus:border-gold'
    }`;

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="text-center">
        <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-2">
          Step 2 of 6
        </div>
        <h2 className="font-serif text-[24px] font-semibold text-paper tracking-tight mb-2">
          Basic Details
        </h2>
        <p className="text-[13px] text-paper/45">
          Tell us more about the {listingType === 'house' ? 'property' : 'land'}
        </p>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
          Listing Title <span className="text-danger">*</span>
        </label>
        <input
          {...register('title')}
          placeholder="e.g. Luxury 3 Bedroom Flat in Lekki Phase 1"
          className={inputClass(!!errors.title)}
        />
        {errors.title && (
          <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.title.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
            Category <span className="text-danger">*</span>
          </label>
          <Select
            value={category}
            onChange={(v) => setValue('category', v, { shouldValidate: true })}
            placeholder="Select category"
            hasError={!!errors.category}
            options={(listingType === 'house' ? houseCategories : landCategories).map(cat => ({ value: cat, label: cat }))}
          />
          {errors.category && (
            <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
              <AlertCircle className="w-3 h-3" /> {errors.category.message}
            </p>
          )}
        </div>

        {listingType === 'house' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
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
              <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
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
            <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
              Land Title
            </label>
            <Select
              value={landTitle}
              onChange={(v) => setValue('land_title', v as "C of O" | "Deed of Assignment" | "Governor's Consent" | "Gazette" | "Freehold")}
              placeholder="Select title type"
              options={landTitles.map(t => ({ value: t, label: t }))}
            />
          </div>
        )}
      </div>

      {listingType === 'land' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
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
            <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
              Unit
            </label>
            <Select
              value={landSizeUnit}
              onChange={(v) => setValue('land_size_unit', v as 'sqm' | 'plots' | 'acres')}
              options={[
                { value: 'sqm', label: 'Square Metres (sqm)' },
                { value: 'plots', label: 'Plots' },
                { value: 'acres', label: 'Acres' },
              ]}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder="Describe the property features, surroundings, and any other important details..."
          className={`${inputClass(!!errors.description)} resize-none`}
        />
        {errors.description && (
          <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.description.message}
          </p>
        )}
      </div>

      {transactionType === 'rent' && (
        <div>
          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
            Minimum Rental Duration
          </label>
          <Select
            value={minRentalDuration}
            onChange={(v) => setValue('min_rental_duration', v)}
            placeholder="Select duration"
            options={[
              { value: '6 months', label: '6 Months' },
              { value: '1 year', label: '1 Year' },
              { value: '2 years', label: '2 Years' },
              { value: 'Flexible', label: 'Flexible' },
            ]}
          />
        </div>
      )}

      <div>
        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
          House Rules <span className="text-paper/20 font-normal normal-case">(optional)</span>
        </label>
        <textarea
          {...register('house_rules')}
          rows={3}
          maxLength={500}
          placeholder="e.g. No pets, No smoking, Quiet hours after 10pm..."
          className={`${inputClass()} resize-none`}
        />
        <div className="flex justify-end mt-1">
          <span className="text-[11px] text-paper/25">{houseRules.length}/500</span>
        </div>
      </div>

      {listingType === 'house' && (
        <div>
          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-3">
            Amenities <span className="text-paper/20 font-normal normal-case">(select all that apply)</span>
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
                      ? 'bg-gold/12 border-gold/35 text-gold'
                      : 'bg-white/4 border-white/8 text-paper/50 hover:bg-white/6 hover:text-paper/70'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selected ? 'bg-gold border-gold' : 'border-white/20'
                  }`}>
                    {selected && (
                      <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#0B0D10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {amenity}
                </button>
              );
            })}
          </div>
          {selectedAmenities.length > 0 && (
            <p className="text-[11px] text-paper/35 mt-2">
              {selectedAmenities.length} amenit{selectedAmenities.length === 1 ? 'y' : 'ies'} selected
            </p>
          )}
        </div>
      )}
    </div>
  );
};
