import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { AlertCircle, Shield, Calendar, Tag, Repeat } from 'lucide-react';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

export const Step5_Pricing: React.FC<StepProps> = ({ form }) => {
  const { register, watch, setValue, formState: { errors } } = form;
  const transactionType = watch('transaction_type');
  const listingType = watch('listing_type');
  const price = watch('price');
  const pricePeriod = watch('price_period');

  const periods = [
    { id: 'yearly', label: 'Yearly', icon: Calendar },
    { id: 'monthly', label: 'Monthly', icon: Repeat },
    { id: 'nightly', label: 'Nightly', icon: Tag },
  ];

  const getPeriodLabel = () => {
    if (transactionType === 'sell') return '';
    const map: Record<string, string> = {
      yearly: '/ year', monthly: '/ month', nightly: '/ night'
    };
    return pricePeriod ? map[pricePeriod] || '' : '';
  };

  const inspectionFee = price
    ? Math.min(Math.max(price * 0.01, 2000), 15000)
    : null;

  const platformFee = price ? price * 0.02 : null;

  return (
    <div
      className="space-y-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
          Step 5 of 6
        </div>
        <h2 className="text-[22px] font-black text-white tracking-tight mb-2">
          Pricing
        </h2>
        <p className="text-[13px] text-white/45">
          Set a competitive price for your {listingType === 'house' ? 'property' : 'land'}
        </p>
      </div>

      {/* Price input */}
      <div>
        <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">
          Price (₦) <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-[18px] font-bold pointer-events-none">
            ₦
          </span>
          <input
            type="number"
            {...register('price', { valueAsNumber: true })}
            placeholder="e.g. 1500000"
            className={`w-full pl-10 pr-4 py-4 bg-white/5 border rounded-xl text-[18px] font-bold text-white placeholder:text-white/20 focus:outline-none transition-colors ${
              errors.price ? 'border-red-500/40' : 'border-white/10 focus:border-[#1a6b3c]'
            }`}
          />
        </div>
        {errors.price && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1.5">
            <AlertCircle className="w-3 h-3" /> {errors.price.message}
          </p>
        )}
      </div>

      {/* Period selector for rent */}
      {transactionType === 'rent' && (
        <div>
          <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-3">
            Price Period <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {periods.map(({ id, label, icon: Icon }) => {
              const active = pricePeriod === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setValue('price_period', id as 'yearly' | 'monthly' | 'nightly')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    active
                      ? 'bg-[#0a1f11] border-[#f0c040]/40'
                      : 'bg-white/4 border-white/8 hover:border-white/15'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-[#f0c040]' : 'text-white/30'}`} />
                  <span className={`text-[13px] font-bold ${active ? 'text-white' : 'text-white/50'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price preview */}
      {price > 0 && (
        <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 text-center">
          <p className="text-[11px] text-white/35 uppercase tracking-wider mb-2">
            Your listing will show as
          </p>
          <div className="text-[28px] font-black text-[#f0c040] leading-none">
            {formatNaira(price)}
          </div>
          {getPeriodLabel() && (
            <span className="text-[14px] text-white/35 mt-1 block">
              {getPeriodLabel()}
            </span>
          )}
        </div>
      )}

    {price > 0 && (
  <div className="space-y-3">
    {/* What landlord receives */}
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
      <p className="text-[12px] font-bold text-white/40 uppercase tracking-wider mb-4">
        What you receive
      </p>
      <div className="space-y-0">
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <span className="text-[13px] text-white/55">Listed price</span>
          <span className="text-[13px] font-bold text-white">
            {formatNaira(price)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <span className="text-[13px] text-white/55">
            Rent Easy platform fee (2%)
          </span>
          <span className="text-[13px] font-bold text-red-400/70">
            -{formatNaira(price * 0.02)}
          </span>
        </div>
        {/* Show agent commission line only if agent */}
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <span className="text-[13px] text-white/55">
            Agent commission (10% if applicable)
          </span>
          <span className="text-[13px] font-bold text-white/35">
            -{formatNaira(price * 0.10)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3">
          <span className="text-[13px] font-bold text-white">
            You receive
          </span>
          <span className="text-[16px] font-black text-[#4ade80]">
            {formatNaira(price - (price * 0.02) - (price * 0.10))}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-white/20 leading-relaxed pt-3 border-t border-white/5 mt-3">
        Agent commission only applies if this listing is managed by an agent.
        If you listed directly as a landlord with no agent the 10% line does not apply.
      </p>
    </div>

    {/* What tenant pays */}
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
      <p className="text-[12px] font-bold text-white/40 uppercase tracking-wider mb-4">
        What tenant pays
      </p>
      <div className="space-y-0">
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <span className="text-[13px] text-white/55">Rent</span>
          <span className="text-[13px] font-bold text-white">
            {formatNaira(price)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 border-b border-white/5">
          <div>
            <span className="text-[13px] text-white/55">
              Escrow processing fee
            </span>
            <p className="text-[10px] text-white/25 mt-0.5">
              Paystack · capped at ₦2,000
            </p>
          </div>
          <span className="text-[13px] font-bold text-white/55">
            +{formatNaira(Math.min(price * 0.015 + 100, 2000))}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3">
          <span className="text-[13px] font-bold text-white">
            Total tenant pays
          </span>
          <span className="text-[16px] font-black text-[#f0c040]">
            {formatNaira(price + Math.min(price * 0.015 + 100, 2000))}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-white/20 leading-relaxed pt-3 border-t border-white/5 mt-3">
        Tenant pays the listed rent plus a small escrow processing fee.
        This fee is never more than ₦2,000 regardless of property price.
        Shown clearly to tenant before they confirm payment.
      </p>
    </div>
  </div>
)}
      {/* Escrow note */}
      <div className="flex items-start gap-3 p-4 bg-[#1a6b3c]/10 border border-[#1a6b3c]/20 rounded-xl">
        <Shield className="w-4 h-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-white/50 leading-relaxed">
          All payments for this listing are held in escrow by Rent Easy and only released after the{' '}
          {transactionType === 'rent' ? 'tenant confirms move-in' : 'buyer confirms document receipt'}.
          This protects both parties.
        </p>
      </div>
    </div>
  );
};
