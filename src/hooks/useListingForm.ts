import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const listingSchema = z.object({
  // Step 1
  listing_type: z.enum(['house', 'land']),
  transaction_type: z.enum(['sell', 'rent']),
  
  // Step 2
  title: z.string().min(10, 'Title must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  min_rental_duration: z.string().optional(),
  house_rules: z.string().max(500, 'House rules must be under 500 characters').optional(),
  
  // House specific
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  amenities: z.array(z.string()),
  
  // Land specific
  land_size_value: z.number().min(0.1, 'Size is required').optional(),
  land_size_unit: z.enum(['sqm', 'plots', 'acres']).optional(),
  land_title: z.enum(['C of O', 'Deed of Assignment', 'Governor\'s Consent', 'Gazette', 'Freehold']).optional(),
  
  // Step 3
  state: z.string().min(1, 'State is required'),
  lga: z.string().min(1, 'LGA is required'),
  address: z.string().min(5, 'Address is required'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  
  // Step 4
  images: z.array(z.string()).min(3, 'At least 3 photos are required'),
  videos: z.array(z.string()).optional(),
  survey_plan_url: z.string().optional(),
  
  // Step 5
  price: z.number().min(1000, 'Price must be at least ₦1,000'),
  price_period: z.enum(['yearly', 'monthly', 'nightly', 'outright']).optional(),
});

export type ListingFormData = z.infer<typeof listingSchema>;

const STORAGE_KEY = 'rent_easy_listing_draft';

export const useListingForm = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved listing draft', e);
        }
      }
      return {
        listing_type: 'house',
        transaction_type: 'rent',
        amenities: [],
        images: [],
        land_size_unit: 'sqm',
        price_period: 'yearly',
      };
    },
  });

  const { watch, handleSubmit } = form;
  const values = watch();

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof ListingFormData)[] = [];
    
    if (step === 1) fieldsToValidate = ['listing_type', 'transaction_type'];
    if (step === 2) {
      fieldsToValidate = ['title', 'category', 'description'];
      if (values.listing_type === 'house') {
        fieldsToValidate.push('bedrooms', 'bathrooms', 'amenities');
      } else {
        fieldsToValidate.push('land_size_value', 'land_size_unit', 'land_title');
      }
    }
    if (step === 3) fieldsToValidate = ['state', 'lga', 'address', 'lat', 'lng'];
    if (step === 4) fieldsToValidate = ['images', 'survey_plan_url'];
    if (step === 5) fieldsToValidate = ['price', 'price_period'];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => Math.min(s + 1, 6));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    setStep(1);
  };

  const onSubmit = async (data: ListingFormData) => {
    setIsSubmitting(true);
    try {
      if (!user) throw new Error('You must be logged in to list a property');

      const status = profile?.verification_status === 'verified' ? 'active' : 'pending_review';

      const { error } = await supabase.from('properties').insert({
        owner_id: user.id,
        listing_type: data.listing_type,
        transaction_type: data.transaction_type,
        category: data.category,
        title: data.title,
        description: data.description,
        price: data.price,
        price_period: data.transaction_type === 'sell' ? 'outright' : data.price_period,
        state: data.state,
        lga: data.lga,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        land_size_value: data.land_size_value,
        land_size_unit: data.land_size_unit,
        land_title: data.land_title,
        survey_plan_url: data.survey_plan_url,
        images: data.images,
        videos: data.videos || [],
        amenities: data.amenities,
        min_rental_duration: data.min_rental_duration,
        house_rules: data.house_rules,
        status: status,
      });

      if (error) throw error;

      // Send notification to moderators if pending
      if (status === 'pending_review') {
        await supabase.from('notifications').insert({
          user_id: user.id, // In a real app, you'd target moderators
          title: 'Listing Submitted',
          body: `Your listing "${data.title}" has been submitted and is under review.`,
          type: 'listing_status',
        });
      }

      clearDraft();
      navigate('/listing-success');
    } catch (error) {
      console.error('Error submitting listing:', error);
      alert('Failed to submit listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    step,
    setStep,
    nextStep,
    prevStep,
    clearDraft,
    isSubmitting,
    onSubmit: handleSubmit(onSubmit),
  };
};
