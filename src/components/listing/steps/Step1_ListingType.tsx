import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { Home, Map as LandIcon, Tag, Calendar } from 'lucide-react';

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
      icon: Home,
      description: 'Apartments, flats, duplexes, bungalows, mansions',
    },
    {
      id: 'land',
      label: 'Land',
      icon: LandIcon,
      description: 'Residential plots, commercial land, farmland',
    },
  ];

  const transactions = [
    {
      id: 'rent',
      label: 'For Rent',
      icon: Calendar,
      description: 'Yearly, monthly or nightly lease',
    },
    {
      id: 'sell',
      label: 'For Sale',
      icon: Tag,
      description: 'Outright purchase or land sale',
    },
  ];

  return (
    <div
      className="space-y-8"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-2">
          Step 1 of 6
        </div>
        <h2 className="font-serif text-[24px] font-semibold text-paper tracking-tight mb-2">
          What are you listing?
        </h2>
        <p className="text-[13px] text-paper/45">
          Choose the property type and whether you are renting or selling
        </p>
      </div>

      {/* Property type */}
      <div>
        <p className="text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-3">
          Property Type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {types.map((type) => {
            const active = listingType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setValue('listing_type', type.id as 'house' | 'land')}
                className={`relative flex flex-col items-center text-center p-6 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                  active
                    ? 'bg-ink border-gold/40 shadow-lg shadow-gold/5'
                    : 'bg-white/4 border-white/8 hover:border-white/15 hover:bg-white/6'
                }`}
              >
                {active && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#0B0D10"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                    active
                      ? 'bg-gold text-ink'
                      : 'bg-white/8 text-paper/40'
                  }`}
                >
                  <type.icon size={28} />
                </div>

                <h3
                  className={`text-[15px] font-bold mb-1 transition-colors ${
                    active ? 'text-paper' : 'text-paper/65'
                  }`}
                >
                  {type.label}
                </h3>
                <p className="text-[12px] text-paper/35 leading-relaxed">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/6" />

      {/* Transaction type */}
      <div>
        <p className="text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-3">
          Transaction Type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {transactions.map((trans) => {
            const active = transactionType === trans.id;
            return (
              <button
                key={trans.id}
                type="button"
                onClick={() =>
                  setValue('transaction_type', trans.id as 'rent' | 'sell')
                }
                className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                  active
                    ? 'bg-ink border-gold/40'
                    : 'bg-white/4 border-white/8 hover:border-white/15 hover:bg-white/6'
                }`}
              >
                {active && (
                  <div className="absolute top-3 right-3 w-4 h-4 bg-gold rounded-full flex items-center justify-center">
                    <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke="#0B0D10"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    active
                      ? 'bg-gold text-ink'
                      : 'bg-white/8 text-paper/40'
                  }`}
                >
                  <trans.icon size={22} />
                </div>

                <div className="text-left">
                  <h4
                    className={`text-[14px] font-bold transition-colors ${
                      active ? 'text-paper' : 'text-paper/65'
                    }`}
                  >
                    {trans.label}
                  </h4>
                  <p className="text-[12px] text-paper/35 mt-0.5">
                    {trans.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info note */}
      {listingType && transactionType && (
        <div className="flex items-start gap-3 p-4 bg-gold/8 border border-gold/15 rounded-xl">
          <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 mt-1.5" />
          <p className="text-[12px] text-paper/55 leading-relaxed">
            {listingType === 'house' && transactionType === 'rent' &&
              'You are listing a property for rent. You will set the price period (yearly, monthly or nightly) in the next step.'
            }
            {listingType === 'house' && transactionType === 'sell' &&
              'You are listing a property for sale. Buyers will go through the escrow process before funds are released to you.'
            }
            {listingType === 'land' && transactionType === 'sell' &&
              'You are listing land for sale. You will need to upload your survey plan and title documents. Land deals use a document handover escrow flow.'
            }
            {listingType === 'land' && transactionType === 'rent' &&
              'You are listing land for lease. You will set the lease period and terms in the next step.'
            }
          </p>
        </div>
      )}
    </div>
  );
};
