import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { Home, Map as LandIcon, Tag, Calendar } from 'lucide-react';
import { COLORS } from '../../../constants';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step1_ListingType: React.FC<StepProps> = ({ form }) => {
  const { watch, setValue } = form;
  const listingType = watch('listing_type');
  const transactionType = watch('transaction_type');

  const types = [
    { id: 'house', label: 'House / Property', icon: Home, description: 'Apartments, flats, duplexes, etc.' },
    { id: 'land', label: 'Land', icon: LandIcon, description: 'Plots, acres, commercial land, etc.' },
  ];

  const transactions = [
    { id: 'rent', label: 'For Rent', icon: Calendar, description: 'Lease or short-term stay' },
    { id: 'sell', label: 'For Sale', icon: Tag, description: 'Outright purchase' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">What are you listing?</h2>
        <p className="text-gray-500 mt-2">Choose the type of property and transaction</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setValue('listing_type', type.id as any)}
            className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all group ${
              listingType === type.id 
                ? 'border-[#1a6b3c] bg-[#1a6b3c]/5 shadow-md' 
                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
              listingType === type.id ? 'bg-[#1a6b3c] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
            }`}>
              <type.icon size={32} />
            </div>
            <h3 className={`text-lg font-bold ${listingType === type.id ? 'text-[#1a6b3c]' : 'text-gray-700'}`}>
              {type.label}
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">{type.description}</p>
          </button>
        ))}
      </div>

      <div className="pt-8 border-t border-gray-100">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Transaction Type</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transactions.map((trans) => (
            <button
              key={trans.id}
              type="button"
              onClick={() => setValue('transaction_type', trans.id as any)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                transactionType === trans.id 
                  ? 'border-[#f0c040] bg-[#f0c040]/5 shadow-sm' 
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                transactionType === trans.id ? 'bg-[#f0c040] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                <trans.icon size={24} />
              </div>
              <div className="text-left">
                <h4 className={`font-bold ${transactionType === trans.id ? 'text-[#c97d0e]' : 'text-gray-700'}`}>
                  {trans.label}
                </h4>
                <p className="text-xs text-gray-500">{trans.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
