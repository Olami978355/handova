import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Shield, CheckCircle, 
  Loader2, AlertCircle, MessageSquare, ArrowRight,
  Home, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { InspectionBooking, Property } from '../../types';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFee } from '../../utils/inspectionFee';

export const LandlordBookingsList: React.FC = () => {
  const { fetchBookingsForProperty } = useInspectionBooking();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookingsByProperty, setBookingsByProperty] = useState<Record<string, InspectionBooking[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [startingEscrow, setStartingEscrow] = useState<string | null>(null);

  useEffect(() => {
    fetchLandlordProperties();
  }, []);

  const fetchLandlordProperties = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);

      // Fetch bookings for each property
      const bookingsMap: Record<string, InspectionBooking[]> = {};
      for (const prop of data || []) {
        const bookings = await fetchBookingsForProperty(prop.id);
        if (bookings.length > 0) {
          bookingsMap[prop.id] = bookings;
        }
      }
      setBookingsByProperty(bookingsMap);
    } catch (err) {
      console.error('Error fetching landlord properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDate = async (bookingId: string, date: string, time: string) => {
    setConfirming(bookingId);
    try {
      const { error } = await supabase.functions.invoke('confirm-inspection-date', {
        body: { bookingId, confirmedDate: date, confirmedTime: time }
      });
      if (error) throw error;
      await fetchLandlordProperties();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm inspection date');
    } finally {
      setConfirming(null);
    }
  };

  const handleStartEscrow = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to start escrow with this tenant? This will refund all other interested tenants 100%.')) return;
    
    setStartingEscrow(bookingId);
    try {
      const { error } = await supabase.functions.invoke('start-escrow-from-booking', {
        body: { bookingId }
      });
      if (error) throw error;
      await fetchLandlordProperties();
    } catch (err: any) {
      alert(err.message || 'Failed to start escrow');
    } finally {
      setStartingEscrow(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading your bookings...</p>
      </div>
    );
  }

  const propertiesWithBookings = properties.filter(p => bookingsByProperty[p.id]);

  if (propertiesWithBookings.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[40px] border border-zinc-100 shadow-sm">
        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar size={40} className="text-zinc-300" />
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 mb-2">No Inspection Bookings</h3>
        <p className="text-zinc-500 max-w-xs mx-auto">
          When tenants book inspections for your properties, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {propertiesWithBookings.map(property => (
        <div key={property.id} className="bg-white rounded-[40px] border border-zinc-100 overflow-hidden shadow-sm">
          <button 
            onClick={() => setExpandedProperty(expandedProperty === property.id ? null : property.id)}
            className="w-full px-8 py-6 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200">
                <img src={property.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-zinc-900">{property.title}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-zinc-500 flex items-center gap-1">
                    <Calendar size={14} />
                    {bookingsByProperty[property.id].length} Bookings
                  </p>
                  {property.has_active_deal && (
                    <span className="px-2 py-0.5 bg-[#1a6b3c] text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Deal In Progress
                    </span>
                  )}
                </div>
              </div>
            </div>
            {expandedProperty === property.id ? <ChevronUp size={24} className="text-zinc-400" /> : <ChevronDown size={24} className="text-zinc-400" />}
          </button>

          <AnimatePresence>
            {expandedProperty === property.id && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-zinc-50"
              >
                <div className="p-8 space-y-4">
                  {bookingsByProperty[property.id].map(booking => (
                    <div key={booking.id} className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-bold text-[#1a6b3c] border border-zinc-100">
                            {booking.profiles?.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-zinc-900">{booking.profiles?.full_name}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${
                                booking.status === 'tenant_interested' ? 'bg-[#1a6b3c] text-white' : 'bg-white text-zinc-400 border-zinc-200'
                              }`}>
                                {booking.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                Preferred: {booking.preferred_date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {booking.preferred_time}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {booking.status === 'payment_confirmed' && (
                            <button 
                              onClick={() => handleConfirmDate(booking.id, booking.preferred_date!, booking.preferred_time!)}
                              disabled={confirming === booking.id}
                              className="bg-[#1a6b3c] text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-[#14522e] transition-all flex items-center gap-2"
                            >
                              {confirming === booking.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                              Confirm Date
                            </button>
                          )}

                          {booking.status === 'tenant_interested' && !property.has_active_deal && (
                            <button 
                              onClick={() => handleStartEscrow(booking.id)}
                              disabled={startingEscrow === booking.id}
                              className="bg-[#1a6b3c] text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-[#14522e] transition-all flex items-center gap-2 shadow-lg shadow-[#1a6b3c]/20"
                            >
                              {startingEscrow === booking.id ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                              Start Escrow
                            </button>
                          )}

                          <button className="p-3 bg-white border border-zinc-200 rounded-2xl text-zinc-400 hover:text-[#1a6b3c] transition-colors">
                            <MessageSquare size={18} />
                          </button>
                        </div>
                      </div>

                      {booking.status === 'escrow_started' && (
                        <div className="mt-4 p-4 bg-[#1a6b3c]/5 rounded-2xl border border-[#1a6b3c]/10 flex items-center gap-3 text-[#1a6b3c]">
                          <Shield size={18} />
                          <p className="text-xs font-bold">Escrow deal is active with this tenant.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};
