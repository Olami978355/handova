import React from 'react';
import { useListingForm } from '../../hooks/useListingForm';
import { motion, AnimatePresence } from 'framer-motion';
import { Step1_ListingType } from './steps/Step1_ListingType';
import { Step2_BasicDetails } from './steps/Step2_BasicDetails';
import { Step3_Location } from './steps/Step3_Location';
import { Step4_MediaUpload } from './steps/Step4_MediaUpload';
import { Step5_Pricing } from './steps/Step5_Pricing';
import { Step6_Review } from './steps/Step6_Review';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { COLORS } from '../../constants';

export const ListingWizard: React.FC = () => {
  const { form, step, nextStep, prevStep, isSubmitting, onSubmit } = useListingForm();

  const steps = [
    { id: 1, title: 'Type' },
    { id: 2, title: 'Details' },
    { id: 3, title: 'Location' },
    { id: 4, title: 'Media' },
    { id: 5, title: 'Pricing' },
    { id: 6, title: 'Review' },
  ];

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1_ListingType form={form} />;
      case 2: return <Step2_BasicDetails form={form} />;
      case 3: return <Step3_Location form={form} />;
      case 4: return <Step4_MediaUpload form={form} />;
      case 5: return <Step5_Pricing form={form} />;
      case 6: return <Step6_Review form={form} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {steps.map((s) => (
            <div key={s.id} className="flex flex-col items-center flex-1 relative">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors z-10 bg-white ${
                  step >= s.id ? 'border-[#1a6b3c] text-[#1a6b3c]' : 'border-gray-300 text-gray-400'
                } ${step > s.id ? 'bg-[#1a6b3c] text-white' : ''}`}
              >
                {step > s.id ? <Check size={20} /> : s.id}
              </div>
              <span className={`text-xs mt-2 font-medium ${step >= s.id ? 'text-[#1a6b3c]' : 'text-gray-400'}`}>
                {s.title}
              </span>
              {s.id < steps.length && (
                <div 
                  className={`absolute top-5 left-1/2 w-full h-0.5 -z-0 ${
                    step > s.id ? 'bg-[#1a6b3c]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[500px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
              step === 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft size={20} />
            Back
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-2.5 rounded-lg font-medium text-white transition-all shadow-md hover:shadow-lg active:scale-95"
              style={{ backgroundColor: COLORS.primary }}
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-2.5 rounded-lg font-medium text-white transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: COLORS.primary }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Listing'}
              {!isSubmitting && <Check size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
