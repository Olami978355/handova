import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home, Shield, MessageSquare, Plus, Loader2,
  AlertCircle, CheckCircle, Clock, ArrowRight,
  User, CreditCard, Calendar, Search, Settings,
  MapPin, RefreshCw, Eye, EyeOff, Heart, Pencil, Trash2, AlertTriangle, Users, Scale, Ban, Megaphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, requireValidSession } from '../lib/supabase';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { InspectionDelegateInvite } from '../components/inspection/InspectionDelegateInvite';
import { PendingInspectionDelegateInvites } from '../components/inspection/PendingInspectionDelegateInvites';
import { DelegateFeatureCard } from '../components/DelegateFeatureCard';
import { LawyerFeatureCard } from '../components/LawyerFeatureCard';
import { FeatureCarousel } from '../components/dashboard/FeatureCarousel';
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
  icon: Icon, value, label, onClick
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  onClick?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`bg-slate/20 border border-white/6 rounded-2xl p-5 flex flex-col justify-between aspect-square hover:border-white/12 transition-all ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="w-10 h-10 rounded-xl bg-gold/12 flex items-center justify-center">
      <Icon className="w-5 h-5 text-gold" />
    </div>
    <div>
      <div className="text-[28px] font-black text-paper leading-none mb-1 tabular-nums">{value}</div>
      <div className="text-[11px] text-paper/40 font-medium uppercase tracking-wider">{label}</div>
    </div>
  </motion.div>
);

const ActionTile = ({
  icon: Icon, label, onClick
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="bg-slate/20 border border-white/6 rounded-2xl p-5 flex flex-col justify-between aspect-square hover:border-gold/25 transition-all text-left"
  >
    <div className="w-10 h-10 rounded-xl bg-gold/12 flex items-center justify-center">
      <Icon className="w-5 h-5 text-gold" />
    </div>
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-bold text-paper">{label}</span>
      <ArrowRight className="w-4 h-4 text-paper/30" />
    </div>
  </button>
);

// Two-state badge system: gold = successfully completed, danger = a real
// problem, everything in between is calm neutral gray (in progress, nothing
// wrong yet). Matches the pattern already used for delegate status.
const DealBadge = ({ status }: { status: string }) => {
  const label = status.replace(/_/g, ' ');
  const tone =
    status === 'funds_released' ? 'gold' :
    status === 'disputed' ? 'danger' :
    'neutral';
  const classes =
    tone === 'gold' ? 'text-gold bg-gold/10' :
    tone === 'danger' ? 'text-danger bg-danger/10' :
    'text-paper/50 bg-white/6';
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize ${classes}`}>
      {label}
    </span>
  );
};

