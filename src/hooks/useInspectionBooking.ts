import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { InspectionBooking, Property } from '../types';

export function useInspectionBooking() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all bookings for a specific property (for landlords/agents)
   */
  const fetchBookingsForProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .select('*, profiles(*)')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InspectionBooking[];
    } catch (err: any) {
      console.error('Error fetching property bookings:', err);
      return [];
    }
  };

  /**
   * Fetch all bookings for the current user (as a tenant)
   */
  const fetchMyBookings = async () => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('inspection_bookings')
        .select('*, properties(*)')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InspectionBooking[];
    } catch (err: any) {
      console.error('Error fetching my bookings:', err);
      return [];
    }
  };

  /**
   * BUG FIX 12: Check if an existing booking exists for a property and tenant.
   */
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
    } catch (err: any) {
      console.error('Error checking existing booking:', err);
      return null;
    }
  };

  /**
   * Create a new inspection booking (Step 3: Paystack payment)
   * This inserts the record with 'pending_payment' status.
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
          inspection_fee: inspectionFee,
          paystack_reference: paystackReference,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          status: 'pending_payment'
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
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit tenant's decision after inspection.
   * Calls the 'submit-inspection-decision' Edge Function.
   */
  const submitDecision = async (bookingId: string, interested: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('submit-inspection-decision', {
        body: { bookingId, interested }
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * BUG FIX 10: Raise a dispute and upload evidence.
   * File path: disputes/{tenant_uid}/{booking_id}/{filename}
   */
  const raiseDispute = async (bookingId: string, reason: string, evidenceFiles: File[]) => {
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
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Notify admin/moderator via Edge Function or just return
      return true;
    } catch (err: any) {
      setError(err.message);
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
    submitDecision,
    raiseDispute
  };
}
