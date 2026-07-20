import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Phone, Home, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import PropertyCard from '../components/PropertyCard';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface PublicProfileData {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  verification_status: string;
  nin_verified: boolean;
  lasrera_id: string | null;
  created_at: string;
  phone: string | null;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(profileData);

      const { data: listingsData } = await supabase
        .from('properties')
        .select('*')
        .or(`owner_id.eq.${profileData.id},agent_id.eq.${profileData.id}`)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      setListings(listingsData || []);
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading profile...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" style={font}>
        <div className="w-16 h-16 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
          <Home className="w-7 h-7 text-white/20" />
        </div>
        <p className="text-[15px] font-bold text-white/40 mb-1">Profile not found</p>
        <p className="text-[12px] text-white/20">This user doesn't exist or hasn't set a username yet.</p>
      </div>
    );
  }

  const isVerified = profile.verification_status === 'verified';
  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto px-5 py-8" style={font}>
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-[#1a6b3c] rounded-2xl overflow-hidden flex items-center justify-center text-white text-[26px] font-black flex-shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : (profile.full_name || '?').charAt(0).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-black text-white">{profile.full_name || 'Unnamed User'}</h1>
              {isVerified && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-2 py-1 rounded-lg">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-[13px] text-white/40 capitalize mt-1">{profile.role}</p>
            {profile.username && (
              <p className="text-[12px] text-white/25 mt-0.5">@{profile.username}</p>
            )}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {profile.phone && (
                <span className="flex items-center gap-1.5 text-[12px] text-white/50">
                  <Phone className="w-3.5 h-3.5" /> {profile.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[12px] text-white/30">
                <Calendar className="w-3.5 h-3.5" /> Joined {joinedDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-bold text-white mb-4">
          {listings.length > 0 ? `${listings.length} Active Listing${listings.length !== 1 ? 's' : ''}` : 'Listings'}
        </h2>
        {listings.length === 0 ? (
          <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-12 text-center">
            <p className="text-[13px] text-white/25">No active listings right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
