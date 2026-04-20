import React from 'react';
import { ListingWizard } from '../components/listing/ListingWizard';
import { COLORS } from '../constants';

export const ListingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-100 py-12 mb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">List Your Property</h1>
          <p className="text-gray-500 mt-3 text-lg">Reach thousands of verified tenants and buyers across Nigeria.</p>
        </div>
      </div>
      
      <ListingWizard />
      
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        <p>© 2026 Rent Easy. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="#" className="hover:text-[#1a6b3c]">Terms of Service</a>
          <a href="#" className="hover:text-[#1a6b3c]">Privacy Policy</a>
          <a href="#" className="hover:text-[#1a6b3c]">Help Center</a>
        </div>
      </div>
    </div>
  );
};
