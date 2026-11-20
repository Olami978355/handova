import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { AMENITIES } from '../../../constants';
import { AlertCircle, Check, FileText, Home, Ruler } from 'lucide-react';
import { Select } from '../../ui/Select';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step2_BasicDetails: React.FC<StepProps> = ({ form }) => {
  const {
    register,
    watch,
    formState: { errors },
    setValue,
  } = form;

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
      setValue(
        'amenities',
        selectedAmenities.filter((a) => a !== amenity),
        { shouldDirty: true }
      );
    } else {
      setValue('amenities', [...selectedAmenities, amenity], {
        shouldDirty: true,
      });
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full min-h-[48px] px-4 py-3 bg-white/[0.04] border text-[13px] text-paper placeholder:text-paper/25 outline-none transition-all duration-200 ${
      hasError
        ? 'border-danger/60 focus:border-danger'
        : 'border-white/10 focus:border-gold/60 hover:border-white/20'
    }`;

  const labelClass =
    'block text-[10px] font-bold tracking-[0.15em] uppercase text-paper/55 mb-2.5';

  const errorMessage = (message?: string) =>
    message ? (
      <p className="flex items-center gap-1.5 text-[11px] text-danger mt-2">
        <AlertCircle size={12} />
        {message}
      </p>
    ) : null;

  return (
    <div
      className="space-y-9"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-px w-7 bg-gold" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold">
            Listing details · 02
          </span>
        </div>

        <h2 className="font-serif text-[30px] sm:text-[34px] font-medium leading-tight tracking-tight text-paper">
          The details matter.
        </h2>

        <p className="max-w-lg text-[13px] leading-6 text-paper/50">
          Give prospective {transactionType === 'sell' ? 'buyers' : 'tenants'}
          {' '}a clear picture of your {listingType === 'house' ? 'property' : 'land'}.
          Accurate information helps people make informed decisions.
        </p>
      </header>

      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <FileText size={16} className="text-gold" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/75">
            Listing information
          </h3>
        </div>

        <div>
          <label className={labelClass}>
            Listing title <span className="text-danger">*</span>
          </label>
          <input
            {...register('title')}
            placeholder={
              listingType === 'house'
                ? 'e.g. Spacious 3-bedroom apartment in Lekki'
                : 'e.g. 600sqm residential plot in Ibeju-Lekki'
            }
            className={inputClass(!!errors.title)}
          />
          {errorMessage(errors.title?.message)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              Category <span className="text-danger">*</span>
            </label>
            <Select
              value={category}
              onChange={(v) =>
                setValue('category', v, { shouldValidate: true })
              }
              placeholder="Select category"
              hasError={!!errors.category}
              options={(listingType === 'house'
                ? houseCategories
                : landCategories
              ).map((cat) => ({ value: cat, label: cat }))}
            />
            {errorMessage(errors.category?.message)}
          </div>

          {listingType === 'house' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Bedrooms</label>
                <input
                  type="number"
                  min={0}
                  {...register('bedrooms', { valueAsNumber: true })}
                  className={inputClass()}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={labelClass}>Bathrooms</label>
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
              <label className={labelClass}>Land title</label>
              <Select
                value={landTitle}
                onChange={(v) =>
                  setValue(
                    'land_title',
                    v as
                      | 'C of O'
                      | 'Deed of Assignment'
                      | "Governor's Consent"
                      | 'Gazette'
                      | 'Freehold'
                  )
                }
                placeholder="Select title type"
                options={landTitles.map((t) => ({
                  value: t,
                  label: t,
                }))}
              />
            </div>
          )}
        </div>
      </section>

      {listingType === 'land' && (
        <section className="space-y-5">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <Ruler size={16} className="text-gold" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/75">
              Land measurements
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Land size</label>
              <input
                type="number"
                step="0.01"
                {...register('land_size_value', { valueAsNumber: true })}
                placeholder="e.g. 600"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass}>Measurement unit</label>
              <Select
                value={landSizeUnit}
                onChange={(v) =>
                  setValue('land_size_unit', v as 'sqm' | 'plots' | 'acres')
                }
                options={[
                  { value: 'sqm', label: 'Square metres (sqm)' },
                  { value: 'plots', label: 'Plots' },
                  { value: 'acres', label: 'Acres' },
                ]}
              />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <Home size={16} className="text-gold" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/75">
            Description and terms
          </h3>
        </div>

        <div>
          <label className={labelClass}>
            Description <span className="text-danger">*</span>
          </label>
          <textarea
            {...register('description')}
            rows={5}
            placeholder="Describe the property, its features, condition, surroundings and anything prospective occupants or buyers should know..."
            className={`${inputClass(!!errors.description)} min-h-[130px] resize-y leading-6`}
          />
          {errorMessage(errors.description?.message)}
        </div>

        {transactionType === 'rent' && (
          <div>
            <label className={labelClass}>Minimum rental duration</label>
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
          <div className="flex items-center justify-between mb-2.5">
            <label className={`${labelClass} mb-0`}>
              House rules
              <span className="ml-2 font-normal normal-case tracking-normal text-paper/30">
                Optional
              </span>
            </label>
            <span className="text-[10px] tabular-nums text-paper/35">
              {houseRules.length}/500
            </span>
          </div>

          <textarea
            {...register('house_rules')}
            rows={3}
            maxLength={500}
            placeholder="e.g. No smoking, pets permitted, shared facilities..."
            className={`${inputClass()} min-h-[90px] resize-y leading-6`}
          />
        </div>
      </section>

      {listingType === 'house' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-paper/75">
                Property amenities
              </h3>
              <p className="mt-1 text-[11px] text-paper/35">
                Select everything available at this property.
              </p>
            </div>

            {selectedAmenities.length > 0 && (
              <span className="shrink-0 text-[10px] font-semibold text-gold">
                {selectedAmenities.length} selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMENITIES.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);

              return (
                <button
                  key={amenity}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleAmenity(amenity)}
                  className={`flex min-h-[43px] items-center gap-2.5 border px-3 py-2.5 text-left text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                    selected
                      ? 'border-gold/50 bg-gold/[0.08] text-gold'
                      : 'border-white/10 bg-white/[0.025] text-paper/50 hover:border-white/25 hover:text-paper/80'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                      selected
                        ? 'border-gold bg-gold text-[#0B0D10]'
                        : 'border-white/20'
                    }`}
                  >
                    {selected && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span>{amenity}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