const BookingBadge = ({ status }: { status: string }) => {
  const labels: Record<string, string> = {
    pending_payment: 'Awaiting payment',
    payment_confirmed: 'Paid, awaiting confirmation',
    inspection_scheduled: 'Visit scheduled',
    inspection_done: 'Visit completed',
    tenant_interested: 'Interested',
    tenant_declined: 'Declined',
    escrow_started: 'Deal in progress',
    refunded: 'Refunded',
    dispute_raised: 'Dispute open',
    dispute_resolved: 'Dispute resolved',
  };
  const label = labels[status] || status.replace(/_/g, ' ');
  const isDanger = status === 'dispute_raised';
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${isDanger ? 'text-danger bg-danger/10' : 'text-paper/50 bg-white/6'}`}>
      {label}
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
      <Icon className="w-6 h-6 text-paper/20" />
    </div>
    <p className="text-[14px] font-semibold text-paper/40 mb-1">{title}</p>
    <p className="text-[12px] text-paper/25 mb-4">{desc}</p>
    {action && actionLabel && (
      <button
        onClick={action}
        className="text-[12px] font-semibold text-gold/70 hover:text-gold transition-colors flex items-center gap-1"
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
        <div key={i} className="bg-slate/20 rounded-2xl aspect-square animate-pulse" />
      ))}
    </div>
    <div className="bg-slate/20 rounded-2xl h-64 animate-pulse" />
    <div className="bg-slate/20 rounded-2xl h-48 animate-pulse" />
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
    <div className="p-4 border border-gold/20 bg-gold/4 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gold/15 rounded-xl flex items-center justify-center text-gold font-bold text-[13px] flex-shrink-0 overflow-hidden">
          {booking.profiles?.avatar_url ? (
            <img src={booking.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            booking.profiles?.full_name?.charAt(0)?.toUpperCase() || 'T'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-paper flex items-center gap-1">
            <span>{booking.profiles?.full_name || 'Tenant'}</span>
            <VerifiedBadge status={booking.profiles?.verification_status} size={12} />
          </p>
          <p className="text-[11px] text-paper/40 truncate">{booking.properties?.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <BookingBadge status={booking.status} />
            <span className="text-[10px] text-paper/30">{timeAgo(booking.created_at)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[12px] font-black text-gold tabular-nums">
            {formatNaira(booking.inspection_fee)}
          </p>
          <p className="text-[10px] text-paper/25">fee paid</p>
        </div>
      </div>

      {booking.preferred_date && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white/4 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-paper/30" />
          <span className="text-[11px] text-paper/50">
            Requested:{' '}
            {new Date(booking.preferred_date).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short',
            })}
            {booking.preferred_time && ` \u00b7 ${booking.preferred_time}`}
          </span>
        </div>
      )}

      {booking.status === 'payment_confirmed' && (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-gold text-ink py-2.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors"
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
                className="w-full px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper outline-none focus:border-gold/50"
              />
              <select
                value={confirmedTime}
                onChange={e => setConfirmedTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-ink border border-white/8 rounded-xl text-[13px] text-paper outline-none focus:border-gold/50"
              >
                <option value="" className="bg-ink">Select time</option>
                <option value="Morning (9AM - 12PM)" className="bg-ink">Morning (9AM to 12PM)</option>
                <option value="Afternoon (12PM - 3PM)" className="bg-ink">Afternoon (12PM to 3PM)</option>
                <option value="Late Afternoon (3PM - 6PM)" className="bg-ink">Late afternoon (3PM to 6PM)</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 text-[13px] text-paper/40 hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!confirmedDate || !confirmedTime || confirming}
                  className="flex-[2] bg-gold text-ink py-2.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
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
        <div className="flex items-center gap-2 px-3 py-2 bg-gold/10 border border-gold/20 rounded-xl">
          <CheckCircle className="w-3.5 h-3.5 text-gold" />
          <span className="text-[11px] font-semibold text-gold">
            Confirmed:{' '}
            {new Date(booking.confirmed_date).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short',
            })}
            {booking.confirmed_time && ` \u00b7 ${booking.confirmed_time}`}
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
  const [showAllProperties, setShowAllProperties] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showAllDeals, setShowAllDeals] = useState(false);
  const [bookings, setBookings] = useState<InspectionBooking[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delistTarget, setDelistTarget] = useState<Property | null>(null);
  const [delisting, setDelisting] = useState(false);

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
          // Table may not exist -- silent fail
        }

      } else {
        try {
          const { data, error: err } = await supabase
            .from('properties')
            .select('*')
            .or(`owner_id.eq.${user.id},agent_id.eq.${user.id}`).is('deleted_at', null)
            .order('created_at', { ascending: false });
          if (err) console.error('Properties error:', err.message);
          else setProperties(data || []);

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
        className="min-h-screen bg-ink flex flex-col items-center justify-center p-5 text-center"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <AlertCircle className="w-10 h-10 text-danger mb-4" />
        <h2 className="text-[18px] font-bold text-paper mb-2">Something went wrong</h2>
        <p className="text-[13px] text-paper/45 mb-6 max-w-xs">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-gold text-ink px-6 py-3 rounded-xl font-semibold text-[14px] hover:bg-gold-dark transition-colors"
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
      className="min-h-screen bg-ink page-with-tabs"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-slate/20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gold rounded-2xl overflow-hidden flex items-center justify-center text-ink text-[18px] font-black flex-shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (profile?.full_name || 'U').charAt(0).toUpperCase()
                }
              </div>
              <div>
                <h1 className="font-serif text-[24px] font-semibold text-paper tracking-tight leading-tight">
                  Hello, {firstName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-paper/45 capitalize font-medium">
                    {profile?.role}
                  </span>
                  <span className="text-paper/20">&middot;</span>
                  {profile?.verification_status === 'verified' ? (
                    <span className="flex items-center gap-1 text-[12px] text-gold font-medium">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  ) : profile?.verification_status === 'pending_verification' ? (
                    <span className="flex items-center gap-1 text-[12px] text-paper/50 font-medium">
                      <Clock className="w-3 h-3" /> Under review
                    </span>
                  ) : (
                    <Link
                      to="/verification"
                      className="flex items-center gap-1 text-[12px] text-paper/40 hover:text-gold transition-colors font-medium"
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
                  className="flex items-center gap-1.5 bg-gold text-ink px-4 py-2.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">List Property</span>
                </Link>
              )}
              <Link
                to="/profile"
                className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-paper/50 hover:text-paper hover:bg-white/8 transition-all"
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
            <PendingInspectionDelegateInvites />
            <FeatureCarousel />

            {/* Verification nudge */}
            {profile?.verification_status === 'unverified' && isLandlordOrAgent && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate/20 border border-gold/20 rounded-2xl p-5 flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-paper mb-1">
                    Get verified to list instantly
                  </p>
                  <p className="text-[12px] text-paper/45 mb-3">
                    Verified accounts go live immediately. Unverified listings wait for moderator review.
                  </p>
                  <Link
                    to="/verification"
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gold hover:text-gold-dark transition-colors"
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
                className="bg-gold/8 border border-gold/25 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-gold/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-paper">
                    {newBookings} new inspection booking{newBookings > 1 ? 's' : ''}{' '}
                    need{newBookings === 1 ? 's' : ''} your confirmation
                  </p>
                  <p className="text-[11px] text-paper/40">
                    Confirm the date and time for each tenant below
                  </p>
                </div>
              </motion.div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isTenant ? (
                <>
                  <StatCard icon={Calendar} value={bookings.length} label="Inspections" />
                  <StatCard icon={CreditCard} value={deals.length} label="Escrow deals" onClick={() => document.getElementById('deals-section')?.scrollIntoView({ behavior: 'smooth' })} />
                  <StatCard
                    icon={Heart}
                    value={savedProperties.length}
                    label="Saved"
                    onClick={() => navigate('/listings')}
                  />
                  <ActionTile icon={Search} label="Browse properties" onClick={() => navigate('/listings')} />
                </>
              ) : (
                <>
                  <StatCard
                    icon={Home}
                    value={activeListings}
                    label="Active listings"
                    onClick={() => navigate('/listings')}
                  />
                  <StatCard icon={Clock} value={pendingListings} label="Pending review" />
                  <StatCard icon={CreditCard} value={deals.length} label="Escrow deals" onClick={() => document.getElementById('deals-section')?.scrollIntoView({ behavior: 'smooth' })} />
                  <StatCard icon={Calendar} value={newBookings} label="New bookings" />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">

                {/* Landlord: Inspection Requests */}
                {isLandlordOrAgent && (
                  <div className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <div>
                        <h2 className="text-[15px] font-bold text-paper">Inspection Requests</h2>
                        <p className="text-[11px] text-paper/35 mt-0.5">
                          Tenants who paid to view your properties
                        </p>
                      </div>
                      {newBookings > 0 && (
                        <span className="text-[11px] font-bold text-gold bg-gold/10 px-2.5 py-1 rounded-xl">
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

                {/* Tenant: My Deals */}
                {isTenant && (
                <div className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <h2 className="text-[15px] font-bold text-paper">My Deals</h2>
                    <CreditCard className="w-4 h-4 text-gold" />
                  </div>
                  {deals.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="No deals yet"
                      desc="Once you start a deal on a property, it will show up here."
                    />
                  ) : (
                    <div className="divide-y divide-white/4">
                      {deals.map(deal => (
                        <button
                          key={deal.id}
                          onClick={() => navigate(`/deals/${deal.id}`)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/4 transition-colors text-left"
                        >
                          <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                            {(deal as any).properties?.images?.[0] ? (
                              <img src={(deal as any).properties.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-5 h-5 text-paper/15" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-paper truncate">
                              {(deal as any).properties?.title || 'Property'}
                            </p>
                            <p className="text-[11px] text-paper/35">
                              {(deal as any).properties?.lga}, {(deal as any).properties?.state}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-gold bg-gold/10 px-2.5 py-1 rounded-lg capitalize flex-shrink-0">
                            {deal.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Tenant: My Inspection Bookings */}
                {isTenant && (
                  <div className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <div>
                        <h2 className="text-[15px] font-bold text-paper">My Inspection Bookings</h2>
                        <p className="text-[11px] text-paper/35 mt-0.5">Properties you have booked to view</p>
                      </div>
                      <Calendar className="w-4 h-4 text-gold" />
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
                              <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                                {booking.properties?.images?.[0] ? (
                                  <img
                                    src={booking.properties.images[0]}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Home className="w-5 h-5 text-paper/15" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-paper truncate">
                                  {booking.properties?.title || 'Property'}
                                </p>
                                <p className="text-[11px] text-paper/35">
                                  {booking.properties?.lga}, {booking.properties?.state}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[12px] font-black text-gold tabular-nums">
                                  {formatNaira(booking.inspection_fee)}
                                </p>
                                <p className="text-[10px] text-paper/25">paid</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <BookingBadge status={booking.status} />
                              <span className="text-[11px] text-paper/30">
                                {timeAgo(booking.created_at)}
                              </span>
                            </div>
                            <InspectionDelegateInvite bookingId={booking.id} isTenant={isTenant} />

                            {booking.confirmed_date && (
                              <div className="flex items-center gap-2 mt-2 p-2.5 bg-gold/8 border border-gold/15 rounded-xl">
                                <CheckCircle className="w-3.5 h-3.5 text-gold" />
                                <span className="text-[11px] font-semibold text-gold">
                                  Visit confirmed:{' '}
                                  {new Date(booking.confirmed_date).toLocaleDateString('en-NG', {
                                    weekday: 'short', day: 'numeric', month: 'short',
                                  })}
                                  {booking.confirmed_time && ` \u00b7 ${booking.confirmed_time}`}
                                </span>
                              </div>
                            )}

                            {booking.status === 'inspection_done' && (
                              <div className="mt-2 p-3 bg-gold/6 border border-gold/15 rounded-xl">
                                <p className="text-[11px] text-gold font-semibold mb-1">
                                  Did you like the property?
                                </p>
                                <p className="text-[10px] text-paper/35">
                                  Contact the landlord or agent to proceed. They can send you a deal offer in chat.
                                </p>
                              </div>
                            )}

                            {booking.status === 'escrow_started' && (
                              <Link
                                to="/dashboard"
                                className="mt-2 flex items-center justify-center gap-2 py-2.5 bg-gold text-ink rounded-xl font-bold text-[12px] hover:bg-gold-dark transition-colors"
                              >
                                Complete your deal <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            )}

                            {(booking.status === 'tenant_declined' || booking.status === 'refunded') &&
                              booking.refund_amount && (
                                <div className="mt-2 flex items-center gap-2 p-2.5 bg-white/4 border border-white/6 rounded-xl">
                                  <CheckCircle className="w-3.5 h-3.5 text-gold" />
                                  <span className="text-[11px] text-paper/45">
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
                  <div className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <div>
                        <h2 className="text-[15px] font-bold text-paper">Saved Properties</h2>
                        <p className="text-[11px] text-paper/35 mt-0.5">Properties you hearted</p>
                      </div>
                      <Heart className="w-4 h-4 text-danger" />
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
                            className="bg-white/5 border border-white/6 rounded-xl overflow-hidden hover:border-gold/20 transition-all flex-shrink-0 w-40"
                          >
                            <div className="h-24 overflow-hidden">
                              {property.images?.[0] ? (
                                <img
                                  src={property.images[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate/20">
                                  <Home className="w-5 h-5 text-paper/15" />
                                </div>
                              )}
                            </div>
                            <div className="p-2.5">
                              <p className="text-[11px] font-bold text-paper truncate">
                                {property.title}
                              </p>
                              <p className="text-[12px] font-black text-gold mt-0.5 tabular-nums">
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
                <div id="deals-section" className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div>
                      <h2 className="text-[15px] font-bold text-paper">Escrow Deals</h2>
                      <p className="text-[11px] text-paper/35 mt-0.5">Active and completed transactions</p>
                    </div>
                    <Shield className="w-4 h-4 text-gold" />
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
                      {(showAllDeals ? deals : deals.slice(0, 5)).map(deal => (
                        <Link
                          key={deal.id}
                          to={`/deals/${deal.id}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors group"
                        >
                          <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                            {deal.properties?.images?.[0] ? (
                              <img
                                src={deal.properties.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-5 h-5 text-paper/15" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-paper truncate">
                              {deal.properties?.title || 'Property'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <DealBadge status={deal.status} />
                              <span className="text-[12px] text-gold font-medium tabular-nums">
                                {formatNaira(deal.amount)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-paper/30">
                              {timeAgo(deal.created_at)}
                            </span>
                            <ArrowRight className="w-4 h-4 text-paper/20 group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Landlord: My Listings */}
                {isLandlordOrAgent && properties.length > 0 && (
                  <div className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                      <h2 className="text-[15px] font-bold text-paper">My Listings</h2>
                      <Link
                        to="/add-property"
                        className="flex items-center gap-1 text-[12px] font-semibold text-gold hover:text-gold-dark transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add new
                      </Link>
                    </div>
                    <div className="divide-y divide-white/4">
                      {(showAllProperties ? properties : properties.slice(0, 5)).map(property => (
                        <Link
                          key={property.id}
                          to={`/property/${property.id}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors"
                        >
                          <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                            {property.images?.[0] ? (
                              <img
                                src={property.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-5 h-5 text-paper/15" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-paper truncate">
                              {property.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-paper/25" />
                              <span className="text-[11px] text-paper/35 truncate">
                                {property.lga}, {property.state}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {property.agent_id === user?.id && property.owner_id !== user?.id && (
                              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/6 text-paper/50">
                                Managing
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              property.is_rented
                                ? 'bg-white/8 text-paper/40'
                                : property.status === 'active'
                                ? 'bg-gold/10 text-gold'
                                : property.status === 'pending_review'
                                ? 'bg-white/6 text-paper/50'
                                : 'bg-danger/10 text-danger'
                            }`}>
                              {property.is_rented ? 'rented/sold' : property.status.replace(/_/g, ' ')}
                            </span>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/edit-property/${property.id}`); }}
                              title="Edit listing"
                            >
                              <Pencil className="w-4 h-4 text-paper/20 hover:text-paper/60 transition-colors" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDelistTarget(property); }}
                              title={property.is_delisted ? 'Re-list' : 'Delist'}
                            >
                              {property.is_delisted
                                ? <Megaphone className="w-4 h-4 text-gold hover:text-gold-dark transition-colors" />
                                : <Ban className="w-4 h-4 text-paper/20 hover:text-paper/60 transition-colors" />
                              }
                            </button>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {properties.length > 5 && (
                      <button
                        onClick={() => setShowAllProperties(v => !v)}
                        className="w-full py-3 text-[12px] font-semibold text-gold hover:text-gold-dark transition-colors border-t border-white/5"
                      >
                        {showAllProperties ? 'Show less' : `Show all ${properties.length} listings`}
                      </button>
                    )}
                  </div>
                )}

                {delistTarget && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5">
                    <div className="bg-slate/20 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                      <h3 className="text-[15px] font-bold text-paper mb-2 flex items-center gap-2">
                        {delistTarget.is_delisted
                          ? <><Megaphone className="w-5 h-5 text-gold" /> Re-list this property?</>
                          : <><Ban className="w-5 h-5 text-danger" /> Delist this property?</>}
                      </h3>
                      <p className="text-[13px] text-paper/45 mb-5 leading-relaxed">
                        {delistTarget.is_delisted
                          ? `"${delistTarget.title}" will become visible to browsers again.`
                          : `"${delistTarget.title}" will be hidden from listings until you re-list it. Active deals are not affected.`}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setDelistTarget(null)}
                          disabled={delisting}
                          className="flex-1 py-3 rounded-xl font-bold text-[13px] text-paper/40 hover:bg-white/5 transition-colors disabled:opacity-40"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!delistTarget) return;
                            setDelisting(true);
                            await handleToggleDelist(delistTarget);
                            setDelisting(false);
                            setDelistTarget(null);
                          }}
                          disabled={delisting}
                          className="flex-1 bg-gold text-ink py-3 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-all disabled:opacity-40"
                        >
                          {delisting ? 'Working...' : (delistTarget.is_delisted ? 'Re-list' : 'Delist')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {deleteTarget && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5">
                    <div className="bg-slate/20 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                      <h3 className="text-[15px] font-bold text-paper mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-danger" /> Delete Listing
                      </h3>
                      <p className="text-[13px] text-paper/45 mb-5 leading-relaxed">
                        Are you sure you want to delete "{deleteTarget.title}"? This cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setDeleteTarget(null)}
                          disabled={deleting}
                          className="flex-1 py-3 rounded-xl font-bold text-[13px] text-paper/40 hover:bg-white/5 transition-colors disabled:opacity-40"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteListing}
                          disabled={deleting}
                          className="flex-1 bg-danger text-paper py-3 rounded-xl font-bold text-[13px] hover:bg-danger-dark transition-all disabled:opacity-40"
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
                <div className="bg-slate/20 border border-white/6 rounded-2xl p-5">
                  <h3 className="text-[13px] font-bold text-paper/50 uppercase tracking-wider mb-4">
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

                <DelegateFeatureCard />
                <LawyerFeatureCard />

                {(profile?.agent_id || profile?.landlord_id) && (
                  <div className="bg-slate/20 border border-gold/15 rounded-2xl p-5">
                    <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-3">
                      Platform ID
                    </div>
                    <div className="font-mono text-[13px] font-bold text-paper break-all">
                      {profile.agent_id || profile.landlord_id}
                    </div>
                    <p className="text-[11px] text-paper/30 mt-2">Share on your business card</p>
                  </div>
                )}

                <div className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="text-[10px] font-bold text-paper/35 uppercase tracking-widest mb-3">
                      Know Your Rights
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gold/12 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Scale className="w-4 h-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-paper leading-snug mb-1">
                          {isTenant
                            ? 'Your landlord cannot evict you without a court order'
                            : 'You must give proper notice before any rent increase'
                          }
                        </p>
                        <p className="text-[10px] text-paper/30">
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
                    className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-[11px] font-semibold text-gold/60 hover:text-gold transition-colors"
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
        ? 'bg-gold/10 text-gold hover:bg-gold/15'
        : 'text-paper/55 hover:bg-white/5 hover:text-paper'
    }`}
  >
    <Icon className="w-4 h-4 flex-shrink-0" />
    {label}
  </Link>
);
