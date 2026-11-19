import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Phone, Home, Calendar, Star, Building2, Scale } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import PropertyCard from '../components/PropertyCard';
import CompanyPublicPage from '../components/company/CompanyPublicPage';
import { useAuth } from '../context/AuthContext';
import { LawyerConsultationModal } from '../components/deal/LawyerConsultationModal';
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
  const [worksWith, setWorksWith] = useState<{ name: string; logo: string | null; username: string } | null>(null);
  const { user } = useAuth();
  const [lawyer, setLawyer] = useState<{ specialty: string; states_covered: string[]; default_fee: number | null; avg: number | null; count: number } | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);
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

      const { data: reviewRows } = await supabase
        .from('deal_reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('reviewee_id', profileData.id)
        .order('created_at', { ascending: false });

      if (reviewRows && reviewRows.length > 0) {
        const reviewerIds = [...new Set(reviewRows.map(r => r.reviewer_id))];
        const { data: reviewerProfiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', reviewerIds);
        setReviews(reviewRows.map(r => ({
          ...r,
          reviewer: reviewerProfiles?.find(p => p.id === r.reviewer_id),
        })));
      } else {
        setReviews([]);
      }

      setLawyer(null);
      {
        const { data: lv } = await supabase
          .from('lawyer_verifications')
          .select('specialty, states_covered, default_fee')
          .eq('user_id', profileData.id)
          .eq('status', 'approved')
          .maybeSingle();
        if (lv) {
          const { data: rr } = await supabase
            .from('lawyer_review_bookings')
            .select('requester_rating')
            .eq('lawyer_id', profileData.id)
            .not('requester_rating', 'is', null);
          const rs = (rr || []).map(r => r.requester_rating as number);
          setLawyer({
            specialty: lv.specialty,
            states_covered: lv.states_covered || [],
            default_fee: lv.default_fee ?? null,
            avg: rs.length ? rs.reduce((s, n) => s + n, 0) / rs.length : null,
            count: rs.length,
          });
        }
      }
      setWorksWith(null);
      if (profileData.role !== 'company') {
        const { data: m } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('member_id', profileData.id)
          .eq('status', 'active')
          .maybeSingle();
        if (m) {
          const { data: co } = await supabase
            .from('companies')
            .select('name, logo_url, verification_status')
            .eq('id', m.company_id)
            .maybeSingle();
          const { data: cp } = await supabase
            .from('public_profiles')
            .select('username')
            .eq('id', m.company_id)
            .maybeSingle();
          if (co && co.verification_status === 'verified' && cp?.username) {
            setWorksWith({ name: co.name, logo: co.logo_url, username: cp.username });
          }
        }
      }

      setLoading(false);
    })();
  }, [username]);
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
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
  if (profile.role === 'company') {
    return <CompanyPublicPage profile={profile} />;
  }

  const isVerified = profile.verification_status === 'verified';
  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  return (
    <div className="max-w-4xl mx-auto px-5 py-8" style={font}>
      <div className="bg-ink border border-white/6 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gold rounded-2xl overflow-hidden flex items-center justify-center text-white text-[26px] font-black flex-shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : (profile.full_name || '?').charAt(0).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-black text-white">{profile.full_name || 'Unnamed User'}</h1>
              {isVerified && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-white/50 bg-white/5 px-2 py-1 rounded-lg">
                  <ShieldCheck className="w-3 h-3" /> Identity verified
                </span>
              )}
              {avgRating !== null && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-gold bg-gold/10 px-2 py-1 rounded-lg">
                  <Star className="w-3 h-3 fill-gold" /> {avgRating.toFixed(1)} ({reviews.length})
                </span>
              )}
            </div>
            <p className="text-[13px] text-white/40 capitalize mt-1">{lawyer ? 'Lawyer' : profile.role === 'landlord' ? 'Property owner' : profile.role}</p>
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
            {worksWith && (
              <Link to={'/u/' + worksWith.username} className="inline-flex items-center gap-2 mt-3 px-2.5 py-1.5 bg-white/4 border border-white/8 rounded-lg hover:border-white/20 transition-colors">
                <span className="w-5 h-5 rounded-md overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0">
                  {worksWith.logo
                    ? <img src={worksWith.logo} alt="" className="w-full h-full object-cover" />
                    : <Building2 className="w-3 h-3 text-gold" />}
                </span>
                <span className="text-[11px] text-white/45">Works with</span>
                <span className="text-[12px] font-semibold text-white">{worksWith.name}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {profile.role === 'landlord' && (
        <div className="bg-ink border border-white/6 rounded-2xl p-4 mb-6">
          <p className="text-[12px] text-white/45 leading-relaxed">
            {isVerified
              ? "Handova checked this person's identity. It does not verify ownership of any property."
              : "Handova has not yet checked this person's identity. Ownership of any property is not verified."}
          </p>
        </div>
      )}

      {lawyer && (
        <div className="bg-ink border border-white/6 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-gold" />
            <h2 className="text-[15px] font-bold text-white">Legal practice</h2>
            {lawyer.avg !== null && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-gold ml-auto">
                <Star className="w-3 h-3 fill-gold" /> {lawyer.avg.toFixed(1)} ({lawyer.count})
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white/4 rounded-xl">
              <p className="text-[11px] text-white/40">Practice areas</p>
              <p className="text-[13px] font-semibold text-white mt-1">
                {lawyer.specialty === 'property_title' ? 'Property and title' : lawyer.specialty === 'both' ? 'Tenancy, property and title' : 'Tenancy'}
              </p>
            </div>
            <div className="p-3 bg-white/4 rounded-xl">
              <p className="text-[11px] text-white/40">States covered</p>
              <p className="text-[13px] font-semibold text-white mt-1">
                {lawyer.states_covered.length > 0 ? lawyer.states_covered.join(', ') : 'Not stated'}
              </p>
            </div>
            <div className="p-3 bg-white/4 rounded-xl">
              <p className="text-[11px] text-white/40">Consultation fee</p>
              <p className="text-[13px] font-semibold text-white mt-1">
                {lawyer.default_fee !== null ? '₦' + Number(lawyer.default_fee).toLocaleString('en-NG') : 'Set at booking'}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-white/35 mt-4 leading-relaxed">
            Handova checked the Nigerian Bar Association credential for this lawyer. It does not review or guarantee any advice given.
          </p>
          {user && user.id !== profile.id && (
            <button
              onClick={() => setConsultOpen(true)}
              className="w-full mt-4 py-2.5 bg-gold/10 border border-gold/20 rounded-lg text-[12px] font-bold text-gold hover:bg-gold/15 transition-colors"
            >
              Book a Consultation
            </button>
          )}
          {consultOpen && (
            <LawyerConsultationModal
              lawyerId={profile.id}
              lawyerName={profile.full_name || 'this lawyer'}
              lawyerFee={lawyer.default_fee ?? 0}
              onClose={() => setConsultOpen(false)}
            />
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[15px] font-bold text-white mb-4">
            Reviews ({reviews.length})
          </h2>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-ink border border-white/6 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gold/20 rounded-xl flex items-center justify-center text-gold text-[11px] font-bold flex-shrink-0 overflow-hidden">
                      {r.reviewer?.avatar_url ? (
                        <img src={r.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (r.reviewer?.full_name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <p className="text-[12px] font-semibold text-white">{r.reviewer?.full_name || 'Handova User'}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'fill-gold text-gold' : 'text-white/15'}`} />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-[12px] text-white/50 leading-relaxed">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={lawyer && listings.length === 0 ? 'hidden' : ''}>
        <h2 className="text-[15px] font-bold text-white mb-4">
          {listings.length > 0 ? `${listings.length} Active Listing${listings.length !== 1 ? 's' : ''}` : 'Listings'}
        </h2>
        {listings.length === 0 ? (
          <div className="bg-ink border border-white/6 rounded-2xl p-12 text-center">
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
