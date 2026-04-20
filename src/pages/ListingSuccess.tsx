import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Home, LayoutDashboard, ArrowRight } from 'lucide-react';
import { COLORS } from '../constants';
import { motion } from 'framer-motion';

export const ListingSuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100"
      >
        <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Listing Submitted!</h1>
        <p className="text-gray-500 mb-8 text-lg leading-relaxed">
          Your property is now under review by our moderators. You will be notified as soon as it goes live.
        </p>
        
        <div className="space-y-4">
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-xl active:scale-95"
            style={{ backgroundColor: COLORS.primary }}
          >
            <LayoutDashboard size={20} />
            Go to Dashboard
          </Link>
          
          <Link 
            to="/" 
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
          >
            <Home size={20} />
            Back to Home
          </Link>
        </div>
        
        <div className="mt-10 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400 font-medium mb-4">What's next?</p>
          <div className="flex flex-col gap-4 text-left">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 font-bold text-sm">1</div>
              <p className="text-sm text-gray-600">Moderators verify your property details and ownership documents.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 font-bold text-sm">2</div>
              <p className="text-sm text-gray-600">Listing goes live and becomes visible to thousands of potential clients.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 font-bold text-sm">3</div>
              <p className="text-sm text-gray-600">Receive inspection requests and start secure escrow transactions.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
