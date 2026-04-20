import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Property, PropertyType, TransactionType } from '../types';

interface MapFilters {
  type: PropertyType | 'all';
  transactionType: TransactionType | 'all';
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
}

export const usePropertyMap = (filters: MapFilters) => {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'active');
        
        if (supabaseError) throw supabaseError;
        setAllProperties(data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred while loading properties.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();

    const channelId = Math.random().toString(36).substring(7);
    const subscription = supabase
      .channel(`properties_map_updates-${channelId}`)
      .on('postgres_changes', { 
        event: '*', 
        table: 'properties', 
        schema: 'public' 
      }, (payload) => {
        const newRecord = payload.new as Property;
        const oldRecord = payload.old as Property;
        
        if (payload.eventType === 'INSERT' && newRecord.status === 'active') {
          setAllProperties(prev => [...prev, newRecord]);
        } else if (payload.eventType === 'UPDATE') {
          if (newRecord.status === 'active') {
            setAllProperties(prev => {
              const exists = prev.some(p => p.id === newRecord.id);
              if (exists) {
                return prev.map(p => p.id === newRecord.id ? newRecord : p);
              } else {
                return [...prev, newRecord];
              }
            });
          } else {
            setAllProperties(prev => prev.filter(p => p.id !== oldRecord.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setAllProperties(prev => prev.filter(p => p.id !== oldRecord.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const filteredProperties = useMemo(() => {
    return allProperties.filter(p => {
      if (filters.type !== 'all' && p.listing_type !== filters.type) return false;
      if (filters.transactionType !== 'all' && p.transaction_type !== filters.transactionType) return false;
      if (filters.verifiedOnly && !p.escrow_verified) return false;
      if (filters.minPrice && p.price < filters.minPrice) return false;
      if (filters.maxPrice && p.price > filters.maxPrice) return false;
      return true;
    });
  }, [allProperties, filters]);

  return { properties: filteredProperties, loading, error };
};
