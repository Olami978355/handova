import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ListingFormData } from '../../../hooks/useListingForm';
import { MapPin, Home, Map as LandIcon, Tag, Calendar, CheckCircle2, AlertCircle, Video } from 'lucide-react';
import { COLORS } from '../../../constants';

interface StepProps {
  form: UseFormReturn<ListingFormData>;
}

export const Step6_Review: React.FC<StepProps> = ({ form }) => {
  const { watch } = form;
  const values = watch();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPriceLabel = () => {
    if (values.transaction_type === 'sell') return 'Outright Price';
    switch (values.price_period) {
      case 'yearly': return 'per year';
      case 'monthly': return 'per month';
      case 'nightly': return 'per night';
      default: return '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
        <p className="text-gray-500 mt-2">Please double-check your listing details</p>
      </div>

      <div className="space-y-6">
        {/* Main Info Card */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#1a6b3c] text-white flex items-center justify-center">
                {values.listing_type === 'house' ? <Home size={24} /> : <LandIcon size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{values.title}</h3>
                <p className="text-sm text-gray-500">{values.category} • {values.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1a6b3c]">{formatCurrency(values.price || 0)}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{getPriceLabel()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200/50">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-gray-400 shrink-0" size={18} />
                <div className="text-sm">
                  <p className="font-bold text-gray-700">Location</p>
                  <p className="text-gray-600">{values.address}, {values.lga}, {values.state} State</p>
                </div>
              </div>
              
              {values.listing_type === 'house' ? (
                <div className="flex items-start gap-3">
                  <Home className="text-gray-400 shrink-0" size={18} />
                  <div className="text-sm">
                    <p className="font-bold text-gray-700">Property Details</p>
                    <p className="text-gray-600">{values.bedrooms} Bedrooms • {values.bathrooms} Bathrooms</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <LandIcon className="text-gray-400 shrink-0" size={18} />
                  <div className="text-sm">
                    <p className="font-bold text-gray-700">Land Details</p>
                    <p className="text-gray-600">{values.land_size_value} {values.land_size_unit} • {values.land_title} Title</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Tag className="text-gray-400 shrink-0" size={18} />
                <div className="text-sm">
                  <p className="font-bold text-gray-700">Amenities / Features</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {values.amenities?.length ? values.amenities.map(a => (
                      <span key={a} className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-tight">{a}</span>
                    )) : <span className="text-gray-400 italic">None specified</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Media Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-700 px-1">
            Media Preview ({values.images?.length || 0} photos {values.videos?.length ? `· ${values.videos.length} videos` : ''})
          </h4>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {values.images?.map((url, idx) => (
              <div key={idx} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-100 shrink-0 shadow-sm">
                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
            {values.videos?.map((url, idx) => (
              <div key={`v-${idx}`} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-100 shrink-0 shadow-sm bg-black flex items-center justify-center relative">
                <Video className="text-white/50" size={20} />
                <div className="absolute bottom-0.5 right-1 text-[8px] font-bold text-white uppercase tracking-widest">Video</div>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Notice */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-bold mb-1">Verification Required</p>
            <p>Your listing will be reviewed by our moderators before it goes live. This typically takes 2-4 hours. You will receive a notification once it's approved.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
          <CheckCircle2 className="text-green-500 shrink-0" size={20} />
          <div className="text-xs text-green-800 leading-relaxed">
            <p className="font-bold mb-1">Escrow Enabled</p>
            <p>By submitting this listing, you agree to use the Rent Easy Escrow system for all transactions initiated through this platform.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
