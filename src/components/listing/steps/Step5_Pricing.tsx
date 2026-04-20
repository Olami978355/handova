import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { Banknote, Calendar, Tag } from 'lucide-react';
import { COLORS } from '../../../constants';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step5_Pricing: React.FC<StepProps> = ({ form }) => {
  const { register, watch, formState: { errors } } = form;
  const transactionType = watch('transaction_type');
  const listingType = watch('listing_type');
  const price = watch('price');
  const pricePeriod = watch('price_period');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPriceLabel = () => {
    if (transactionType === 'sell') return 'Outright Price';
    switch (pricePeriod) {
      case 'yearly': return 'per year';
      case 'monthly': return 'per month';
      case 'nightly': return 'per night';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Pricing</h2>
        <p className="text-gray-500 mt-2">Set a competitive price for your property</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price (₦)</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₦</div>
            <input
              type="number"
              {...register('price', { valueAsNumber: true })}
              placeholder="e.g. 1,500,000"
              className={`w-full pl-10 pr-4 py-4 rounded-xl border-2 text-xl font-bold transition-all focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none ${
                errors.price ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50/50'
              }`}
            />
          </div>
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
        </div>

        {transactionType === 'rent' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Price Period</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'yearly', label: 'Yearly', icon: Calendar },
                { id: 'monthly', label: 'Monthly', icon: Calendar },
                { id: 'nightly', label: 'Nightly', icon: Calendar }
              ].map(period => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => form.setValue('price_period', period.id as any)}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                    pricePeriod === period.id 
                      ? 'border-[#1a6b3c] bg-[#1a6b3c]/5' 
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <period.icon size={24} className={pricePeriod === period.id ? 'text-[#1a6b3c]' : 'text-gray-400'} />
                  <span className={`text-sm font-bold mt-2 ${pricePeriod === period.id ? 'text-[#1a6b3c]' : 'text-gray-600'}`}>
                    {period.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 text-center">
          <p className="text-sm text-gray-500 mb-1">Your listing will be displayed as:</p>
          <div className="text-3xl font-black text-[#1a6b3c]">
            {price ? formatCurrency(price) : '₦0'}
            <span className="text-lg font-medium text-gray-400 ml-1">
              {getPriceLabel()}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <Banknote className="text-blue-500 shrink-0" size={20} />
          <div className="text-xs text-blue-700 leading-relaxed">
            <p className="font-bold mb-1">Rent Easy Escrow Protection</p>
            <p>Payments for this listing will be held in escrow until the {transactionType === 'rent' ? 'tenant moves in' : 'buyer confirms receipt of documents'}. This builds trust and ensures you get paid securely.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
