import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Home,
  AlertCircle,
  User,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { InspectionBooking, Property } from '../../types';
import { VerifiedBadge } from '../VerifiedBadge';
import { useInspectionBooking } from '../../hooks/useInspectionBooking';
import { supabase, requireValidSession } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFee } from '../../utils/inspectionFee';
import { useNavigate } from 'react-router-dom';

const statusStyles: Record<string, string> = {
  pending_payment: 'bg-amber-50 text-amber-800 border-amber-200',
  payment_confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
  inspection_scheduled: 'bg-blue-50 text-blue-800 border-blue-200',
  inspection_done: 'bg-amber-50 text-amber-800 border-amber-200',
  tenant_interested: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  tenant_declined: 'bg-stone-100 text-stone-600 border-stone-200',
  escrow_started: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  refunded: 'bg-stone-100 text-stone-600 border-stone-200',
  dispute_raised: 'bg-red-50 text-red-700 border-red-200',
  dispute_resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const statusLabels: Record<string, string> = {
  pending_payment: 'Payment pending',
  payment_confirmed: 'Payment confirmed',
  inspection_scheduled: 'Scheduled',
  inspection_done: 'Inspection completed',
  tenant_interested: 'Tenant interested',
  tenant_declined: 'Tenant declined',
  escrow_started: 'Escrow started',
  refunded: 'Refunded',
  dispute_raised: 'Dispute raised',
  dispute_resolved: 'Dispute resolved',
};

export const LandlordBookingsList: React.FC = () => {
  const { fetchBookingsForProperty } = useInspectionBooking();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>([]);
  const [bookingsByProperty, setBookingsByProperty] = useState<
    Record<string, InspectionBooking[]>
  >({});
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties(data || []);

      const bookingsMap: Record<string, InspectionBooking[]> = {};

      for (const property of data || []) {
        const bookings = await fetchBookingsForProperty(property.id);

        if (bookings.length > 0) {
          bookingsMap[property.id] = bookings;
        }
      }

      setBookingsByProperty(bookingsMap);
    } catch (err) {
      console.error('Error fetching landlord properties:', err);
      setActionError('Unable to load inspection bookings. Please try again.');
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
        {
          body: {
            bookingId,
            confirmedDate: date,
            confirmedTime: time,
          },
        }
      );

      if (error) throw error;

      await fetchData();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to confirm inspection date'
      );
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
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to mark inspection as complete'
      );
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
      setActionError(
        err instanceof Error ? err.message : 'Failed to start escrow'
      );
    } finally {
      setStartingEscrow(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="mb-4 h-7 w-7 animate-spin text-[#b69a55]" />
        <p className="text-[12px] text-[#89877f]">
          Loading inspection bookings...
        </p>
      </div>
    );
  }

  const propertiesWithBookings = properties.filter(
    property => bookingsByProperty[property.id]
  );

  if (propertiesWithBookings.length === 0) {
    return (
      <div
        className="rounded-2xl border border-[#e9e5dc] bg-white px-6 py-16 text-center"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f3ed]">
          <Calendar className="h-6 w-6 text-[#a18a50]" />
        </div>

        <h3
          className="text-[23px] font-medium text-[#171915]"
          style={{ fontFamily: "'Newsreader', serif" }}
        >
          No inspection bookings yet
        </h3>

        <p className="mx-auto mt-2 max-w-xs text-[12px] leading-relaxed text-[#89877f]">
          When someone books an inspection for one of your properties, their
          request and booking details will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-[12px] leading-relaxed text-red-700">
            {actionError}
          </p>
        </div>
      )}

      {propertiesWithBookings.map(property => {
        const bookings = bookingsByProperty[property.id];
        const isExpanded = expandedProperty === property.id;

        const pendingCount = bookings.filter(booking =>
          ['payment_confirmed', 'tenant_interested'].includes(booking.status)
        ).length;

        return (
          <section
            key={property.id}
            className="overflow-hidden rounded-2xl border border-[#e9e5dc] bg-white"
          >
            {/* Property heading */}
            <button
              type="button"
              onClick={() =>
                setExpandedProperty(isExpanded ? null : property.id)
              }
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-[#faf9f6] sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="h-[58px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-[#f2f0eb]">
                  {property.images?.[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title || 'Property'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#aaa397]">
                      <Home className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h3
                    className="truncate text-[18px] font-medium text-[#171915]"
                    style={{ fontFamily: "'Newsreader', serif" }}
                  >
                    {property.title}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-[#89877f]">
                      {bookings.length} booking
                      {bookings.length !== 1 ? 's' : ''}
                    </span>

                    {pendingCount > 0 && (
                      <span className="rounded-full bg-[#f4f0e5] px-2 py-0.5 text-[9px] font-semibold text-[#92773d]">
                        {pendingCount} needs attention
                      </span>
                    )}

                    {property.has_active_deal && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
                        Active deal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-[10px] font-medium text-[#a18a50] sm:block">
                  {isExpanded ? 'Hide bookings' : 'View bookings'}
                </span>

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-[#89877f]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#89877f]" />
                )}
              </div>
            </button>

            {/* Booking details */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 border-t border-[#efede7] bg-[#faf9f6] p-3 sm:p-4">
                    {bookings.map(booking => {
                      const tenantName =
                        booking.profiles?.full_name || 'Tenant';

                      const bookingDate =
                        booking.confirmed_date || booking.preferred_date;

                      const canConfirmDate =
                        booking.status === 'payment_confirmed' &&
                        Boolean(booking.preferred_date) &&
                        Boolean(booking.preferred_time);

                      return (
                        <article
                          key={booking.id}
                          className="rounded-xl border border-[#e9e5dc] bg-white p-4 sm:p-5"
                        >
                          {/* Tenant and status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3f0e7] text-[13px] font-semibold text-[#92773d]">
                                {tenantName ? (
                                  tenantName.charAt(0).toUpperCase()
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-[#25251f]">
                                  <span className="truncate">
                                    {tenantName}
                                  </span>
                                  <VerifiedBadge
                                    status={
                                      booking.profiles?.verification_status
                                    }
                                    size={12}
                                  />
                                </p>

                                <p className="mt-1 text-[10px] text-[#89877f]">
                                  Inspection fee:{' '}
                                  <span className="font-semibold text-[#55534d]">
                                    {booking.inspection_fee > 0
                                      ? formatFee(booking.inspection_fee)
                                      : 'Free'}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
                                statusStyles[booking.status] ||
                                'border-stone-200 bg-stone-100 text-stone-600'
                              }`}
                            >
                              {statusLabels[booking.status] ||
                                booking.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Appointment details */}
                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#f8f7f4] p-3">
                            <div>
                              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#969187]">
                                {booking.confirmed_date
                                  ? 'Confirmed date'
                                  : 'Requested date'}
                              </p>

                              <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#35352f]">
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-[#a18a50]" />
                                {bookingDate
                                  ? format(
                                      new Date(bookingDate),
                                      'd MMM yyyy'
                                    )
                                  : 'Not set'}
                              </p>
                            </div>

                            <div>
                              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#969187]">
                                Preferred time
                              </p>

                              <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#35352f]">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-[#a18a50]" />
                                {booking.preferred_time || 'Not set'}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {booking.status === 'payment_confirmed' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirmDate(
                                    booking.id,
                                    booking.preferred_date!,
                                    booking.preferred_time!
                                  )
                                }
                                disabled={
                                  confirming === booking.id || !canConfirmDate
                                }
                                title={
                                  !canConfirmDate
                                    ? 'The tenant booking must include a preferred date and time'
                                    : undefined
                                }
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#b69a55] px-4 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#9e8240] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {confirming === booking.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                )}
                                Confirm inspection date
                              </button>
                            )}

                            {booking.status === 'inspection_scheduled' && (
                              <button
                                type="button"
                                onClick={() => handleMarkDone(booking.id)}
                                disabled={confirming === booking.id}
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#b69a55] px-4 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#9e8240] disabled:opacity-50"
                              >
                                {confirming === booking.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                )}
                                Mark inspection complete
                              </button>
                            )}

                            {booking.status === 'tenant_interested' &&
                              !property.has_active_deal && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEscrow(booking.id)}
                                  disabled={startingEscrow === booking.id}
                                  className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#25251f] px-4 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#3b3b32] disabled:opacity-50"
                                >
                                  {startingEscrow === booking.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Shield className="h-3.5 w-3.5" />
                                  )}
                                  Start escrow
                                </button>
                              )}

                            <button
                              type="button"
                              onClick={() => navigate('/messages')}
                              aria-label={`Open messages for ${tenantName}`}
                              title="Open messages"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e7e3da] bg-white text-[#77746b] transition-colors hover:border-[#c9b783] hover:text-[#92773d]"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </div>

                          {booking.status === 'escrow_started' && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                              <p className="text-[10px] leading-relaxed text-emerald-800">
                                An escrow deal has been started for this
                                inspection booking.
                              </p>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
};
