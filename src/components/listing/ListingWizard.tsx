import React from 'react';
import { useListingForm } from '../../hooks/useListingForm';
import { motion, AnimatePresence } from 'framer-motion';
import { Step1_ListingType } from './steps/Step1_ListingType';
import { Step2_BasicDetails } from './steps/Step2_BasicDetails';
import { Step3_Location } from './steps/Step3_Location';
import { Step4_MediaUpload } from './steps/Step4_MediaUpload';
import { Step5_Pricing } from './steps/Step5_Pricing';
import { Step6_Review } from './steps/Step6_Review';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Home,
  ClipboardList,
  MapPin,
  Images,
  CreditCard,
  Eye
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Listing type', short: 'Type', description: 'Choose what you are listing', icon: Home },
  { id: 2, title: 'Property details', short: 'Details', description: 'Tell us about the property', icon: ClipboardList },
  { id: 3, title: 'Location', short: 'Location', description: 'Where it is situated', icon: MapPin },
  { id: 4, title: 'Photos & media', short: 'Media', description: 'Show people what is on offer', icon: Images },
  { id: 5, title: 'Pricing', short: 'Pricing', description: 'Set your asking price', icon: CreditCard },
  { id: 6, title: 'Review', short: 'Review', description: 'Check everything before publishing', icon: Eye }
];

export const ListingWizard: React.FC<{ propertyId?: string }> = ({ propertyId }) => {
  const { form, step, nextStep, prevStep, isSubmitting, onSubmit } = useListingForm(propertyId);

  const currentStep = steps[step - 1];
  const progress = ((step - 1) / (steps.length - 1)) * 100;

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
      className="min-h-screen px-4 py-8 sm:px-6 lg:px-8"
      style={{
        background: '#0B0D10',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 lg:mb-10">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gold mb-3">
            <span className="w-6 h-px bg-gold/70" />
            Handova property listings
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1
                className="text-[32px] sm:text-[40px] leading-tight text-paper tracking-tight"
                style={{ fontFamily: "'Newsreader', serif" }}
              >
                {propertyId ? 'Edit your listing' : 'Bring your property to market.'}
              </h1>
              <p className="text-[13px] sm:text-[14px] text-paper/45 mt-2 max-w-xl leading-relaxed">
                {propertyId
                  ? 'Update the details below and review your changes before saving.'
                  : 'A few details are all it takes to put your property in front of the right people.'}
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-[11px] text-paper/35 pb-1">
              <ShieldIcon />
              <span>Secure listing process</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] gap-5 lg:gap-7 items-start">
          <aside className="lg:sticky lg:top-8">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-paper/40">
                  Your progress
                </p>
                <p className="text-[11px] font-semibold text-gold tabular-nums">
                  {step} of 6
                </p>
              </div>

              <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mb-6">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
                  style={{ width: progress + '%' }}
                />
              </div>

              <div className="grid grid-cols-6 gap-1.5 mb-5 lg:hidden">
                {steps.map((item) => (
                  <div
                    key={item.id}
                    className={`h-1 rounded-full transition-colors ${
                      step >= item.id ? 'bg-gold' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <nav aria-label="Listing progress" className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-1">
                {steps.map((item) => {
                  const done = step > item.id;
                  const active = step === item.id;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-xl p-2.5 lg:p-3 transition-colors ${
                        active
                          ? 'bg-gold/[0.09] border border-gold/20'
                          : 'border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          done
                            ? 'bg-gold text-[#0B0D10]'
                            : active
                              ? 'bg-gold/15 text-gold'
                              : 'bg-white/[0.05] text-paper/30'
                        }`}
                      >
                        {done ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 hidden lg:block">
                        <p className={`text-[12px] font-semibold ${
                          active ? 'text-paper' : done ? 'text-paper/65' : 'text-paper/35'
                        }`}>
                          {item.title}
                        </p>
                        <p className="text-[10px] text-paper/25 mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      <span className={`text-[10px] font-semibold lg:hidden ${
                        active ? 'text-gold' : done ? 'text-paper/55' : 'text-paper/30'
                      }`}>
                        {item.short}
                      </span>
                    </div>
                  );
                })}
              </nav>

              <div className="hidden lg:block border-t border-white/[0.07] mt-5 pt-5">
                <p className="text-[11px] text-paper/35 leading-relaxed">
                  Take your time. Review your information before submitting your listing.
                </p>
              </div>
            </div>

            {!propertyId && (
              <div className="hidden lg:flex items-center gap-2 px-2 mt-4 text-[10px] text-paper/25">
                <Check className="w-3.5 h-3.5 text-gold/60" />
                Your progress is saved automatically as you go
              </div>
            )}
          </aside>

          <main className="min-w-0">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111419] overflow-hidden shadow-2xl shadow-black/20">
              <div className="px-5 py-4 sm:px-8 border-b border-white/[0.07] flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-paper/30 font-bold">
                    Step {step.toString().padStart(2, '0')}
                  </p>
                  <p className="text-[13px] text-paper/75 font-semibold mt-1">
                    {currentStep?.title}
                  </p>
                </div>

                <span className="text-[10px] text-paper/30">
                  {step === 6 ? 'Final check' : 'Listing setup'}
                </span>
              </div>

              <div className="p-5 sm:p-8 lg:p-10 min-h-[500px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="px-5 py-5 sm:px-8 border-t border-white/[0.07] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 1 || isSubmitting}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-semibold transition-colors ${
                    step === 1
                      ? 'text-paper/15 cursor-not-allowed'
                      : 'text-paper/55 hover:text-paper hover:bg-white/[0.05]'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:block text-[10px] text-paper/25">
                    {step} / 6
                  </span>

                  {step < 6 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center gap-2 bg-gold text-[#0B0D10] px-6 sm:px-7 py-3 rounded-xl font-bold text-[12px] hover:bg-[#E2C45B] transition-colors active:scale-[0.98]"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 bg-gold text-[#0B0D10] px-6 sm:px-7 py-3 rounded-xl font-bold text-[12px] hover:bg-[#E2C45B] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {propertyId ? 'Save changes' : 'Submit listing'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {!propertyId && (
              <p className="lg:hidden text-[10px] text-paper/25 text-center mt-4">
                Your progress is saved automatically as you go
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const ShieldIcon = () => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    className="w-3.5 h-3.5 text-gold/70"
    aria-hidden="true"
  >
    <path
      d="M10 2.5 16 5v4.2c0 3.8-2.5 6.5-6 8.3-3.5-1.8-6-4.5-6-8.3V5l6-2.5Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="m7.5 9.8 1.7 1.7 3.4-3.6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
