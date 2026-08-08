import React from 'react';
import { ListingWizard } from '../components/listing/ListingWizard';

export const ListingPage: React.FC = () => {
  return (
    <div
      className="min-h-screen bg-ink"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-ink border-b border-white/5 py-10">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">
            New Listing
          </div>
          <h1 className="text-[28px] lg:text-[36px] font-black text-paper tracking-tight mb-3">
            List Your Property
          </h1>
          <p className="text-[14px] text-paper/45 max-w-md mx-auto">
            Reach thousands of verified tenants and buyers across all 36 Nigerian states.
          </p>
        </div>
      </div>

      {/* Wizard */}
      <ListingWizard />
    </div>
  );
};