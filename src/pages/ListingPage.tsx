import React from 'react';
import { ListingWizard } from '../components/listing/ListingWizard';

export const ListingPage: React.FC = () => {
  return (
    <div
      className="min-h-screen bg-[#0a0a0a]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-[#0a1f11] border-b border-white/5 py-10">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-3">
            New Listing
          </div>
          <h1 className="text-[28px] lg:text-[36px] font-black text-white tracking-tight mb-3">
            List Your Property
          </h1>
          <p className="text-[14px] text-white/45 max-w-md mx-auto">
            Reach thousands of verified tenants and buyers across all 36 Nigerian states.
          </p>
        </div>
      </div>

      {/* Wizard */}
      <ListingWizard />
    </div>
  );
};