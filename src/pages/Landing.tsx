import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Shield, CheckCircle,
  ArrowRight, ChevronDown, Star,
  Lock, FileText, MessageCircle,
  TrendingUp, Users, Home, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

// ─── Logo SVG ────────────────────────────────────────────────────
const RentEasyLogo = ({ size = 32 }: { size?: number }) => (
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

// ─── Nigerian States ──────────────────────────────────────────────
const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa',
  'Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti',
  'Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina',
  'Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo',
  'Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
];

// ─── Format Naira ─────────────────────────────────────────────────
const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount);

// ─── Animate on scroll ───────────────────────────────────────────
const FadeUp = ({
  children, delay = 0, className = ''
}: {
  children: React.ReactNode; delay?: number; className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─── Property Card (mini, for featured section) ───────────────────
const FeaturedCard = ({ property }: { property: Property }) => {
  const img = property.images?.[0];
  const periodLabel: Record<string, string> = {
    yearly: '/yr', monthly: '/mo', nightly: '/night', outright: ''
  };

  return (
    <Link
      to={`/property/${property.id}`}
      className="group block bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden hover:border-[#f0c040]/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40"
    >
      {/* Image */}
      <div className="relative h-44 bg-[#111a14] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-10 h-10 text-white/10" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-[#f0c040] text-black text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">
            {property.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          {property.escrow_verified && (
            <span className="bg-[#1a6b3c] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> Verified
            </span>
          )}
        </div>
        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-black/50 backdrop-blur-sm text-white/70 text-[10px] font-medium px-2 py-1 rounded-lg capitalize">
            {property.listing_type}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-[14px] font-semibold text-white line-clamp-1 leading-snug">
            {property.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 text-white/40 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="text-[12px] truncate">{property.lga}, {property.state}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[16px] font-bold text-[#f0c040]">
              {formatNaira(property.price)}
            </span>
            {property.price_period && (
              <span className="text-[11px] text-white/40 ml-1">
                {periodLabel[property.price_period]}
              </span>
            )}
          </div>
          {property.bedrooms && (
            <span className="text-[11px] text-white/40">
              {property.bedrooms} bed · {property.bathrooms} bath
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

// ─── Stats counter ────────────────────────────────────────────────
const StatItem = ({
  value, label
}: { value: string; label: string }) => (
  <div className="text-center">
    <div className="text-[28px] lg:text-[36px] font-black text-[#f0c040] leading-none mb-1">
      {value}
    </div>
    <div className="text-[12px] text-white/50 font-medium uppercase tracking-wider">
      {label}
    </div>
  </div>
);

// ─── How it works step ────────────────────────────────────────────
const HowStep = ({
  num, icon: Icon, title, desc, delay
}: {
  num: string; icon: React.ElementType; title: string; desc: string; delay: number;
}) => (
  <FadeUp delay={delay}>
    <div className="relative">
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 h-full hover:border-[#f0c040]/20 transition-colors">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-[#1a6b3c]/20 border border-[#1a6b3c]/30 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#f0c040]" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-[#f0c040]/60 uppercase tracking-widest mb-1">
              Step {num}
            </div>
            <h3 className="text-[15px] font-bold text-white mb-2">{title}</h3>
            <p className="text-[13px] text-white/50 leading-relaxed">{desc}</p>
          </div>
        </div>
      </div>
    </div>
  </FadeUp>
);

// ─── Feature card ─────────────────────────────────────────────────
const FeatureCard = ({
  icon: Icon, title, desc, delay
}: {
  icon: React.ElementType; title: string; desc: string; delay: number;
}) => (
  <FadeUp delay={delay}>
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 hover:border-[#f0c040]/15 transition-colors group">
      <div className="w-10 h-10 bg-[#f0c040]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#f0c040]/15 transition-colors">
        <Icon className="w-5 h-5 text-[#f0c040]" />
      </div>
      <h3 className="text-[14px] font-bold text-white mb-2">{title}</h3>
      <p className="text-[13px] text-white/45 leading-relaxed">{desc}</p>
    </div>
  </FadeUp>
);

// ─── Barrister Amaka Rights Card ──────────────────────────────────
const BarristerAmakaCard = () => {
  const tips = [
    {
      role: 'Tenant',
      title: 'Your Right to Peaceful Enjoyment',
      law: 'Tenancy Law of Lagos State 2011',
      points: [
        { type: 'right', text: 'Landlord cannot enter without reasonable notice' },
        { type: 'right', text: 'You cannot be evicted without a court order' },
        { type: 'warning', text: 'Always get your agreement signed before payment' },
      ]
    },
    {
      role: 'Landlord',
      title: 'Your Duty Before Eviction',
      law: 'Recovery of Premises Act',
      points: [
        { type: 'right', text: 'You must give proper notice before any eviction' },
        { type: 'right', text: 'Self-help eviction is illegal — court order required' },
        { type: 'warning', text: 'Failure to give notice can lead to legal liability' },
      ]
    }
  ];

  const [current, setCurrent] = useState(0);
  const tip = tips[current];

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(c => (c + 1) % tips.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#0a1f11] border border-[#f0c040]/15 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="text-[9px] font-bold text-[#f0c040] uppercase tracking-widest mb-1">
            Know Your Rights
          </div>
          <div className="text-[15px] font-bold text-white leading-snug">
            {tip.title}
          </div>
          <div className="text-[11px] text-white/35 mt-0.5">{tip.law}</div>
        </div>
        {/* Barrister Amaka illustration */}
        <div className="flex-shrink-0 ml-3">
          <svg width="60" height="80" viewBox="0 0 80 110" fill="none">
            <rect x="18" y="55" width="44" height="55" rx="6" fill="#1a1a2e" />
            <rect x="22" y="58" width="36" height="50" rx="4" fill="#16213e" />
            <rect x="28" y="55" width="24" height="8" rx="2" fill="#e8e8e8" />
            <rect x="30" y="57" width="20" height="4" rx="1" fill="#d0d0d0" />
            <ellipse cx="40" cy="58" rx="16" ry="18" fill="#f5c5a3" />
            <ellipse cx="40" cy="44" rx="18" ry="14" fill="#2c1810" />
            <ellipse cx="40" cy="40" rx="16" ry="12" fill="#3d2314" />
            <ellipse cx="40" cy="58" rx="10" ry="11" fill="#f0b088" />
            <ellipse cx="35" cy="56" rx="2" ry="2.5" fill="#3d2314" />
            <ellipse cx="45" cy="56" rx="2" ry="2.5" fill="#3d2314" />
            <ellipse cx="35.5" cy="55.5" rx=".8" ry="1" fill="#fff" />
            <ellipse cx="45.5" cy="55.5" rx=".8" ry="1" fill="#fff" />
            <path d="M36 63 Q40 66 44 63" stroke="#c07060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M37 64 Q40 67 43 64" fill="#e88080" />
            <rect x="14" y="65" width="12" height="30" rx="4" fill="#1a1a2e" />
            <rect x="54" y="65" width="12" height="30" rx="4" fill="#1a1a2e" />
            <rect x="16" y="92" width="16" height="18" rx="3" fill="#f5c5a3" />
            <rect x="48" y="92" width="16" height="18" rx="3" fill="#f5c5a3" />
            <rect x="24" y="80" width="32" height="6" rx="2" fill="#1a6b3c" />
            <text x="40" y="85" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#fff">BARRISTER AMAKA</text>
          </svg>
        </div>
      </div>

      {/* Rights list */}
      <div className="px-5 pb-4 space-y-2">
        {tip.points.map((pt, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[8px] font-black ${
              pt.type === 'right'
                ? 'bg-[#1a6b3c]/25 text-[#4ade80]'
                : 'bg-[#f0c040]/15 text-[#f0c040]'
            }`}>
              {pt.type === 'right' ? '✓' : '!'}
            </div>
            <span className="text-[12px] text-white/65 leading-relaxed">{pt.text}</span>
          </div>
        ))}
      </div>

      {/* Footer dots */}
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {tips.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-6 bg-[#f0c040]' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
        <Link to="/legal-guide" className="text-[11px] text-[#f0c040]/70 font-semibold hover:text-[#f0c040] transition-colors flex items-center gap-1">
          View all rights <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

// ─── Waitlist section ─────────────────────────────────────────────
const WaitlistSection = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'tenant' | 'landlord' | 'agent'>('tenant');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      // Store in a simple table or just show success
      // TODO: connect to waitlist table when created
      await new Promise(r => setTimeout(r, 800));
      setJoined(true);
    } catch {
      // silent fail for now
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 lg:p-8">
      {joined ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-[#1a6b3c]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-[#4ade80]" />
          </div>
          <h3 className="text-[18px] font-bold text-white mb-2">You're on the list!</h3>
          <p className="text-[13px] text-white/45">
            We'll notify you when we launch in your area.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <div className="text-[10px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
              Early Access
            </div>
            <h3 className="text-[20px] font-bold text-white mb-2">
              Be among the first
            </h3>
            <p className="text-[13px] text-white/45 leading-relaxed">
              Join the waitlist and get early access when we launch in your city.
              No spam — just one email when we're ready.
            </p>
          </div>

          {/* Role selector */}
          <div className="flex gap-2 mb-5">
            {(['tenant', 'landlord', 'agent'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold capitalize transition-all ${
                  role === r
                    ? 'bg-[#1a6b3c] text-white'
                    : 'bg-white/5 text-white/45 hover:bg-white/8 hover:text-white/70'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#f0c040] text-black px-5 py-3 rounded-xl font-bold text-[13px] hover:bg-[#e0b030] transition-colors disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>Join <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════════
export default function Landing() {
  const navigate = useNavigate();
  const [state, setState] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [transaction, setTransaction] = useState('rent');
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [liveStats, setLiveStats] = useState({
    properties: 0, users: 0
  });

  // Fetch featured properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data } = await supabase
          .from('properties')
          .select('*, profiles(full_name, avatar_url, role)')
          .eq('status', 'active').is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(6);
        setFeaturedProperties(data || []);
      } catch {
        setFeaturedProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    };

    const fetchStats = async () => {
      try {
        const [{ count: props }, { count: users }] = await Promise.all([
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
          supabase.from('profiles').select('*', { count: 'exact', head: true })
        ]);
        setLiveStats({ properties: props || 0, users: users || 0 });
      } catch { /* silent */ }
    };

    fetchProperties();
    fetchStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (propertyType !== 'all') params.set('type', propertyType);
    if (transaction) params.set('transaction', transaction);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen">

      {/* ─────────────────────────────────────────────────────── */}
      {/* HERO SECTION */}
      {/* ─────────────────────────────────────────────────────── */}
      <section className="relative bg-[#0a1f11] overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #1a6b3c 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #f0c040 0%, transparent 40%)`
          }}
        />
        <div className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg, transparent, transparent 60px,
              rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px
            ), repeating-linear-gradient(
              90deg, transparent, transparent 60px,
              rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px
            )`
          }}
        />

        <div className="relative max-w-7xl mx-auto px-5 lg:px-8 pt-24 lg:pt-32 pb-16 lg:pb-24">
          <div className="max-w-3xl">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-full px-4 py-2 mb-8"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#f0c040] animate-pulse" />
              <span className="text-[12px] font-semibold text-[#f0c040]">
                Nigeria's first escrow-protected real estate platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[40px] lg:text-[64px] font-black text-white leading-[1.05] tracking-tight mb-6"
            >
              Rent or Buy<br />
              <span className="text-[#f0c040]">Safely</span> in Nigeria.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[16px] lg:text-[18px] text-white/55 leading-relaxed mb-10 max-w-xl"
            >
              Verified landlords. Escrow protection. Fair inspections.
              No more "Omonile" stress.
            </motion.p>

            {/* Search box */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <form onSubmit={handleSearch} className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* State select */}
                  <div className="flex-1 flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-white/8">
                    <MapPin className="w-4 h-4 text-[#1a6b3c] flex-shrink-0" />
                    <select
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="">All states</option>
                      {NIGERIAN_STATES.map(s => (
                        <option key={s} value={s} className="bg-[#0a1f11] text-white">{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Property type */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b lg:border-b-0 lg:border-r border-white/8">
                    <Layers className="w-4 h-4 text-[#1a6b3c] flex-shrink-0" />
                    <select
                      value={propertyType}
                      onChange={e => setPropertyType(e.target.value)}
                      className="bg-transparent text-[14px] text-white focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="all" className="bg-[#0a1f11]">All types</option>
                      <option value="house" className="bg-[#0a1f11]">House</option>
                      <option value="land" className="bg-[#0a1f11]">Land</option>
                    </select>
                  </div>

                  {/* Transaction */}
                  <div className="flex items-center gap-2 px-5 py-4 border-b lg:border-b-0 lg:border-r border-white/8">
                    {(['rent', 'sell'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTransaction(t)}
                        className={`px-4 py-2 rounded-xl text-[13px] font-semibold capitalize transition-all ${
                          transaction === t
                            ? 'bg-[#1a6b3c] text-white'
                            : 'text-white/45 hover:text-white'
                        }`}
                      >
                        {t === 'sell' ? 'Buy' : 'Rent'}
                      </button>
                    ))}
                  </div>

                  {/* Search button */}
                  <div className="p-3">
                    <button
                      type="submit"
                      className="w-full lg:w-auto bg-[#f0c040] text-black px-8 py-3 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Search
                    </button>
                  </div>
                </div>
              </form>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-4 mt-5">
                {[
                  { icon: Shield, text: 'Escrow Protected' },
                  { icon: CheckCircle, text: 'NIN Verified' },
                  { icon: Lock, text: 'Fair Inspections' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-[#f0c040]" />
                    <span className="text-[12px] text-white/50 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <ChevronDown className="w-4 h-4 text-white/20" />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {/* LIVE STATS BAR */}
      {/* ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0a1f11] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <StatItem
              value={liveStats.properties > 0 ? `${liveStats.properties}+` : '—'}
              label="Active listings"
            />
            <StatItem
              value={liveStats.users > 0 ? `${liveStats.users}+` : '—'}
              label="Platform members"
            />
            <StatItem value="36" label="States covered" />
            <StatItem value="100%" label="Secure payments" />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {/* HOW IT WORKS */}
      {/* ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <FadeUp>
            <div className="text-center mb-14">
              <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-3">
                The Process
              </div>
              <h2 className="text-[28px] lg:text-[40px] font-black text-white tracking-tight">
                Renting made safe and simple
              </h2>
              <p className="text-[14px] text-white/45 mt-3 max-w-lg mx-auto">
                From search to move-in — every step is verified, protected, and transparent.
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <HowStep
              num="01" icon={Search} delay={0}
              title="Search & Discover"
              desc="Browse thousands of verified properties across all 36 Nigerian states. Filter by price, location, and type."
            />
            <HowStep
              num="02" icon={CheckCircle} delay={0.1}
              title="Book Inspection"
              desc="Pay a small inspection fee to secure your viewing slot. Get 70-100% refund if anything goes wrong."
            />
            <HowStep
              num="03" icon={FileText} delay={0.2}
              title="Sign Agreement"
              desc="Landlord uploads the tenancy agreement. Both parties sign digitally. Everything is on record."
            />
            <HowStep
              num="04" icon={Shield} delay={0.3}
              title="Move In Safely"
              desc="Your rent is held in escrow and only released after you confirm move-in. No more pay-and-pray."
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {/* FEATURED PROPERTIES */}
      {/* ─────────────────────────────────────────────────────── */}
      <section className="pb-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <FadeUp>
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-2">
                  Latest Listings
                </div>
                <h2 className="text-[24px] lg:text-[32px] font-black text-white tracking-tight">
                  Recently listed properties
                </h2>
              </div>
              <Link
                to="/listings"
                className="hidden sm:flex items-center gap-2 text-[13px] font-semibold text-white/50 hover:text-[#f0c040] transition-colors"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeUp>

          {loadingProperties ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#0a1f11] rounded-2xl overflow-hidden border border-white/5">
                  <div className="skeleton h-44" />
                  <div className="p-4 space-y-3">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-5 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredProperties.map((property, i) => (
                <FadeUp key={property.id} delay={i * 0.06}>
                  <FeaturedCard property={property} />
                </FadeUp>
              ))}
            </div>
          ) : (
            <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-14 text-center">
              <Home className="w-10 h-10 text-white/15 mx-auto mb-4" />
              <p className="text-[15px] font-semibold text-white/40 mb-2">
                Properties coming soon
              </p>
              <p className="text-[13px] text-white/25">
                Be the first to list your property on RentEasy.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 mt-6 bg-[#1a6b3c] text-white px-6 py-3 rounded-xl font-semibold text-[13px] hover:bg-[#0f4a2a] transition-colors"
              >
                List your property <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/50 hover:text-[#f0c040] transition-colors"
            >
              View all properties <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {/* BARRISTER AMAKA + WAITLIST SPLIT */}
      {/* ─────────────────────────────────────────────────────── */}
      <section className="pb-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeUp>
              <BarristerAmakaCard />
            </FadeUp>
            <FadeUp delay={0.1}>
              <WaitlistSection />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {/* WHY RENT EASY */}
      {/* ─────────────────────────────────────────────────────── */}
      <section className="pb-20 lg:pb-28 bg-[#0a1f11]/40">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
          <FadeUp>
            <div className="text-center mb-14">
              <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-3">
                Why Choose Us
              </div>
              <h2 className="text-[28px] lg:text-[40px] font-black text-white tracking-tight">
                Built for Nigerian reality
              </h2>
              <p className="text-[14px] text-white/45 mt-3 max-w-lg mx-auto">
                We built every feature to solve real problems Nigerians face every day 
                in the property market.
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard delay={0} icon={Shield}
              title="Verified Landlords & Agents"
              desc="NIN verification and document checks ensure every listing owner is who they claim to be."
            />
            <FeatureCard delay={0.05} icon={Lock}
              title="Escrow Payment Protection"
              desc="Your rent is held securely and only released after you confirm everything is right."
            />
            <FeatureCard delay={0.1} icon={CheckCircle}
              title="Fair Inspection System"
              desc="Pay a small fee to secure your inspection slot. Get refunded automatically if something goes wrong."
            />
            <FeatureCard delay={0.15} icon={MessageCircle}
              title="Direct Chat with Owners"
              desc="Message landlords and agents directly. Negotiate price, ask questions — all in one place."
            />
            <FeatureCard delay={0.2} icon={FileText}
              title="Digital Tenancy Agreements"
              desc="Sign your agreement digitally. It's stored permanently and accessible anytime as legal record."
            />
            <FeatureCard delay={0.25} icon={TrendingUp}
              title="House & Land Marketplace"
              desc="Buy, rent, or sell houses and land across all 36 Nigerian states and FCT."
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {/* FOR LANDLORDS CTA */}
      {/* ─────────────────────────────────────────────────────── */}
      <section className="pb-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <FadeUp>
            <div className="bg-[#0a1f11] border border-[#f0c040]/15 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#f0c040]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#1a6b3c]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-4">
                    For Landlords & Agents
                  </div>
                  <h2 className="text-[28px] lg:text-[36px] font-black text-white tracking-tight mb-5">
                    List your property with confidence
                  </h2>
                  <ul className="space-y-3 mb-8">
                    {[
                      'Serious tenants only — backed by inspection fees',
                      'Automatic commission calculation for agents',
                      'Escrow ensures you always get paid',
                      'Verified badge builds tenant trust faster',
                      'Manage all your listings in one dashboard',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
                        <span className="text-[13px] text-white/65">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/signup"
                      className="bg-[#f0c040] text-black px-8 py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors flex items-center gap-2"
                    >
                      Start Listing Free <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/listings"
                      className="bg-white/6 text-white px-8 py-3.5 rounded-xl font-semibold text-[14px] hover:bg-white/10 transition-colors border border-white/8"
                    >
                      Browse Properties
                    </Link>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: '₦0', label: 'Listing fee', sub: 'Always free to list' },
                    { value: '10%', label: 'Agent standard', sub: 'Auto-calculated' },
                    { value: '2%', label: 'Platform fee', sub: 'On escrow only' },
                    { value: '24h', label: 'Verification', sub: 'Fast approval' },
                  ].map(({ value, label, sub }) => (
                    <div key={label} className="bg-[#111a14] border border-white/5 rounded-2xl p-5 text-center aspect-square flex flex-col items-center justify-center">
                      <div className="text-[26px] font-black text-[#f0c040] leading-none mb-1">{value}</div>
                      <div className="text-[12px] font-semibold text-white mb-1">{label}</div>
                      <div className="text-[10px] text-white/35">{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── */}
      {/* FINAL CTA */}
      {/* ─────────────────────────────────────────────────────── */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <FadeUp>
            <div className="w-16 h-16 mx-auto mb-8 flex items-center justify-center">
              <RentEasyLogo size={64} />
            </div>
            <h2 className="text-[28px] lg:text-[40px] font-black text-white tracking-tight mb-4">
              Ready to rent or list safely?
            </h2>
            <p className="text-[15px] text-white/45 mb-10 max-w-md mx-auto">
              Join thousands of Nigerians already using RentEasy to find and list 
              properties without the stress.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="bg-[#f0c040] text-black px-10 py-4 rounded-xl font-bold text-[15px] hover:bg-[#e0b030] transition-colors flex items-center justify-center gap-2"
              >
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/listings"
                className="bg-[#0a1f11] text-white px-10 py-4 rounded-xl font-bold text-[15px] hover:bg-[#111a14] transition-colors border border-white/8"
              >
                Browse Properties
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}