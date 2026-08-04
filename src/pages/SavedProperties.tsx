import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Property } from '../types';
import PropertyCard from '../components/PropertyCard';

export default function SavedProperties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('saved_properties')
        .select('property_id, properties(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        const list = (data || [])
          .map((row: any) => row.properties)
          .filter(Boolean) as Property[];
        setProperties(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleUnsave = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
  };

  return (
    <div
      className="max-w-6xl mx-auto px-5 py-8 page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="mb-8">
        <h1 className="font-serif text-[28px] font-semibold text-paper tracking-tight mb-2">
          Saved Properties
        </h1>
        <p className="text-[14px] text-paper/45">
          Properties you have saved to look at later
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
          <p className="text-[13px] text-paper/30">Loading your saved properties...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center mb-5">
            <Heart className="w-7 h-7 text-gold" />
          </div>
          <h2 className="text-[17px] font-bold text-paper mb-2">Nothing saved yet</h2>
          <p className="text-[13px] text-paper/40 max-w-xs mb-6">
            Tap the heart on any listing to save it here and come back to it later.
          </p>
          <Link
            to="/listings"
            className="flex items-center gap-2 bg-gold text-ink px-6 py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors"
          >
            Browse Listings
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              onSaveChange={(isSaved) => { if (!isSaved) handleUnsave(property.id); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
