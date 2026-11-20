import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck, Phone, Home, Calendar, Star,
  ArrowUpRight, Building2, BadgeCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import PropertyCard from '../components/PropertyCard';
import CompanyPublicPage from '../components/company/CompanyPublicPage';

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

interface ReviewerSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface DealReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer?: ReviewerSummary;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [listings, setListings] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<DealReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    let active = true;

    (async () => {
      setLoading(true);
      setNotFound(false);

      const { data: profileData, error: profileError } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!active) return;

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: listingsData } = await supabase
        .from('properties')
        .select('*')
        .or('owner_id.eq.' + profileData.id + ',agent_id.eq.' + profileData.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!active) return;
      setListings(listingsData || []);

      const { data: reviewRows } = await supabase
        .from('deal_reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('reviewee_id', profileData.id)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (reviewRows && reviewRows.length > 0) {
        const reviewerIds = [...new Set(reviewRows.map(r => r.reviewer_id))];

        const { data: reviewerProfiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', reviewerIds);

        if (!active) return;

        setReviews(reviewRows.map(r => ({
          ...r,
          reviewer: reviewerProfiles?.find(p => p.id === r.reviewer_id),
        })));
      } else {
        setReviews([]);
      }

      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="public-profile-page min-h-screen flex flex-col items-center justify-center gap-4" style={font}>
        <div className="w-8 h-8 border-2 border-[#c5a044] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] tracking-[0.16em] uppercase text-[#88877f]">Loading profile</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="public-profile-page min-h-screen flex flex-col items-center justify-center px-5 text-center" style={font}>
        <div className="w-16 h-16 bg-white border border-[#e7e2d8] flex items-center justify-center mb-5">
          <Home className="w-7 h-7 text-[#a58a4b]" />
        </div>
        <p className="font-serif text-3xl text-[#202329] mb-2">Profile not found</p>
        <p className="text-sm text-[#77766f] max-w-sm">
          This profile may no longer exist or the username may be incorrect.
        </p>
      </div>
    );
  }

  if (profile.role === 'company') {
    return <CompanyPublicPage profile={profile} />;
  }

  const isVerified = profile.verification_status === 'verified';
  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const roleLabel = profile.role
    ? profile.role.replace(/_/g, ' ')
    : 'Property professional';

  return (
    <div className="public-profile-page min-h-screen" style={font}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">

        <div className="flex items-center justify-between border-b border-[#ded9ce] pb-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#b49343]" />
            <span className="text-[10px] tracking-[0.2em] font-bold uppercase text-[#77766f]">
              Handova professional directory
            </span>
          </div>
          <span className="text-[10px] tracking-[0.14em] uppercase text-[#96938a]">
            Public profile
          </span>
        </div>

        <section className="bg-[#fffefa] border border-[#e7e2d8] mb-10">
          <div className="h-2 bg-[#c5a044]" />

          <div className="p-6 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 overflow-hidden bg-[#e9e2d2] border border-[#e1d8c5] flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Profile avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-serif text-5xl text-[#9b7c36]">
                    {(profile.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] tracking-[0.17em] uppercase text-[#a18443] font-bold">
                    {roleLabel}
                  </span>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f0e3] text-[#92732f] text-[10px] font-bold uppercase tracking-wide">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-3xl sm:text-5xl leading-tight tracking-tight text-[#202329]">
                  {profile.full_name || 'Unnamed User'}
                </h1>

                {profile.username && (
                  <p className="text-sm text-[#89867e] mt-2">@{profile.username}</p>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 text-[12px] text-[#77766f]">
                  {profile.phone && (
                    <a
                      href={'tel:' + profile.phone}
                      className="inline-flex items-center gap-2 hover:text-[#98772f] transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#a18443]" />
                      {profile.phone}
                    </a>
                  )}
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#a18443]" />
                    Joined {joinedDate}
                  </span>
                  {profile.lasrera_id && (
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#a18443]" />
                      LASRERA ID: {profile.lasrera_id}
                    </span>
                  )}
                </div>
              </div>

              {avgRating !== null && (
                <div className="sm:min-w-[130px] sm:text-right border-t sm:border-t-0 sm:border-l border-[#e7e2d8] pt-5 sm:pt-0 sm:pl-6">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <Star className="w-5 h-5 fill-[#b49343] text-[#b49343]" />
                    <span className="font-serif text-3xl text-[#202329] tabular-nums">
                      {avgRating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.13em] text-[#89867e] mt-1">
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-[#e7e2d8]">
            <div className="p-5 sm:px-8">
              <p className="font-serif text-3xl text-[#202329] tabular-nums">{listings.length}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#89867e] mt-1">
                Active listings
              </p>
            </div>
            <div className="p-5 sm:px-8 border-l border-[#e7e2d8]">
              <p className="font-serif text-3xl text-[#202329] tabular-nums">{reviews.length}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#89867e] mt-1">
                Client reviews
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-10 lg:gap-14">

          <section className="min-w-0">
            <div className="flex items-end justify-between border-b border-[#ded9ce] pb-4 mb-6">
              <div>
                <p className="text-[10px] tracking-[0.17em] uppercase text-[#a18443] font-bold mb-2">
                  Property portfolio
                </p>
                <h2 className="font-serif text-3xl text-[#202329]">Available properties</h2>
              </div>
              <span className="text-xs text-[#89867e] pb-1">
                {listings.length} found
              </span>
            </div>

            {listings.length === 0 ? (
              <div className="bg-[#fffefa] border border-[#e7e2d8] px-6 py-16 text-center">
                <Building2 className="w-8 h-8 text-[#b49a61] mx-auto mb-4" />
                <h3 className="font-serif text-2xl text-[#292d32] mb-2">
                  Nothing available just yet
                </h3>
                <p className="text-sm text-[#89867e]">
                  This professional has no active property listings at the moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {listings.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-8">
            <section>
              <p className="text-[10px] tracking-[0.17em] uppercase text-[#a18443] font-bold mb-2">
                Reputation
              </p>
              <h2 className="font-serif text-3xl text-[#202329] border-b border-[#ded9ce] pb-4 mb-5">
                Client feedback
              </h2>

              {reviews.length === 0 ? (
                <div className="bg-[#fffefa] border border-[#e7e2d8] p-6">
                  <Star className="w-5 h-5 text-[#b49a61] mb-3" />
                  <p className="font-serif text-xl text-[#292d32] mb-2">
                    No reviews yet
                  </p>
                  <p className="text-xs leading-relaxed text-[#89867e]">
                    Reviews from completed transactions will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <article key={r.id} className="bg-[#fffefa] border border-[#e7e2d8] p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 flex-shrink-0 overflow-hidden bg-[#eee8dc] flex items-center justify-center text-[#947637] font-bold text-xs">
                            {r.reviewer?.avatar_url ? (
                              <img
                                src={r.reviewer.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (r.reviewer?.full_name || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#292d32] truncate">
                              {r.reviewer?.full_name || 'Handova User'}
                            </p>
                            <p className="text-[10px] text-[#96938a] mt-0.5">
                              {new Date(r.created_at).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              className={'w-3 h-3 ' + (n <= r.rating
                                ? 'fill-[#b49343] text-[#b49343]'
                                : 'text-[#ded9ce]')}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-[#686861] leading-relaxed">
                          {r.comment}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="border-t border-[#ded9ce] pt-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#a18443] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#292d32] mb-1">
                    Transact with confidence
                  </p>
                  <p className="text-[11px] text-[#89867e] leading-relaxed">
                    Review property details and use Handova's transaction tools when you're ready to proceed.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-16 pt-6 border-t border-[#ded9ce] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] tracking-[0.16em] uppercase text-[#96938a]">
            Handova · Property transactions, with clarity
          </span>
          <span className="text-[10px] text-[#96938a]">
            Profile information is publicly visible
          </span>
        </footer>
      </div>
    </div>
  );
}
