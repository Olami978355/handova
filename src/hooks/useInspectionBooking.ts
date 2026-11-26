import { useState } from 'react';
import { supabase, requireValidSession  } from '../lib/supabase';
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
        .order('created_at', { ascending: false })
        .limit(1)
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

  /** Verify inspection payment through the trusted server function. */
  const verifyInspectionPayment = async (bookingId: string, reference: string) => {
    if (!(await requireValidSession())) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        'verify-inspection-payment',
        { body: { bookingId, reference } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment verification failed';
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

  /**
   * Free inspection (company listings with a zero fee). No payment, so no reference.
   * The database sets the real fee and refuses this for any listing that must be paid.
   */
  const createFreeBooking = async (
    property: Property,
    preferredDate: string,
    preferredTime: string
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
          inspection_fee: 0,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          status: 'payment_confirmed',
        })
        .select('*, properties(id, title, owner_id)')
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('You have already booked an inspection for this property.');
        throw error;
      }

      if (data?.properties?.owner_id) {
        await supabase.from('notifications').insert({
          user_id: data.properties.owner_id,
          title: 'New Inspection Booking!',
          body: 'A tenant booked a free inspection for ' + data.properties.title + ' and wants to schedule a visit.',
          type: 'inspection_booked',
          link: '/dashboard',
        });
      }
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Inspection Booked Successfully!',
        body: 'Your inspection booking for ' + data?.properties?.title + ' is confirmed. The date will be confirmed shortly.',
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

  return {
    loading,
    error,
    fetchBookingsForProperty,
    createFreeBooking,
    fetchMyBookings,
    checkExistingBooking,
    createBooking,
    verifyInspectionPayment,
    submitDecision,
    raiseDispute,
  };
}
