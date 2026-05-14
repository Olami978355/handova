import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home, Shield, MessageSquare, Plus, Loader2,
  AlertCircle, CheckCircle, Clock, ArrowRight,
  User, CreditCard, Calendar, Search, Settings,
  MapPin, RefreshCw, FileText, TrendingUp, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Property, Deal, InspectionBooking } from '../types';

// ─── Logo ─────────────────────────────────────────────────────────
const RentEasyLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="18" fill="#1a6b3c" />
    <path d="M16 54 L16 32 L40 14 L64 32 L64 54" stroke="#f0c040" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 54 L28 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M54 54 L64 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 54 L28 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="28" cy="38" r="6" fill="none" stroke="white" strokeWidth="3" />
    <path d="M32 54 L32 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 54 L36 51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="43" y="42" width="16" height="13" rx="3" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="2" />
    <path d="M46 42 L46 38 Q46 35 51 35 Q56 35 56 38 L56 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M47.5 48.5 L50 51 L54.5 46" stroke="#f0c040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Format Naira ─────────────────────────────────────────────────
const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

// ─── Relative time ────────────────────────────────────────────────
const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

// ─── Stat Card (square) ───────────────────────────────────────────
const StatCard = ({
  icon: Icon, value, label, color = '#f0c040', onClick
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color?: string;
  onClick?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`bg-[#0a1f11] border border-white/6 rounded-2xl p-5 flex flex-col justify-between aspect-square hover:border-white/12 transition-all ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: `${color}15`, border: `1px solid ${color}25` }}
    >
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div>
      <div className="text-[28px] font-black text-white leading-none mb-1">{value}</div>
      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider">{label}</div>
    </div>
  </motion.div>
);

// ─── Deal status badge ────────────────────────────────────────────
const DealBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending_payment:   { label: 'Pending Payment', color: '#f0c040', bg: 'rgba(240,192,64,0.1)' },
    payment_received:  { label: 'Payment Received', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    agreement_sent:    { label: 'Agreement Sent', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    agreement_signed:  { label: 'Agreement Signed', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    move_in_confirmed: { label: 'Move-in Confirmed', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    funds_released:    { label: 'Completed', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    disputed:          { label: 'Disputed', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  };
  const style = map[status] || { label: status, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize"
      style={{ color: style.color, background: style.bg }}
    >
      {style.label}
    </span>
  );
};

// ─── Booking status badge ─────────────────────────────────────────
const BookingBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending_payment:     { label: 'Pending Payment', color: '#f0c040', bg: 'rgba(240,192,64,0.1)' },
    payment_confirmed:   { label: 'Confirmed', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    inspection_scheduled:{ label: 'Scheduled', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    inspection_done:     { label: 'Inspection Done', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    tenant_interested:   { label: 'Interested', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    tenant_declined:     { label: 'Declined', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    escrow_started:      { label: 'Escrow Started', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    refunded:            { label: 'Refunded', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    dispute_raised:      { label: 'Dispute Raised', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  };
  const style = map[status] || { label: status, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' };
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
      style={{ color: style.color, background: style.bg }}
    >
      {style.label}
    </span>
  );
};

// ─── Empty state ──────────────────────────────────────────────────
const EmptyState = ({
  icon: Icon, title, desc, action, actionLabel
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  action?: () => void;
  actionLabel?: string;
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-white/20" />
    </div>
    <p className="text-[14px] font-semibold text-white/40 mb-1">{title}</p>
    <p className="text-[12px] text-white/25 mb-4">{desc}</p>
    {action && actionLabel && (
      <button
        onClick={action}
        className="text-[12px] font-semibold text-[#f0c040]/70 hover:text-[#f0c040] transition-colors flex items-center gap-1"
      >
        {actionLabel} <ArrowRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ─── Skeleton loader ──────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#0a1f11] rounded-2xl aspect-square skeleton" />
      ))}
    </div>
    <div className="bg-[#0a1f11] rounded-2xl h-64 skeleton" />
    <div className="bg-[#0a1f11] rounded-2xl h-48 skeleton" />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [bookings, setBookings] = useState<InspectionBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !profile?.role) return;
    setLoading(true);
    setError(null);

    try {
      if (profile.role === 'tenant') {
        const [dealsRes, bookingsRes] = await Promise.all([
          supabase
            .from('deals')
            .select('*, properties(id, title, images, address, state)')
            .eq('tenant_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('inspection_bookings')
            .select('*, properties(id, title, images, address, state)')
            .eq('tenant_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);
        setDeals(dealsRes.data || []);
        setBookings(bookingsRes.data || []);

      } else {
        // landlord or agent
        const propsRes = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        const propIds = (propsRes.data || []).map(p => p.id);
        setProperties(propsRes.data || []);

        const [dealsRes, bookingsRes] = await Promise.all([
          supabase
            .from('deals')
            .select('*, properties(id, title, images, address, state), profiles!deals_tenant_id_fkey(full_name, avatar_url)')
            .or(`landlord_id.eq.${user.id},agent_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(5),
          propIds.length > 0
            ? supabase
                .from('inspection_bookings')
                .select('*, properties(id, title, images), profiles!inspection_bookings_tenant_id_fkey(full_name, avatar_url)')
                .in('property_id', propIds)
                .eq('status', 'payment_confirmed')
                .order('created_at', { ascending: false })
                .limit(5)
            : Promise.resolve({ data: [] }),
        ]);
        setDeals(dealsRes.data || []);
        setBookings((bookingsRes as { data: InspectionBooking[] | null }).data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { navigate('/login'); return; }
      if (!profile?.role) { navigate('/onboarding'); return; }
      fetchData();
    }
  }, [authLoading, user, profile]);

  // ── Error state ──
  if (error) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-5 text-center"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h2 className="text-[18px] font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-[13px] text-white/45 mb-6 max-w-xs">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-[#1a6b3c] text-white px-6 py-3 rounded-xl font-semibold text-[14px] hover:bg-[#0f4a2a] transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const isTenant = profile?.role === 'tenant';
  const isLandlordOrAgent = profile?.role === 'landlord' || profile?.role === 'agent';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const activeListings = properties.filter(p => p.status === 'active').length;
  const pendingListings = properties.filter(p => p.status === 'pending_review').length;

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Hero header ── */}
      <div className="bg-[#0a1f11] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 bg-[#1a6b3c] rounded-2xl overflow-hidden flex items-center justify-center text-white text-[18px] font-black flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (profile?.full_name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-[22px] font-black text-white tracking-tight leading-tight">
                  Hello, {firstName}!
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-white/45 capitalize font-medium">
                    {profile?.role}
                  </span>
                  <span className="text-white/20">·</span>
                  {profile?.verification_status === 'verified' ? (
                    <span className="flex items-center gap-1 text-[12px] text-[#4ade80] font-medium">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  ) : profile?.verification_status === 'pending_verification' ? (
                    <span className="flex items-center gap-1 text-[12px] text-[#f0c040] font-medium">
                      <Clock className="w-3 h-3" /> Under review
                    </span>
                  ) : (
                    <Link
                      to="/verification"
                      className="flex items-center gap-1 text-[12px] text-white/40 hover:text-[#f0c040] transition-colors font-medium"
                    >
                      <Shield className="w-3 h-3" /> Get verified
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLandlordOrAgent && (
                <Link
                  to="/add-property"
                  className="flex items-center gap-1.5 bg-[#f0c040] text-black px-4 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#e0b030] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">List Property</span>
                </Link>
              )}
              <Link
                to="/profile"
                className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-all"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6">

            {/* ── Verification nudge ── */}
            {profile?.verification_status === 'unverified' && isLandlordOrAgent && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a1f11] border border-[#f0c040]/20 rounded-2xl p-5 flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-[#f0c040]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[#f0c040]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-white mb-1">
                    Get verified to go live instantly
                  </p>
                  <p className="text-[12px] text-white/45 mb-3">
                    Verified listings go live immediately. Unverified listings wait for moderator review.
                  </p>
                  <Link
                    to="/verification"
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#f0c040] hover:text-[#e0b030] transition-colors"
                  >
                    Start verification <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ── Stat cards (square grid) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isTenant ? (
                <>
                  <StatCard icon={Calendar} value={bookings.length} label="Inspection bookings" color="#f0c040" />
                  <StatCard icon={CreditCard} value={deals.length} label="Escrow deals" color="#4ade80" />
                  <StatCard
                    icon={MessageSquare}
                    value={0}
                    label="Unread messages"
                    color="#60a5fa"
                    onClick={() => navigate('/messages')}
                  />
                  <StatCard icon={Heart} value={0} label="Saved properties" color="#f87171" onClick={() => navigate('/listings')} />
                </>
              ) : (
                <>
                  <StatCard icon={Home} value={activeListings} label="Active listings" color="#4ade80" onClick={() => navigate('/listings')} />
                  <StatCard icon={Clock} value={pendingListings} label="Pending review" color="#f0c040" />
                  <StatCard icon={CreditCard} value={deals.length} label="Escrow deals" color="#a78bfa" />
                  <StatCard icon={Calendar} value={bookings.length} label="New bookings" color="#f0c040" onClick={() => navigate('/messages')} />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">

                {/* ── Escrow deals ── */}
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h2 className="text-[15px] font-bold text-white">Escrow Deals</h2>
                    <Shield className="w-4 h-4 text-[#1a6b3c]" />
                  </div>

                  {deals.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="No active deals"
                      desc={isTenant
                        ? "Book an inspection to start your first deal"
                        : "Deals will appear here when tenants pay inspection fees"
                      }
                      action={isTenant ? () => navigate('/listings') : undefined}
                      actionLabel={isTenant ? "Browse properties" : undefined}
                    />
                  ) : (
                    <div className="divide-y divide-white/4">
                      {deals.map(deal => (
                        <Link
                          key={deal.id}
                          to={`/deals/${deal.id}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors group"
                        >
                          {/* Property image */}
                          <div className="w-12 h-12 bg-[#111a14] rounded-xl overflow-hidden flex-shrink-0">
                            {deal.properties?.images?.[0] ? (
                              <img
                                src={deal.properties.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-5 h-5 text-white/15" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white truncate">
                              {deal.properties?.title || 'Property'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <DealBadge status={deal.status} />
                              <span className="text-[12px] text-[#f0c040] font-medium">
                                {formatNaira(deal.amount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-white/30">
                              {timeAgo(deal.created_at)}
                            </span>
                            <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#f0c040] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Inspection bookings ── */}
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h2 className="text-[15px] font-bold text-white">
                      {isTenant ? 'My Inspection Bookings' : 'Pending Inspection Requests'}
                    </h2>
                    <Calendar className="w-4 h-4 text-[#1a6b3c]" />
                  </div>

                  {bookings.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title={isTenant ? "No inspection bookings yet" : "No pending inspections"}
                      desc={isTenant
                        ? "Find a property and book an inspection to get started"
                        : "Inspection requests from tenants will appear here"
                      }
                      action={isTenant ? () => navigate('/listings') : undefined}
                      actionLabel={isTenant ? "Find properties" : undefined}
                    />
                  ) : (
                    <div className="divide-y divide-white/4">
                      {bookings.map(booking => (
                        <div
                          key={booking.id}
                          className="flex items-center gap-4 px-5 py-4"
                        >
                          <div className="w-12 h-12 bg-[#111a14] rounded-xl overflow-hidden flex-shrink-0">
                            {booking.properties?.images?.[0] ? (
                              <img
                                src={booking.properties.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-5 h-5 text-white/15" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white truncate">
                              {booking.properties?.title || 'Property'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <BookingBadge status={booking.status} />
                              <span className="text-[12px] text-white/40">
                                {formatNaira(booking.inspection_fee)} fee
                              </span>
                            </div>
                          </div>

                          <span className="text-[11px] text-white/30 flex-shrink-0">
                            {timeAgo(booking.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Landlord: My listings ── */}
                {isLandlordOrAgent && properties.length > 0 && (
                  <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <h2 className="text-[15px] font-bold text-white">My Listings</h2>
                      <Link
                        to="/add-property"
                        className="flex items-center gap-1 text-[12px] font-semibold text-[#f0c040] hover:text-[#e0b030] transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add new
                      </Link>
                    </div>

                    <div className="divide-y divide-white/4">
                      {properties.slice(0, 5).map(property => (
                        <div
                          key={property.id}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors"
                        >
                          <div className="w-12 h-12 bg-[#111a14] rounded-xl overflow-hidden flex-shrink-0">
                            {property.images?.[0] ? (
                              <img
                                src={property.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-5 h-5 text-white/15" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white truncate">{property.title}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <MapPin className="w-3 h-3 text-white/25" />
                              <span className="text-[11px] text-white/35 truncate">
                                {property.lga}, {property.state}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              property.status === 'active'
                                ? 'bg-[#4ade80]/10 text-[#4ade80]'
                                : property.status === 'pending_review'
                                ? 'bg-[#f0c040]/10 text-[#f0c040]'
                                : property.status === 'rented' || property.status === 'sold'
                                ? 'bg-white/8 text-white/40'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {property.status.replace('_', ' ')}
                            </span>
                            <Link to={`/property/${property.id}`}>
                              <Eye className="w-4 h-4 text-white/20 hover:text-white/60 transition-colors" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Sidebar ── */}
              <div className="space-y-4">

                {/* Quick actions */}
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                  <h3 className="text-[13px] font-bold text-white/50 uppercase tracking-wider mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    {isTenant ? (
                      <>
                        <QuickAction icon={Search} label="Browse Properties" to="/listings" />
                        <QuickAction icon={MessageSquare} label="Messages" to="/messages" />
                        <QuickAction icon={User} label="My Profile" to="/profile" />
                        <QuickAction icon={MapPin} label="Map View" to="/map" />
                      </>
                    ) : (
                      <>
                        <QuickAction icon={Plus} label="List a Property" to="/add-property" gold />
                        <QuickAction icon={MessageSquare} label="Messages" to="/messages" />
                        <QuickAction icon={Shield} label="Get Verified" to="/verification" />
                        <QuickAction icon={User} label="My Profile" to="/profile" />
                      </>
                    )}
                  </div>
                </div>

                {/* Platform ID card */}
                {(profile?.agent_id || profile?.landlord_id) && (
                  <div className="bg-[#0a1f11] border border-[#f0c040]/15 rounded-2xl p-5">
                    <div className="text-[10px] font-bold text-[#f0c040] uppercase tracking-widest mb-3">
                      Your Platform ID
                    </div>
                    <div className="font-mono text-[14px] font-bold text-white">
                      {profile.agent_id || profile.landlord_id}
                    </div>
                    <p className="text-[11px] text-white/30 mt-2">
                      Share this on your listings and business card
                    </p>
                  </div>
                )}

                {/* Barrister Amaka card */}
                <div className="bg-[#0a1f11] border border-[#f0c040]/15 rounded-2xl overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <div className="text-[9px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
                      Know Your Rights
                    </div>
                    <div className="flex items-start gap-3">
                      {/* Mini Barrister Amaka */}
                      <svg width="44" height="60" viewBox="0 0 80 110" fill="none" className="flex-shrink-0">
                        <rect x="18" y="55" width="44" height="55" rx="6" fill="#1a1a2e" />
                        <rect x="22" y="58" width="36" height="50" rx="4" fill="#16213e" />
                        <rect x="28" y="55" width="24" height="8" rx="2" fill="#e8e8e8" />
                        <ellipse cx="40" cy="58" rx="16" ry="18" fill="#f5c5a3" />
                        <ellipse cx="40" cy="44" rx="18" ry="14" fill="#2c1810" />
                        <ellipse cx="40" cy="40" rx="16" ry="12" fill="#3d2314" />
                        <ellipse cx="40" cy="58" rx="10" ry="11" fill="#f0b088" />
                        <ellipse cx="35" cy="56" rx="2" ry="2.5" fill="#3d2314" />
                        <ellipse cx="45" cy="56" rx="2" ry="2.5" fill="#3d2314" />
                        <path d="M36 63 Q40 66 44 63" stroke="#c07060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        <rect x="14" y="65" width="12" height="30" rx="4" fill="#1a1a2e" />
                        <rect x="54" y="65" width="12" height="30" rx="4" fill="#1a1a2e" />
                        <rect x="24" y="80" width="32" height="6" rx="2" fill="#1a6b3c" />
                        <text x="40" y="85" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#fff">BARRISTER AMAKA</text>
                      </svg>
                      <div>
                        <p className="text-[12px] font-semibold text-white leading-snug mb-1">
                          {isTenant
                            ? 'Your landlord cannot evict you without a court order'
                            : 'You must give proper notice before any rent increase'
                          }
                        </p>
                        <p className="text-[10px] text-white/30">
                          {isTenant ? 'Tenancy Law of Lagos State 2011' : 'Recovery of Premises Act'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/legal-guide"
                    className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-[11px] font-semibold text-[#f0c040]/60 hover:text-[#f0c040] transition-colors"
                  >
                    View all rights <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <BottomTabBar active="dashboard" role={profile?.role} />
    </div>
  );
}

// ─── Quick action link ────────────────────────────────────────────
const QuickAction = ({
  icon: Icon, label, to, gold = false
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  gold?: boolean;
}) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
      gold
        ? 'bg-[#f0c040]/10 text-[#f0c040] hover:bg-[#f0c040]/15'
        : 'text-white/55 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon className="w-4 h-4 flex-shrink-0" />
    {label}
  </Link>
);

// ─── Bottom tab bar ───────────────────────────────────────────────
const BottomTabBar = ({
  active, role
}: {
  active: string;
  role?: string;
}) => {
  const navigate = useNavigate();

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: role === 'landlord' ? '/landlord/dashboard' : role === 'agent' ? '/agent/dashboard' : '/dashboard' },
    { id: 'search', icon: Search, label: 'Search', path: '/listings' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', path: '/messages' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="bottom-tab-bar lg:hidden">
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex-1 flex flex-col items-center gap-1 pt-1"
          >
            <tab.icon
              className="w-5 h-5 transition-colors"
              style={{ color: isActive ? '#f0c040' : 'rgba(255,255,255,0.3)' }}
            />
            <span
              className="text-[10px] font-semibold transition-colors"
              style={{ color: isActive ? '#f0c040' : 'rgba(255,255,255,0.3)' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};