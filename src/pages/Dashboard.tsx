import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home, Shield, MessageSquare, Plus, Loader2,
  AlertCircle, CheckCircle, Clock, ArrowRight,
  User, CreditCard, Calendar, Search, Settings,
  MapPin, RefreshCw, Eye, EyeOff, Heart, Pencil, Trash2, AlertTriangle, Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, requireValidSession  } from '../lib/supabase';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { Property, Deal, InspectionBooking } from '../types';

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

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

const DealBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending_payment:   { label: 'Pending Payment',   color: '#f0c040', bg: 'rgba(240,192,64,0.1)' },
    payment_received:  { label: 'Payment Received',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    agreement_sent:    { label: 'Awaiting Signatures', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    agreement_signed:  { label: 'Agreement Signed',  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    move_in_confirmed: { label: 'Move-in Confirmed', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    funds_released:    { label: 'Completed',       color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    disputed:          { label: 'Disputed',           color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  };
  const s = map[status] || {
    label: status.replace(/_/g, ' '),
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.1)',
  };
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
};

const BookingBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending_payment:      { label: 'Awaiting Payment',          color: '#f0c040', bg: 'rgba(240,192,64,0.1)' },
    payment_confirmed:    { label: 'Paid — Awaiting Confirmation', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    inspection_scheduled: { label: 'Visit Scheduled',           color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    inspection_done:      { label: 'Visit Completed',           color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    tenant_interested:    { label: 'Interested',                color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    tenant_declined:      { label: 'Declined',                  color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    escrow_started:       { label: 'Deal In Progress',          color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    refunded:             { label: 'Refunded',                  color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
    dispute_raised:       { label: 'Dispute Open',              color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
    dispute_resolved:     { label: 'Dispute Resolved',          color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  };
  const s = map[status] || {
    label: status.replace(/_/g, ' '),
    color: '#9ca3af',
    bg: 'rgba(156,163,175,0.1)',
  };
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
};

const EmptyState = ({
  icon: Icon, title, desc, action, actionLabel,
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

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#0a1f11] rounded-2xl aspect-square animate-pulse" />
      ))}
    </div>
    <div className="bg-[#0a1f11] rounded-2xl h-64 animate-pulse" />
    <div className="bg-[#0a1f11] rounded-2xl h-48 animate-pulse" />
  </div>
);

// ── Landlord booking card ──────────────────────────────────────
const LandlordBookingCard = ({
  booking,
  onConfirm,
}: {
  booking: InspectionBooking & { profiles?: { full_name: string; avatar_url?: string } };
  onConfirm: (bookingId: string) => void;
}) => {
  const [confirmedDate, setConfirmedDate] = useState('');
  const [confirmedTime, setConfirmedTime] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleConfirm = async () => {
    if (!confirmedDate || !confirmedTime) return;
    setConfirming(true);
    try {
      const { error } = await supabase
        .from('inspection_bookings')
        .update({
          status: 'inspection_scheduled',
          confirmed_date: confirmedDate,
          confirmed_time: confirmedTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: booking.tenant_id,
        title: 'Inspection Date Confirmed!',
        body: `Your inspection for ${booking.properties?.title} has been confirmed for ${
          new Date(confirmedDate).toLocaleDateString('en-NG', {
            weekday: 'long', day: 'numeric', month: 'long',
          })
        } ${confirmedTime}.`,
        type: 'inspection_confirmed',
        link: '/dashboard',
      });

      onConfirm(booking.id);
    } catch (err) {
      console.error('Failed to confirm inspection:', err);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-4 border border-[#f0c040]/20 bg-[#f0c040]/4 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#1a6b3c]/20 rounded-xl flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
          {booking.profiles?.full_name?.charAt(0)?.toUpperCase() || 'T'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white flex items-center gap-1">
            <span>{booking.profiles?.full_name || 'Tenant'}</span>
            <VerifiedBadge status={booking.profiles?.verification_status} size={12} />
          </p>
          <p className="text-[11px] text-white/40 truncate">{booking.properties?.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <BookingBadge status={booking.status} />
            <span className="text-[10px] text-white/30">{timeAgo(booking.created_at)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[12px] font-black text-[#f0c040]">
            {formatNaira(booking.inspection_fee)}
          </p>
          <p className="text-[10px] text-white/25">fee paid</p>
        </div>
      </div>

      {booking.preferred_date && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white/4 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[11px] text-white/50">
            Requested:{' '}
            {new Date(booking.preferred_date).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short',
            })}
            {booking.preferred_time && ` · ${booking.preferred_time}`}
          </span>
        </div>
      )}

      {booking.status === 'payment_confirmed' && (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-[#f0c040] text-black py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#e0b030] transition-colors"
            >
              Confirm Inspection Date
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={confirmedDate}
                onChange={e => setConfirmedDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#f0c040]/50"
              />
              <select
                value={confirmedTime}
                onChange={e => setConfirmedTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0a1f11] border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#f0c040]/50"
              >
                <option value="" className="bg-[#0a1f11]">Select time</option>
                <option value="Morning (9AM - 12PM)" className="bg-[#0a1f11]">Morning (9AM – 12PM)</option>
                <option value="Afternoon (12PM - 3PM)" className="bg-[#0a1f11]">Afternoon (12PM – 3PM)</option>
                <option value="Late Afternoon (3PM - 6PM)" className="bg-[#0a1f11]">Late Afternoon (3PM – 6PM)</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 text-[13px] text-white/40 hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!confirmedDate || !confirmedTime || confirming}
                  className="flex-[2] bg-[#f0c040] text-black py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {confirming
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Confirm Date'
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {booking.status === 'inspection_scheduled' && booking.confirmed_date && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a6b3c]/10 border border-[#1a6b3c]/20 rounded-xl">
          <CheckCircle className="w-3.5 h-3.5 text-[#4ade80]" />
          <span className="text-[11px] text-[#4ade80] font-semibold">
            Confirmed:{' '}
            {new Date(booking.confirmed_date).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short',
            })}
            {booking.confirmed_time && ` · ${booking.confirmed_time}`}
          </span>
        </div>
      )}
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<Property[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [bookings, setBookings] = useState<InspectionBooking[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteListing = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke('delete-listing', {
        body: { propertyId: deleteTarget.id },
      });
      if (error) throw error;
      setProperties(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete listing';
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleDelist = async (property: Property) => {
    try {
      if (!(await requireValidSession())) return;
      const { error } = await supabase.functions.invoke('delist-listing', {
        body: { propertyId: property.id, delist: !property.is_delisted },
      });
      if (error) throw error;
      setProperties(prev => prev.map(p => p.id === property.id ? { ...p, is_delisted: !p.is_delisted } : p));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update listing visibility';
      alert(msg);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user || !profile?.role) return;
    setLoading(true);
    setError(null);

    try {
      if (profile.role === 'tenant') {
        // ── Tenant fetch ──────────────────────────────────────
        // Deals — separate try/catch so one failure
        // does not kill the entire dashboard
        try {
          const { data, error: err } = await supabase
            .from('deals')
            .select('*, properties(id, title, images, address, state, lga)')
            .eq('tenant_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (err) console.error('Deals error:', err.message);
          else setDeals(data || []);
        } catch (e) {
          console.error('Deals fetch failed:', e);
        }

        // Bookings — separate try/catch
        try {
          const { data, error: err } = await supabase
            .from('inspection_bookings')
            .select('*, properties(id, title, images, address, state, lga)')
            .eq('tenant_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (err) console.error('Bookings error:', err.message);
          else setBookings(data || []);
        } catch (e) {
          console.error('Bookings fetch failed:', e);
        }

        // Saved properties — completely optional
        try {
          const { data, error: err } = await supabase
            .from('saved_properties')
            .select('*, properties(id, title, images, address, lga, state, price, price_period, transaction_type)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(6);
          if (!err && data) {
            setSavedProperties(
              data
                .map((s: { properties: Property | null }) => s.properties)
                .filter(Boolean) as Property[]
            );
          }
        } catch {
          // Table may not exist — silent fail
        }

} else {
  // ── Landlord / Agent fetch ────────────────────────────

  // Properties
  try {
    const { data, error: err } = await supabase
      .from('properties')
      .select('*')
      .or(`owner_id.eq.${user.id},agent_id.eq.${user.id}`).is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (err) console.error('Properties error:', err.message);
    else setProperties(data || []);

    // Bookings for landlord's properties — only if we have properties
    const propIds = (data || []).map(p => p.id);
    if (propIds.length > 0) {
      try {
        const { data: bookingsData, error: bookingsErr } = await supabase
          .from('inspection_bookings')
          .select('*, properties(id, title, images)')
          .in('property_id', propIds)
          .in('status', [
            'payment_confirmed',
            'inspection_scheduled',
            'inspection_done',
            'tenant_interested',
          ])
          .order('created_at', { ascending: false })
          .limit(20);

        if (bookingsErr) {
          console.error('Bookings error:', bookingsErr.message);
        } else {
          const tenantIds = [
            ...new Set((bookingsData || []).map(b => b.tenant_id).filter(Boolean))
          ] as string[];

          let tenantMap: Record<string, { full_name: string; avatar_url?: string }> = {};

          if (tenantIds.length > 0) {
            const { data: tenantProfiles } = await supabase
              .from('public_profiles')
              .select('id, full_name, avatar_url, verification_status')
              .in('id', tenantIds);

            if (tenantProfiles) {
              tenantMap = Object.fromEntries(
                tenantProfiles.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
              );
            }
          }

          const enrichedBookings = (bookingsData || []).map(b => ({
            ...b,
            profiles: tenantMap[b.tenant_id] || null,
          }));

          setBookings(enrichedBookings);
        }
      } catch (e) {
        console.error('Bookings fetch failed:', e);
      }
    }
  } catch (e) {
    console.error('Properties fetch failed:', e);
  }

  // Deals — split into two queries to avoid .or() crashing
  // when one FK column is null
  try {
    const [landlordDeals, agentDeals] = await Promise.all([
      supabase
        .from('deals')
        .select('*, properties(id, title, images, address, state, lga)')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('deals')
        .select('*, properties(id, title, images, address, state, lga)')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const combined = [
      ...(landlordDeals.data || []),
      ...(agentDeals.data || []),
    ];

    const seen = new Set<string>();
    const deduped = combined
      .filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    setDeals(deduped);
  } catch (e) {
    console.error('Deals fetch failed:', e);
  }
}
} catch (err: unknown) {
const msg = err instanceof Error ? err.message : 'Failed to load dashboard';
setError(msg);
} finally {
setLoading(false);
}
}, [user?.id, profile?.role]);

useEffect(() => {
if (!authLoading) {
  if (!user) { navigate('/login'); return; }
  if (!profile?.role) { navigate('/onboarding'); return; }
  fetchData();
}
}, [authLoading, user?.id, profile?.role]);

const handleBookingConfirmed = (bookingId: string) => {
setBookings(prev =>
  prev.map(b =>
    b.id === bookingId
      ? { ...b, status: 'inspection_scheduled' as const }
      : b
  )
);
};

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
  const isLandlordOrAgent =
    profile?.role === 'landlord' || profile?.role === 'agent';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const activeListings = properties.filter(p => p.status === 'active').length;
  const pendingListings = properties.filter(p => p.status === 'pending_review').length;
  const newBookings = bookings.filter(b => b.status === 'payment_confirmed').length;

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-[#0a1f11] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#1a6b3c] rounded-2xl overflow-hidden flex items-center justify-center text-white text-[18px] font-black flex-shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (profile?.full_name || 'U').charAt(0).toUpperCase()
                }
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
        {loading ? <DashboardSkeleton /> : (
          <div className="space-y-6">

            {/* Verification nudge */}
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
                    Get verified to list instantly
                  </p>
                  <p className="text-[12px] text-white/45 mb-3">
                    Verified accounts go live immediately. Unverified listings wait for moderator review.
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

            {/* New booking alert */}
            {isLandlordOrAgent && newBookings > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#f0c040]/8 border border-[#f0c040]/25 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-[#f0c040]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-[#f0c040]" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-white">
                    {newBookings} new inspection booking{newBookings > 1 ? 's' : ''}{' '}
                    need{newBookings === 1 ? 's' : ''} your confirmation
                  </p>
                  <p className="text-[11px] text-white/40">
                    Confirm the date and time for each tenant below
                  </p>
                </div>
              </motion.div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isTenant ? (
                <>
                  <StatCard
                    icon={Calendar}
                    value={bookings.length}
                    label="Inspections"
                    color="#f0c040"
                  />
                  <StatCard
                    icon={CreditCard}
                    value={deals.length}
                    label="Escrow deals"
                    color="#4ade80"
                  />
                  <StatCard
                    icon={Heart}
                    value={savedProperties.length}
                    label="Saved"
                    color="#f87171"
                    onClick={() => navigate('/listings')}
                  />
                  <StatCard
                    icon={Search}
                    value="→"
                    label="Browse"
                    color="#a78bfa"
                    onClick={() => navigate('/listings')}
                  />
                </>
              ) : (
                <>
                  <StatCard
                    icon={Home}
                    value={activeListings}
                    label="Active listings"
                    color="#4ade80"
                    onClick={() => navigate('/listings')}
                  />
                  <StatCard
                    icon={Clock}
                    value={pendingListings}
                    label="Pending review"
                    color="#f0c040"
                  />
                  <StatCard
                    icon={CreditCard}
                    value={deals.length}
                    label="Escrow deals"
                    color="#a78bfa"
                  />
                  <StatCard
                    icon={Calendar}
                    value={newBookings}
                    label="New bookings"
                    color={newBookings > 0 ? '#f0c040' : '#4ade80'}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">

                {/* Landlord: Inspection Requests */}
                {isLandlordOrAgent && (
                  <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <div>
                        <h2 className="text-[15px] font-bold text-white">Inspection Requests</h2>
                        <p className="text-[11px] text-white/35 mt-0.5">
                          Tenants who paid to view your properties
                        </p>
                      </div>
                      {newBookings > 0 && (
                        <span className="text-[11px] font-bold text-[#f0c040] bg-[#f0c040]/10 px-2.5 py-1 rounded-xl">
                          {newBookings} new
                        </span>
                      )}
                    </div>
                    {bookings.length === 0 ? (
                      <EmptyState
                        icon={Calendar}
                        title="No inspection requests yet"
                        desc="When tenants pay inspection fees for your properties they will appear here."
                      />
                    ) : (
                      <div className="p-4 space-y-3">
                        {bookings.map(booking => (
                          <LandlordBookingCard
                            key={booking.id}
                            booking={
                              booking as InspectionBooking & {
                                profiles?: { full_name: string; avatar_url?: string };
                              }
                            }
                            onConfirm={handleBookingConfirmed}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tenant: My Inspection Bookings */}
                {isTenant && (
                  <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <div>
                        <h2 className="text-[15px] font-bold text-white">My Inspection Bookings</h2>
                        <p className="text-[11px] text-white/35 mt-0.5">Properties you have booked to view</p>
                      </div>
                      <Calendar className="w-4 h-4 text-[#1a6b3c]" />
                    </div>
                    {bookings.length === 0 ? (
                      <EmptyState
                        icon={Calendar}
                        title="No inspections booked yet"
                        desc="Find a property you like and book an inspection to get started"
                        action={() => navigate('/listings')}
                        actionLabel="Browse properties"
                      />
                    ) : (
                      <div className="divide-y divide-white/4">
                        {bookings.map(booking => (
                          <div key={booking.id} className="px-5 py-4">
                            <div className="flex items-center gap-3 mb-3">
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
                                <p className="text-[11px] text-white/35">
                                  {booking.properties?.lga}, {booking.properties?.state}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[12px] font-black text-[#f0c040]">
                                  {formatNaira(booking.inspection_fee)}
                                </p>
                                <p className="text-[10px] text-white/25">paid</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <BookingBadge status={booking.status} />
                              <span className="text-[11px] text-white/30">
                                {timeAgo(booking.created_at)}
                              </span>
                            </div>

                            {booking.confirmed_date && (
                              <div className="flex items-center gap-2 mt-2 p-2.5 bg-[#1a6b3c]/8 border border-[#1a6b3c]/15 rounded-xl">
                                <CheckCircle className="w-3.5 h-3.5 text-[#4ade80]" />
                                <span className="text-[11px] font-semibold text-[#4ade80]">
                                  Visit confirmed:{' '}
                                  {new Date(booking.confirmed_date).toLocaleDateString('en-NG', {
                                    weekday: 'short', day: 'numeric', month: 'short',
                                  })}
                                  {booking.confirmed_time && ` · ${booking.confirmed_time}`}
                                </span>
                              </div>
                            )}

                            {booking.status === 'inspection_done' && (
                              <div className="mt-2 p-3 bg-[#f0c040]/6 border border-[#f0c040]/15 rounded-xl">
                                <p className="text-[11px] text-[#f0c040] font-semibold mb-1">
                                  Did you like the property?
                                </p>
                                <p className="text-[10px] text-white/35">
                                  Contact the landlord or agent to proceed. They can send you a deal offer in chat.
                                </p>
                              </div>
                            )}

                            {booking.status === 'escrow_started' && (
                              <Link
                                to="/dashboard"
                                className="mt-2 flex items-center justify-center gap-2 py-2.5 bg-[#1a6b3c] text-white rounded-xl font-bold text-[12px] hover:bg-[#0f4a2a] transition-colors"
                              >
                                Complete your deal <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            )}

                            {(booking.status === 'tenant_declined' || booking.status === 'refunded') &&
                              booking.refund_amount && (
                                <div className="mt-2 flex items-center gap-2 p-2.5 bg-white/4 border border-white/6 rounded-xl">
                                  <CheckCircle className="w-3.5 h-3.5 text-[#4ade80]" />
                                  <span className="text-[11px] text-white/45">
                                    Refund of {formatNaira(booking.refund_amount)} processed
                                  </span>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tenant: Saved Properties */}
                {isTenant && (
                  <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <div>
                        <h2 className="text-[15px] font-bold text-white">Saved Properties</h2>
                        <p className="text-[11px] text-white/35 mt-0.5">Properties you hearted</p>
                      </div>
                      <Heart className="w-4 h-4 text-red-400" />
                    </div>
                    {savedProperties.length === 0 ? (
                      <EmptyState
                        icon={Heart}
                        title="No saved properties yet"
                        desc="Tap the heart icon on any property to save it here"
                        action={() => navigate('/listings')}
                        actionLabel="Browse properties"
                      />
                    ) : (
                      <div className="flex gap-3 p-4 overflow-x-auto scrollbar-hide" style={{scrollbarWidth:"none"}}>
                        {savedProperties.map(property => property && (
                          <Link
                            key={property.id}
                            to={`/property/${property.id}`}
                            className="bg-[#111a14] border border-white/6 rounded-xl overflow-hidden hover:border-[#f0c040]/20 transition-all flex-shrink-0 w-40"
                          >
                            <div className="h-24 overflow-hidden">
                              {property.images?.[0] ? (
                                <img
                                  src={property.images[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#0a1f11]">
                                  <Home className="w-5 h-5 text-white/15" />
                                </div>
                              )}
                            </div>
                            <div className="p-2.5">
                              <p className="text-[11px] font-bold text-white truncate">
                                {property.title}
                              </p>
                              <p className="text-[12px] font-black text-[#f0c040] mt-0.5">
                                {formatNaira(property.price)}
                                {property.price_period === 'yearly' && '/yr'}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Escrow Deals */}
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div>
                      <h2 className="text-[15px] font-bold text-white">Escrow Deals</h2>
                      <p className="text-[11px] text-white/35 mt-0.5">Active and completed transactions</p>
                    </div>
                    <Shield className="w-4 h-4 text-[#1a6b3c]" />
                  </div>
                  {deals.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="No escrow deals yet"
                      desc={
                        isTenant
                          ? 'Book an inspection first, then proceed to escrow'
                          : 'Deals appear here once tenants start escrow'
                      }
                      action={isTenant ? () => navigate('/listings') : undefined}
                      actionLabel={isTenant ? 'Browse properties' : undefined}
                    />
                  ) : (
                    <div className="divide-y divide-white/4">
                      {deals.map(deal => (
                        <Link
                          key={deal.id}
                          to={`/deals/${deal.id}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors group"
                        >
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

                {/* Landlord: My Listings */}
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
                            <p className="text-[13px] font-semibold text-white truncate">
                              {property.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-white/25" />
                              <span className="text-[11px] text-white/35 truncate">
                                {property.lga}, {property.state}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {property.agent_id === user?.id && property.owner_id !== user?.id && (
                              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#a78bfa]/10 text-[#a78bfa]">
                                Managing
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              property.is_rented
                                ? 'bg-white/8 text-white/40'
                                : property.status === 'active'
                                ? 'bg-[#4ade80]/10 text-[#4ade80]'
                                : property.status === 'pending_review'
                                ? 'bg-[#f0c040]/10 text-[#f0c040]'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {property.is_rented ? 'rented/sold' : property.status.replace(/_/g, ' ')}
                            </span>
                            <Link to={`/property/${property.id}`}>
                              <Eye className="w-4 h-4 text-white/20 hover:text-white/60 transition-colors" />
                            </Link>
                            <button
                              onClick={() => navigate(`/edit-property/${property.id}`)}
                              title="Edit listing"
                            >
                              <Pencil className="w-4 h-4 text-white/20 hover:text-white/60 transition-colors" />
                            </button>
                            <button
                              onClick={() => handleToggleDelist(property)}
                              title={property.is_delisted ? 'Re-list' : 'Delist'}
                            >
                              {property.is_delisted
                                ? <Eye className="w-4 h-4 text-[#f0c040] hover:text-[#e0b030] transition-colors" />
                                : <EyeOff className="w-4 h-4 text-white/20 hover:text-white/60 transition-colors" />
                              }
                            </button>
                            <button
                              onClick={() => setDeleteTarget(property)}
                              title="Delete listing"
                            >
                              <Trash2 className="w-4 h-4 text-white/20 hover:text-red-400 transition-colors" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deleteTarget && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5">
                    <div className="bg-[#0a1f11] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                      <h3 className="text-[15px] font-bold text-white mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" /> Delete Listing
                      </h3>
                      <p className="text-[13px] text-white/45 mb-5 leading-relaxed">
                        Are you sure you want to delete "{deleteTarget.title}"? This cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setDeleteTarget(null)}
                          disabled={deleting}
                          className="flex-1 py-3 rounded-xl font-bold text-[13px] text-white/40 hover:bg-white/5 transition-colors disabled:opacity-40"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteListing}
                          disabled={deleting}
                          className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-[13px] hover:bg-red-600 transition-all disabled:opacity-40"
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
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
                        <QuickAction icon={Users} label="My Delegates" to="/my-delegates" />
                      </>
                    ) : (
                      <>
                        <QuickAction icon={Plus} label="List a Property" to="/add-property" gold />
                        <QuickAction icon={MessageSquare} label="Messages" to="/messages" />
                        <QuickAction icon={Shield} label="Get Verified" to="/verification" />
                        <QuickAction icon={User} label="My Profile" to="/profile" />
                        <QuickAction icon={Users} label="My Delegates" to="/my-delegates" />
                      </>
                    )}
                  </div>
                </div>

                {(profile?.agent_id || profile?.landlord_id) && (
                  <div className="bg-[#0a1f11] border border-[#f0c040]/15 rounded-2xl p-5">
                    <div className="text-[10px] font-bold text-[#f0c040] uppercase tracking-widest mb-3">
                      Platform ID
                    </div>
                    <div className="font-mono text-[13px] font-bold text-white break-all">
                      {profile.agent_id || profile.landlord_id}
                    </div>
                    <p className="text-[11px] text-white/30 mt-2">Share on your business card</p>
                  </div>
                )}

                <div className="bg-[#0a1f11] border border-[#f0c040]/15 rounded-2xl overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <div className="text-[9px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
                      Know Your Rights
                    </div>
                    <div className="flex items-start gap-3">
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
                        <text x="40" y="85" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#fff">
                          BARRISTER AMAKA
                        </text>
                      </svg>
                      <div>
                        <p className="text-[12px] font-semibold text-white leading-snug mb-1">
                          {isTenant
                            ? 'Your landlord cannot evict you without a court order'
                            : 'You must give proper notice before any rent increase'
                          }
                        </p>
                        <p className="text-[10px] text-white/30">
                          {isTenant
                            ? 'Tenancy Law of Lagos State 2011'
                            : 'Recovery of Premises Act'
                          }
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

    </div>
  );
}

// ── Helper components ──────────────────────────────────────────
const QuickAction = ({
  icon: Icon, label, to, gold = false,
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
