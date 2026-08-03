import React from 'react';
import { useListingForm } from '../../hooks/useListingForm';
import { motion, AnimatePresence } from 'framer-motion';
import { Step1_ListingType } from './steps/Step1_ListingType';
import { Step2_BasicDetails } from './steps/Step2_BasicDetails';
import { Step3_Location } from './steps/Step3_Location';
import { Step4_MediaUpload } from './steps/Step4_MediaUpload';
import { Step5_Pricing } from './steps/Step5_Pricing';
import { Step6_Review } from './steps/Step6_Review';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';

const steps = [
  { id: 1, title: 'Type' },
  { id: 2, title: 'Details' },
  { id: 3, title: 'Location' },
  { id: 4, title: 'Media' },
  { id: 5, title: 'Pricing' },
  { id: 6, title: 'Review' },
];

export const ListingWizard: React.FC<{ propertyId?: string }> = ({ propertyId }) => {
  const { form, step, nextStep, prevStep, isSubmitting, onSubmit } = useListingForm(propertyId);

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
    <div
      className="max-w-3xl mx-auto px-5 py-8"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Step progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-white/8 z-0" />
          <div
            className="absolute top-4 left-0 h-px bg-gold z-0 transition-all duration-500"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map(s => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                  done
                    ? 'bg-gold text-ink'
                    : active
                    ? 'bg-ink border-2 border-gold text-gold'
                    : 'bg-ink border border-white/15 text-paper/30'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider hidden sm:block ${
                  active ? 'text-gold' : done ? 'text-paper/50' : 'text-paper/25'
                }`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-slate/25 border border-white/6 rounded-2xl overflow-hidden">
        <div className="p-5 lg:p-8 min-h-[480px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 lg:px-8 py-5 border-t border-white/5">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
              step === 1
                ? 'text-paper/20 cursor-not-allowed'
                : 'text-paper/55 hover:bg-white/5 hover:text-paper'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 bg-gold text-ink px-8 py-2.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors active:scale-95"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-gold text-ink px-8 py-2.5 rounded-xl font-bold text-[14px] hover:bg-gold-dark transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {propertyId ? 'Save Changes' : 'Submit Listing'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Draft note */}
      {!propertyId && (
      <p className="text-[11px] text-paper/20 text-center mt-4">
        Your progress is saved automatically as you go
      </p>
      )}
    </div>
  );
};
