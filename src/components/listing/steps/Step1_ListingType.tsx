import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import {
  Home,
  Map as LandIcon,
  Tag,
  Calendar,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { ListUnderSelector } from '../ListUnderSelector';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step1_ListingType: React.FC<StepProps> = ({ form }) => {
  const { watch, setValue } = form;
  const listingType = watch('listing_type');
  const transactionType = watch('transaction_type');

  const types = [
    {
      id: 'house',
      label: 'House / Property',
      eyebrow: 'RESIDENTIAL & COMMERCIAL',
      icon: Home,
      description: 'Apartments, flats, duplexes, bungalows and commercial properties.',
    },
    {
      id: 'land',
      label: 'Land',
      eyebrow: 'PLOTS & LAND PARCELS',
      icon: LandIcon,
      description: 'Residential plots, commercial land and agricultural land.',
    },
  ] as const;

  const transactions = [
    {
      id: 'rent',
      label: 'For Rent',
      icon: Calendar,
      description: 'Offer a property or land for lease.',
    },
    {
      id: 'sell',
      label: 'For Sale',
      icon: Tag,
      description: 'Put a property or land up for purchase.',
    },
  ] as const;

  const selectionMessage = () => {
    if (listingType === 'house' && transactionType === 'rent') {
      return 'You are listing a property for rent. You will choose the rental price and payment period in the pricing step.';
    }

    if (listingType === 'house' && transactionType === 'sell') {
      return 'You are listing a property for sale. Add accurate property details and supporting information so buyers can assess it.';
    }

    if (listingType === 'land' && transactionType === 'sell') {
      return 'You are listing land for sale. You will be able to provide its size, title information and survey documents in the following steps.';
    }

    if (listingType === 'land' && transactionType === 'rent') {
      return 'You are listing land for lease. You will provide the lease details and terms in the following steps.';
    }

    return '';
  };

  return (
    <div
      className="space-y-9"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <ListUnderSelector form={form} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-px w-7 bg-gold" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-gold uppercase">
            Listing details · 01
          </span>
        </div>

        <h2 className="font-serif text-[30px] sm:text-[34px] leading-tight font-medium text-paper tracking-tight">
          What would you like to list?
        </h2>

        <p className="max-w-lg text-[13px] leading-6 text-paper/50">
          Start with the basics. Choose the type of asset and how you want to
          offer it to the market.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold tracking-[0.16em] uppercase text-paper/65">
            01 — Property type
          </h3>
          <span className="text-[11px] text-paper/30">Choose one</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {types.map((type) => {
            const active = listingType === type.id;
            const Icon = type.icon;

            return (
              <button
                key={type.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setValue('listing_type', type.id, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className={`group relative min-h-[178px] text-left p-5 sm:p-6 border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] ${
                  active
                    ? 'border-gold/65 bg-gold/[0.07]'
                    : 'border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.045]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center transition-colors ${
                      active
                        ? 'bg-gold text-[#0B0D10]'
                        : 'bg-white/[0.07] text-paper/65 group-hover:text-paper'
                    }`}
                  >
                    <Icon size={21} strokeWidth={1.7} />
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center border transition-all ${
                      active
                        ? 'border-gold bg-gold text-[#0B0D10]'
                        : 'border-white/20 text-transparent'
                    }`}
                  >
                    {active && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-1 text-[9px] font-bold tracking-[0.15em] text-paper/35">
                    {type.eyebrow}
                  </p>
                  <h4
                    className={`text-[16px] font-semibold tracking-tight ${
                      active ? 'text-paper' : 'text-paper/80'
                    }`}
                  >
                    {type.label}
                  </h4>
                  <p className="mt-2 max-w-[260px] text-[11px] leading-[1.7] text-paper/45">
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-white/10" />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold tracking-[0.16em] uppercase text-paper/65">
            02 — Transaction type
          </h3>
          <span className="text-[11px] text-paper/30">Choose one</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {transactions.map((transaction) => {
            const active = transactionType === transaction.id;
            const Icon = transaction.icon;

            return (
              <button
                key={transaction.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setValue('transaction_type', transaction.id, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className={`group flex min-h-[88px] items-center gap-4 border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] ${
                  active
                    ? 'border-gold/65 bg-gold/[0.07]'
                    : 'border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.045]'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors ${
                    active
                      ? 'bg-gold text-[#0B0D10]'
                      : 'bg-white/[0.07] text-paper/60'
                  }`}
                >
                  <Icon size={19} strokeWidth={1.7} />
                </div>

                <div className="min-w-0 flex-1">
                  <h4
                    className={`text-[14px] font-semibold ${
                      active ? 'text-paper' : 'text-paper/80'
                    }`}
                  >
                    {transaction.label}
                  </h4>
                  <p className="mt-1 text-[11px] leading-5 text-paper/40">
                    {transaction.description}
                  </p>
                </div>

                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                    active
                      ? 'border-gold bg-gold text-[#0B0D10]'
                      : 'border-white/20 text-transparent'
                  }`}
                >
                  {active && <Check size={13} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {listingType && transactionType && (
        <div className="flex items-start gap-4 border-l-2 border-gold/70 bg-white/[0.035] px-5 py-4">
          <div className="mt-0.5 text-gold">
            <ArrowUpRight size={17} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">
              Your selection
            </p>
            <p className="mt-1 text-[12px] leading-[1.8] text-paper/65">
              {selectionMessage()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
