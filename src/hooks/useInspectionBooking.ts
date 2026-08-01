import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { InspectionBooking, Property } from '../types';

export function useInspectionBooking() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingsForProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .select('*, profiles(id, full_name, avatar_url, role, verification_status)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as InspectionBooking[]) || [];
    } catch (err: unknown) {
      console.error('Error fetching property bookings:', err);
      return [];
    }
  };

  const fetchMyBookings = async () => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .select('*, properties(id, title, images, address, state, lga)')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as InspectionBooking[]) || [];
    } catch (err: unknown) {
      console.error('Error fetching my bookings:', err);
      return [];
    }
  };

  const checkExistingBooking = async (propertyId: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .select('*')
        .eq('property_id', propertyId)
        .eq('tenant_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as InspectionBooking | null;
    } catch (err: unknown) {
      console.error('Error checking existing booking:', err);
      return null;
    }
  };

  /**
   * Step 1 — Create booking record with pending_payment status
   * Called BEFORE Paystack opens so the record exists
   */
  const createBooking = async (
    property: Property,
    preferredDate: string,
    preferredTime: string,
    inspectionFee: number,
    paystackReference: string
  ) => {
    if (!user) throw new Error('You must be logged in to book an inspection.');

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .insert({
          property_id: property.id,
          tenant_id: user.id,
          landlord_id: property.owner_id,
          agent_id: property.agent_id || null,
          inspection_fee: inspectionFee,
          paystack_reference: paystackReference,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          status: 'pending_payment',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already booked an inspection for this property.');
        }
        throw error;
      }

      return data as InspectionBooking;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2 — Called after Paystack payment succeeds
   * Updates status to payment_confirmed and sends notifications
   */
  const confirmBookingPayment = async (
    bookingId: string,
    paystackReference: string
  ) => {
    if (!user) throw new Error('Not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Update booking status to payment_confirmed
      const { data: booking, error: updateError } = await supabase
        .from('inspection_bookings')
        .update({
          status: 'payment_confirmed',
          paystack_reference: paystackReference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select('*, properties(id, title, owner_id)')
        .single();

      if (updateError) throw updateError;

      // Notify landlord
      if (booking?.properties?.owner_id) {
        await supabase.from('notifications').insert({
          user_id: booking.properties.owner_id,
          title: 'New Inspection Booking!',
          body: `A tenant has paid the inspection fee for ${booking.properties.title} and wants to schedule a visit.`,
          type: 'inspection_booked',
          link: '/dashboard',
        });
      }

      // Notify tenant confirmation
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Inspection Booked Successfully!',
        body: `Your inspection booking for ${booking?.properties?.title} is confirmed. The landlord will confirm the date shortly.`,
        type: 'inspection_confirmed',
        link: '/dashboard',
      });

      return booking as InspectionBooking;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm booking payment';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Combined: create booking then immediately confirm payment
   * Use this when Paystack completes successfully
   */
  const createAndConfirmBooking = async (
    property: Property,
    preferredDate: string,
    preferredTime: string,
    inspectionFee: number,
    paystackReference: string
  ) => {
    if (!user) throw new Error('You must be logged in to book an inspection.');

    setLoading(true);
    setError(null);

    try {
      // Check if booking already exists for this reference
      // (handles Paystack callback firing twice)
      const { data: existing } = await supabase
        .from('inspection_bookings')
        .select('*')
        .eq('paystack_reference', paystackReference)
        .maybeSingle();

      if (existing) {
        // Already created — just confirm payment status
        if (existing.status === 'pending_payment') {
          return await confirmBookingPayment(existing.id, paystackReference);
        }
        return existing as InspectionBooking;
      }

      // Create new booking directly as payment_confirmed
      // since payment has already succeeded at this point
      const { data, error } = await supabase
        .from('inspection_bookings')
        .insert({
          property_id: property.id,
          tenant_id: user.id,
          landlord_id: property.owner_id,
          agent_id: property.agent_id || null,
          inspection_fee: inspectionFee,
          paystack_reference: paystackReference,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          status: 'payment_confirmed',
        })
        .select('*, properties(id, title, owner_id)')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Race condition — booking already exists
          const { data: race } = await supabase
            .from('inspection_bookings')
            .select('*')
            .eq('paystack_reference', paystackReference)
            .single();
          return race as InspectionBooking;
        }
        throw error;
      }

      // Notify landlord
      if (data?.properties?.owner_id) {
        await supabase.from('notifications').insert({
          user_id: data.properties.owner_id,
          title: 'New Inspection Booking!',
          body: `A tenant has paid the inspection fee for ${data.properties.title} and wants to schedule a visit.`,
          type: 'inspection_booked',
          link: '/dashboard',
        });
      }

      // Notify tenant
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Inspection Booked Successfully!',
        body: `Your inspection booking for ${data?.properties?.title} is confirmed. The landlord will confirm the date shortly.`,
        type: 'inspection_confirmed',
        link: '/dashboard',
      });

      return data as InspectionBooking;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create booking';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitDecision = async (bookingId: string, interested: boolean) => {
    setLoading(true);
    setError(null);
    try {
      if (!(await requireValidSession())) return;
      const { data, error } = await supabase.functions.invoke(
        'submit-inspection-decision',
        { body: { bookingId, interested } }
      );
      if (error) throw error;
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit decision';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const raiseDispute = async (
    bookingId: string,
    reason: string,
    evidenceFiles: File[]
  ) => {
    if (!user) throw new Error('Authentication required');

    setLoading(true);
    setError(null);

    try {
      const evidenceUrls: string[] = [];

      for (const file of evidenceFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${bookingId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('disputes')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('disputes')
          .getPublicUrl(filePath);

        evidenceUrls.push(publicUrl);
      }

      const { error } = await supabase
        .from('inspection_bookings')
        .update({
          status: 'dispute_raised',
          dispute_reason: reason,
          dispute_evidence_urls: evidenceUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) throw error;

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to raise dispute';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchBookingsForProperty,
    fetchMyBookings,
    checkExistingBooking,
    createBooking,
    confirmBookingPayment,
    createAndConfirmBooking,
    submitDecision,
    raiseDispute,
  };
}