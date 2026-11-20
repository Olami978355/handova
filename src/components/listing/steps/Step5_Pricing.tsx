import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import {
  AlertCircle,
  Shield,
  Calendar,
  Tag,
  Repeat,
  FileText,
  ChevronDown
} from 'lucide-react';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount);

export const Step5_Pricing: React.FC<StepProps> = ({ form }) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors }
  } = form;

  const transactionType = watch('transaction_type');
  const listingType = watch('listing_type');
  const price = watch('price');
  const pricePeriod = watch('price_period');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const periods = [
    { id: 'yearly', label: 'Yearly', icon: Calendar },
    { id: 'monthly', label: 'Monthly', icon: Repeat },
    { id: 'nightly', label: 'Nightly', icon: Tag }
  ];

  const getPeriodLabel = () => {
    if (transactionType === 'sell') return '';

    const map: Record<string, string> = {
      yearly: '/ year',
      monthly: '/ month',
      nightly: '/ night'
    };

    return pricePeriod ? map[pricePeriod] || '' : '';
  };

  const platformFeeAmount = price > 0 ? price * 0.02 : 0;
  const customerTotal = price > 0 ? price + platformFeeAmount : 0;
  const listedAmount = price > 0 ? price : 0;

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="text-center">
        <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-2">
          Step 5 of 6
        </div>

        <h2 className="font-serif text-[24px] font-semibold text-paper tracking-tight mb-2">
          Pricing
        </h2>

        <p className="text-[13px] text-paper/45">
          Set a competitive price for your{' '}
          {listingType === 'house' ? 'property' : 'land'}
        </p>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
          Price (₦) <span className="text-danger">*</span>
        </label>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/30 text-[18px] font-bold pointer-events-none">
            ₦
          </span>

          <input
            type="number"
            {...register('price', { valueAsNumber: true })}
            placeholder="e.g. 1500000"
            className={`w-full pl-10 pr-4 py-4 bg-white/5 border rounded-xl text-[18px] font-bold text-paper tabular-nums placeholder:text-paper/20 focus:outline-none transition-colors ${
              errors.price
                ? 'border-danger/40'
                : 'border-white/10 focus:border-gold'
            }`}
          />
        </div>

        {errors.price && (
          <p className="flex items-center gap-1.5 text-[11px] text-danger mt-1.5">
            <AlertCircle className="w-3 h-3" />
            {errors.price.message}
          </p>
        )}
      </div>

      {transactionType === 'rent' && (
        <div>
          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-3">
            Price Period <span className="text-danger">*</span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            {periods.map(({ id, label, icon: Icon }) => {
              const active = pricePeriod === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setValue(
                      'price_period',
                      id as 'yearly' | 'monthly' | 'nightly'
                    )
                  }
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    active
                      ? 'bg-ink border-gold/40'
                      : 'bg-white/4 border-white/8 hover:border-white/15'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? 'text-gold' : 'text-paper/30'
                    }`}
                  />

                  <span
                    className={`text-[13px] font-bold ${
                      active ? 'text-paper' : 'text-paper/50'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {transactionType === 'rent' && (
        <div>
          <label className="block text-[12px] font-semibold text-paper/40 uppercase tracking-wider mb-2">
            Caution / Security Deposit (₦){' '}
            <span className="text-paper/25 normal-case">(optional)</span>
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/30 text-[16px] font-bold pointer-events-none">
              ₦
            </span>

            <input
              type="number"
              {...register('caution_fee', { valueAsNumber: true })}
              placeholder="e.g. 100000"
              className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[15px] font-semibold text-paper tabular-nums placeholder:text-paper/20 focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        </div>
      )}

      {price > 0 && (
        <div className="bg-slate/25 border border-white/6 rounded-2xl p-5 text-center">
          <p className="text-[11px] text-paper/35 uppercase tracking-wider mb-2">
            Your listing will show as
          </p>

          <div className="text-[28px] font-black text-gold tabular-nums leading-none">
            {formatNaira(price)}
          </div>

          {getPeriodLabel() && (
            <span className="text-[14px] text-paper/35 mt-1 block">
              {getPeriodLabel()}
            </span>
          )}
        </div>
      )}

      {price > 0 && (
        <div className="bg-slate/25 border border-white/6 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <div>
              <p className="text-[13px] font-bold text-paper">
                Transaction breakdown
              </p>

              <p className="text-[18px] font-black text-gold tabular-nums mt-0.5">
                {formatNaira(listedAmount)}
              </p>

              <p className="text-[11px] text-paper/35 mt-1">
                Listed amount before separately agreed commissions
              </p>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-paper/30 transition-transform ${
                showBreakdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showBreakdown && (
            <div className="px-5 pb-5 space-y-0 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-[13px] text-paper/55">
                  Listed transaction amount
                </span>

                <span className="text-[13px] font-bold text-paper tabular-nums">
                  {formatNaira(price)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-[13px] text-paper/55">
                  Handova platform fee (2%)
                </span>

                <span className="text-[13px] font-bold text-paper tabular-nums">
                  +{formatNaira(platformFeeAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <span className="text-[13px] font-bold text-paper block">
                    Customer checkout estimate
                  </span>

                  <span className="text-[10px] text-paper/35">
                    Before any optional agreement generation fee
                  </span>
                </div>

                <span className="text-[16px] font-black text-gold tabular-nums">
                  {formatNaira(customerTotal)}
                </span>
              </div>

              <p className="text-[10px] text-paper/30 leading-relaxed mt-3">
                The 2% Handova platform fee is added to the tenant or buyer's
                payment. Separately agreed agent or company commissions are
                not fixed by Handova.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-gold/8 border border-gold/15 rounded-xl">
        <Shield className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />

        <p className="text-[12px] text-paper/55 leading-relaxed">
          Handova's transaction process is designed to protect both parties.
          For rental transactions, the tenant confirms move-in and key
          handover before funds are released.
        </p>
      </div>

      {price > 0 && (
        <div className="flex items-start gap-3 p-4 bg-gold/6 border border-gold/15 rounded-xl">
          <FileText className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />

          <p className="text-[12px] text-paper/55 leading-relaxed">
            A written{' '}
            {transactionType === 'sell'
              ? 'contract of sale'
              : 'tenancy agreement'}{' '}
            is required for every deal on Handova. You can upload your own
            agreement or choose to have Handova generate one for ₦10,000.
            The generation fee is added to the tenant or buyer's checkout
            only when this service is selected.
          </p>
        </div>
      )}
    </div>
  );
};
