import React, { useState, useEffect } from 'react';
import { 
  Shield, Info, AlertCircle, CheckCircle, 
  Calendar, Loader2, MessageSquare 
} from 'lucide-react';
import { Property, InspectionBooking } from '../../types';
import { calculateInspectionFee, formatFee } from '../../utils/inspectionFee';
import { useAuth } from '../../context/AuthContext';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { BookInspectionModal } from './BookInspectionModal';

interface InspectionFeeDisplayProps {
  property: Property;
}

export const InspectionFeeDisplay: React.FC<InspectionFeeDisplayProps> = ({ property }) => {
  const { user, profile } = useAuth();
  const { checkExistingBooking } = useInspectionBooking();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existingBooking, setExistingBooking] = useState<InspectionBooking | null>(null);
  const [loading, setLoading] = useState(true);

  const inspectionFee = calculateInspectionFee(
    property.price,
    property.price_period || null,
    property.listing_type,
    property.transaction_type
  );

  useEffect(() => {
    if (user) {
      checkExistingBooking(property.id).then(booking => {
        setExistingBooking(booking);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user, property.id]);

  // BUG FIX 11: Hide for property owner
  if (profile?.id === property.owner_id) return null;

  // BUG FIX 8: Show "No longer available" when rented/sold
  if (property.status === 'rented' || property.status === 'sold') {
    return (
      <div className="bg-zinc-100 p-6 rounded-[32px] border border-zinc-200 text-center">
        <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-zinc-500 font-bold">This property is no longer available</p>
      </div>
    );
  }

  // BUG FIX 4: Show "Deal In Progress" banner
  if (property.has_active_deal) {
    return (
      <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
          <Shield size={20} />
          <span className="font-black uppercase tracking-widest text-xs">Deal In Progress</span>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed">
          This property currently has an active deal and is not accepting new bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[40px] p-8 shadow-xl border border-zinc-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Inspection Fee</h3>
          <p className="text-xs text-zinc-400 font-medium">Refundable security deposit</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-[#1a6b3c]">{formatFee(inspectionFee)}</div>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex gap-3 text-xs text-zinc-500 leading-relaxed">
          <Shield size={16} className="text-[#1a6b3c] flex-shrink-0" />
          <p>Your fee is held in escrow and only released after you inspect the property.</p>
        </div>
        <div className="flex gap-3 text-xs text-zinc-500 leading-relaxed">
          <CheckCircle size={16} className="text-[#1a6b3c] flex-shrink-0" />
          <p>70% refund if you're not interested. 100% refund if the property is taken.</p>
        </div>
      </div>

      {loading ? (
        <div className="w-full py-4 flex items-center justify-center">
          <Loader2 size={24} className="text-[#1a6b3c] animate-spin" />
        </div>
      ) : existingBooking ? (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border text-center ${
            existingBooking.status === 'payment_confirmed' || existingBooking.status === 'inspection_scheduled'
              ? 'bg-[#1a6b3c]/5 border-[#1a6b3c]/10 text-[#1a6b3c]'
              : 'bg-zinc-50 border-zinc-100 text-zinc-500'
          }`}>
            <p className="text-xs font-bold uppercase tracking-widest">
              Booking Status: {existingBooking.status.replace('_', ' ')}
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all"
          >
            Manage Booking
          </button>
        </div>
      ) : (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-[#1a6b3c] text-white py-4 rounded-2xl font-bold hover:bg-[#14522e] transition-all shadow-lg shadow-[#1a6b3c]/20 flex items-center justify-center gap-2"
        >
          <Calendar size={20} />
          Book Inspection
        </button>
      )}

      <BookInspectionModal 
        property={property}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
