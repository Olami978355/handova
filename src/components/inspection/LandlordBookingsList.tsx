import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Shield, CheckCircle,
  Loader2, MessageSquare, ChevronDown, ChevronUp,
  Home, AlertCircle, User
} from 'lucide-react';
import { format } from 'date-fns';
import { InspectionBooking, Property } from '../../types';
import { VerifiedBadge } from '../VerifiedBadge';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { supabase, requireValidSession  } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFee } from '../../utils/inspectionFee';
import { useNavigate } from 'react-router-dom';

export const LandlordBookingsList: React.FC = () => {
  const { fetchBookingsForProperty } = useInspectionBooking();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookingsByProperty, setBookingsByProperty] = useState<Record<string, InspectionBooking[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [startingEscrow, setStartingEscrow] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id).is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);

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

  const handleConfirmDate = async (
    bookingId: string,
    date: string,
    time: string
  ) => {
    setConfirming(bookingId);
    setActionError(null);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke(
        'confirm-inspection-date',
        { body: { bookingId, confirmedDate: date, confirmedTime: time } }
      );
      if (error) throw error;
      await fetchData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm date');
    } finally {
      setConfirming(null);
    }
  };

  const handleMarkDone = async (bookingId: string) => {
    setConfirming(bookingId);
    setActionError(null);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke(
        'mark-inspection-done',
        { body: { bookingId } }
      );
      if (error) throw error;
      await fetchData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark inspection complete');
    } finally {
      setConfirming(null);
    }
  };

  const handleStartEscrow = async (bookingId: string) => {
    setStartingEscrow(bookingId);
    setActionError(null);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke(
        'start-escrow-from-booking',
        { body: { bookingId } }
      );
      if (error) throw error;
      await fetchData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to start escrow');
    } finally {
      setStartingEscrow(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
        <p className="text-[13px] text-white/40">Loading bookings...</p>
      </div>
    );
  }

  const propertiesWithBookings = properties.filter(p => bookingsByProperty[p.id]);

  if (propertiesWithBookings.length === 0) {
    return (
      <div className="bg-ink border border-white/6 rounded-2xl p-14 text-center">
        <div className="w-14 h-14 bg-white/4 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-7 h-7 text-white/15" />
        </div>
        <h3 className="text-[16px] font-bold text-white mb-2">
          No inspection bookings yet
        </h3>
        <p className="text-[13px] text-white/35 max-w-xs mx-auto">
          When tenants book inspections for your properties they will appear here.
        </p>
      </div>
    );
  }

  const bookingStatusColor: Record<string, string> = {
    payment_confirmed: '#D4AF37',
    inspection_scheduled: '#9ca3af',
    inspection_done: '#9ca3af',
    tenant_interested: '#D4AF37',
    tenant_declined: '#9ca3af',
    escrow_started: '#D4AF37',
    refunded: '#9ca3af',
    dispute_raised: '#E5484D',
  };

  return (
    <div
      className="space-y-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {actionError && (
        <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-danger">{actionError}</p>
        </div>
      )}

      {propertiesWithBookings.map(property => {
        const bookings = bookingsByProperty[property.id];
        const isExpanded = expandedProperty === property.id;
        const pendingCount = bookings.filter(
          b => b.status === 'payment_confirmed' || b.status === 'tenant_interested'
        ).length;

        return (
          <div
            key={property.id}
            className="bg-ink border border-white/6 rounded-2xl overflow-hidden"
          >
            {/* Property header */}
            <button
              onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/2 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-[#111a14] rounded-xl overflow-hidden border border-white/6 flex-shrink-0">
                  {property.images?.[0] ? (
                    <img
                      src={property.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-5 h-5 text-white/15" />
                    </div>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <h3 className="text-[14px] font-bold text-white truncate">
                    {property.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-white/35">
                      {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                    </span>
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-bold text-black bg-gold px-2 py-0.5 rounded-full">
                        {pendingCount} needs action
                      </span>
                    )}
                    {property.has_active_deal && (
                      <span className="text-[10px] font-bold text-gold bg-gold/20 px-2 py-0.5 rounded-full border border-gold/30">
                        Deal active
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded
                ? <ChevronUp className="w-5 h-5 text-white/30 flex-shrink-0" />
                : <ChevronDown className="w-5 h-5 text-white/30 flex-shrink-0" />
              }
            </button>

            {/* Bookings list */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-t border-white/5"
                >
                  <div className="p-4 space-y-3">
                    {bookings.map(booking => (
                      <div
                        key={booking.id}
                        className="bg-[#111a14] border border-white/6 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          {/* Tenant info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-gold/20 rounded-xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
                              {booking.profiles?.full_name
                                ? booking.profiles.full_name.charAt(0).toUpperCase()
                                : <User className="w-4 h-4 text-white/40" />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-white truncate flex items-center gap-1">
                                <span className="truncate">{booking.profiles?.full_name || 'Tenant'}</span>
                                <VerifiedBadge status={booking.profiles?.verification_status} size={12} />
                              </p>
                              <p className="text-[10px] text-white/35">
                                {formatFee(booking.inspection_fee)} fee paid
                              </p>
                            </div>
                          </div>

                          {/* Status badge */}
                          <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                            style={{
                              color: bookingStatusColor[booking.status] || '#9ca3af',
                              background: `${bookingStatusColor[booking.status] || '#9ca3af'}15`
                            }}
                          >
                            {booking.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Date info */}
                        <div className="flex items-center gap-4 mb-3">
                          {booking.preferred_date && (
                            <div className="flex items-center gap-1.5 text-white/35">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-[11px]">
                                {booking.confirmed_date ? 'Confirmed:' : 'Preferred:'}{' '}
                                {format(
                                  new Date(booking.confirmed_date || booking.preferred_date),
                                  'MMM d, yyyy'
                                )}
                              </span>
                            </div>
                          )}
                          {booking.preferred_time && (
                            <div className="flex items-center gap-1.5 text-white/35">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-[11px]">{booking.preferred_time}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {booking.status === 'payment_confirmed' && (
                            <button
                              onClick={() => handleConfirmDate(
                                booking.id,
                                booking.preferred_date!,
                                booking.preferred_time!
                              )}
                              disabled={confirming === booking.id}
                              className="flex-1 bg-gold text-white py-2.5 rounded-xl text-[12px] font-bold hover:bg-gold-dark transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {confirming === booking.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle className="w-3.5 h-3.5" />
                              }
                              Confirm Date
                            </button>
                          )}
                          {booking.status === 'inspection_scheduled' && (
                            <button
                              onClick={() => handleMarkDone(booking.id)}
                              disabled={confirming === booking.id}
                              className="flex-1 bg-gold text-white py-2.5 rounded-xl text-[12px] font-bold hover:bg-gold-dark transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {confirming === booking.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle className="w-3.5 h-3.5" />
                              }
                              Mark Inspection Complete
                            </button>
                          )}

                          {booking.status === 'tenant_interested' &&
                            !property.has_active_deal && (
                            <button
                              onClick={() => handleStartEscrow(booking.id)}
                              disabled={startingEscrow === booking.id}
                              className="flex-1 bg-gold text-black py-2.5 rounded-xl text-[12px] font-bold hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {startingEscrow === booking.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Shield className="w-3.5 h-3.5" />
                              }
                              Start Escrow
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/messages`)}
                            className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all flex-shrink-0"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>

                        {booking.status === 'escrow_started' && (
                          <div className="flex items-center gap-2 mt-3 p-3 bg-gold/10 border border-gold/20 rounded-xl">
                            <Shield className="w-4 h-4 text-gold flex-shrink-0" />
                            <p className="text-[11px] text-gold font-semibold">
                              Escrow deal is active with this tenant
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
