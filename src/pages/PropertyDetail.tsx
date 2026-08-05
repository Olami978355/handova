import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Home, MapPin, Bed, Bath, Shield, CheckCircle, ArrowLeft,
  Share2, Heart, AlertCircle, Maximize, FileText,
  Clock, ScrollText, Tag, Video, ChevronLeft, ChevronRight,
  Eye, Layers, MessageCircle, Twitter, Copy, Check,
  Download, QrCode, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Property, Profile } from '../types';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { ChatButton } from '../components/chat/ChatButton';
import { InspectionFeeDisplay } from '../components/inspection/InspectionFeeDisplay';

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const PropertySkeleton = () => (
  <div className="space-y-6">
    <div className="skeleton h-72 rounded-2xl" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-32" />
      </div>
      <div className="space-y-4">
        <div className="skeleton h-48" />
        <div className="skeleton h-36" />
      </div>
    </div>
  </div>
);

const AmenityChip = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/8 rounded-xl">
    <div className="w-1.5 h-1.5 rounded-full bg-[#1a6b3c] flex-shrink-0" />
    <span className="text-[12px] text-white/65 font-medium">{text}</span>
  </div>
);

const StatBox = ({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) => (
  <div className="bg-white/4 border border-white/6 rounded-xl p-4 text-center">
    <Icon className="w-5 h-5 mx-auto mb-2 text-[#1a6b3c]" />
    <div className="text-[15px] font-bold text-white">{value}</div>
    <div className="text-[10px] text-white/35 font-medium uppercase tracking-wider mt-0.5">{label}</div>
  </div>
);

const ShareCard = React.forwardRef<HTMLDivElement, { property: Property; owner: Profile | null }>(
  ({ property, owner }, ref) => {
    const formatPrice = (amount: number) =>
      new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

    return (
      <div
        ref={ref}
        style={{
          width: '1080px', height: '1080px', position: 'fixed',
          left: '-9999px', top: '-9999px', fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: '#0a1f11', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '580px', overflow: 'hidden', position: 'relative' }}>
          {property.images?.[0] ? (
            <img src={property.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#0a1f11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to top, #0a1f11, transparent)' }} />
          <div style={{ position: 'absolute', top: '32px', left: '32px', display: 'flex', gap: '12px' }}>
            <div style={{ background: '#f0c040', color: '#000', padding: '8px 18px', borderRadius: '12px', fontSize: '20px', fontWeight: '800', textTransform: 'uppercase' }}>
              {property.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}
            </div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>
              Escrow Protected
            </div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '44px', fontWeight: '900', color: '#ffffff', margin: '0 0 12px', lineHeight: '1.1' }}>
              {property.title}
            </h2>
            <p style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
              {property.lga}, {property.state}
            </p>
            <p style={{ fontSize: '52px', fontWeight: '900', color: '#f0c040', margin: '0 0 8px' }}>
              {formatPrice(property.price)}
              {property.price_period && property.price_period !== 'outright' && (
                <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                  {' '}/{property.price_period}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Listed by</p>
              <p style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{owner?.full_name}</p>
              {owner?.lasrera_id && (
                <p style={{ fontSize: '16px', color: '#f0c040', fontFamily: 'monospace', margin: '4px 0 0' }}>
                  {owner.lasrera_id}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '36px', fontWeight: '900', color: '#ffffff', margin: '0 0 4px' }}>
                Rent<span style={{ color: '#f0c040' }}>Easy</span>
              </p>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                renteasyapp.com/property/{property.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
ShareCard.displayName = 'ShareCard';

const SharePanel = ({ property, owner, onClose }: { property: Property; owner: Profile | null; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const propertyUrl = `https://renteasyapp.com/property/${property.id}`;
  const priceStr = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(property.price);
  const periodStr = property.price_period && property.price_period !== 'outright' ? `/${property.price_period}` : '';
  const whatsappText = encodeURIComponent(`🏠 *${property.title}*\n📍 ${property.lga}, ${property.state}\n💰 ${priceStr}${periodStr}\n✓ Escrow Protected · ✓ Verified\n\nBook inspection:\n${propertyUrl}\n\n_Listed on RentEasy — Nigeria's trusted real estate platform_`);
  const twitterText = encodeURIComponent(`${property.title} in ${property.lga}, ${property.state}\n${priceStr}${periodStr} · Escrow Protected\nBook inspection 👇\n${propertyUrl}\n#LagosRealEstate #RentEasy`);

  const trackShare = async (platform: string) => {
    try {
      await supabase.rpc('increment_share_count', { property_id: property.id });
    } catch { }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(propertyUrl);
    setCopied(true);
    trackShare('copy');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCard = async () => {
    if (!shareCardRef.current) return;
    setGeneratingCard(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 1, useCORS: true, allowTaint: true, backgroundColor: '#0a1f11',
      });
      const link = document.createElement('a');
      link.download = `renteasy-${property.id.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      trackShare('image_card');
    } catch (err) {
      console.error('Failed to generate card:', err);
    } finally {
      setGeneratingCard(false);
    }
  };

  const handleGenerateQR = async () => {
    setGeneratingQR(true);
    try {
      const dataUrl = await QRCode.toDataURL(propertyUrl, {
        width: 400, margin: 2,
        color: { dark: '#ffffff', light: '#0a1f11' },
      });
      setQrDataUrl(dataUrl);
      trackShare('qr_code');
    } catch (err) {
      console.error('Failed to generate QR:', err);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `renteasy-qr-${property.id.slice(0, 8)}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <>
      <ShareCard ref={shareCardRef} property={property} owner={owner} />
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-white">Share this listing</h3>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank" rel="noopener noreferrer"
            onClick={() => trackShare('whatsapp')}
            className="flex items-center gap-3 w-full p-4 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/15 transition-colors"
          >
            <div className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Share on WhatsApp</p>
              <p className="text-[11px] text-white/35">Send with pre-filled property details</p>
            </div>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${twitterText}`}
            target="_blank" rel="noopener noreferrer"
            onClick={() => trackShare('twitter')}
            className="flex items-center gap-3 w-full p-4 bg-white/4 border border-white/8 rounded-xl hover:bg-white/6 transition-colors"
          >
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
              <Twitter className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Share on X</p>
              <p className="text-[11px] text-white/35">Post to your followers</p>
            </div>
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 w-full p-4 bg-white/4 border border-white/8 rounded-xl hover:bg-white/6 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${copied ? 'bg-[#1a6b3c]' : 'bg-white/8'}`}>
              {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white/60" />}
            </div>
            <div className="text-left">
              <p className="text-[13px] font-bold text-white">{copied ? 'Link Copied!' : 'Copy Link'}</p>
              <p className="text-[11px] text-white/35 truncate max-w-[220px]">{propertyUrl}</p>
            </div>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadCard}
              disabled={generatingCard}
              className="flex flex-col items-center gap-2 p-4 bg-white/4 border border-white/8 rounded-xl hover:bg-white/6 transition-colors disabled:opacity-50"
            >
              {generatingCard
                ? <div className="w-6 h-6 border-2 border-[#f0c040] border-t-transparent rounded-full animate-spin" />
                : <Download className="w-6 h-6 text-[#f0c040]" />
              }
              <p className="text-[12px] font-bold text-white">Save as Image</p>
              <p className="text-[10px] text-white/30 text-center">1080×1080 card</p>
            </button>
            <button
              onClick={qrDataUrl ? handleDownloadQR : handleGenerateQR}
              disabled={generatingQR}
              className="flex flex-col items-center gap-2 p-4 bg-white/4 border border-white/8 rounded-xl hover:bg-white/6 transition-colors disabled:opacity-50"
            >
              {generatingQR
                ? <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
                : qrDataUrl
                ? <img src={qrDataUrl} alt="QR" className="w-10 h-10 rounded-lg" />
                : <QrCode className="w-6 h-6 text-[#1a6b3c]" />
              }
              <p className="text-[12px] font-bold text-white">
                {qrDataUrl ? 'Download QR' : 'Generate QR'}
              </p>
              <p className="text-[10px] text-white/30 text-center">Print-ready QR code</p>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ old_price: number; new_price: number; changed_at: string }[]>([]);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('property_price_history')
      .select('old_price, new_price, changed_at')
      .eq('property_id', id)
      .order('changed_at', { ascending: false })
      .then(({ data }) => setPriceHistory(data || []));
  }, [id]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => { if (id) fetchProperty(); }, [id]);

  const fetchProperty = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Step 1 — fetch property without profile FK join
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Property not found');

      setProperty(data);

      // Step 2 — fetch owner profile separately
      if (data.owner_id) {
        const { data: ownerData } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, role, verification_status, lasrera_id')
          .eq('id', data.owner_id)
          .single();
        setOwner(ownerData as Profile);
      }

      // Increment view count — debounced via localStorage
      const viewKey = `viewed_${id}`;
      const lastViewed = localStorage.getItem(viewKey);
      const now = Date.now();
      if (!lastViewed || now - parseInt(lastViewed) > 3600000) {
        localStorage.setItem(viewKey, now.toString());
        supabase.from('properties')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', id)
          .then(() => {});
        supabase.from('property_views')
          .insert({ property_id: id, viewer_id: user?.id || null })
          .then(() => {});
      }

      // Check if saved
      if (user) {
        const { data: savedData } = await supabase
          .from('saved_properties')
          .select('id')
          .eq('user_id', user.id)
          .eq('property_id', id)
          .maybeSingle();
        setSaved(!!savedData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const allMedia = [
    ...(property?.images || []).map(url => ({ type: 'image' as const, url })),
    ...(property?.videos || []).map(url => ({ type: 'video' as const, url })),
  ];

  const currentMedia = allMedia[activeIndex];
  const goNext = () => setActiveIndex(i => (i + 1) % allMedia.length);
  const goPrev = () => setActiveIndex(i => (i - 1 + allMedia.length) % allMedia.length);
  const isOwner = user?.id === property?.owner_id;

  const periodLabel: Record<string, string> = { yearly: '/ year', monthly: '/ month', nightly: '/ night', outright: '' };

  const propertyUrl = `https://renteasyapp.com/property/${id}`;
  const ogDescription = property
    ? `${formatNaira(property.price)} · ${property.lga}, ${property.state} · Escrow Protected · Book Inspection on RentEasy`
    : 'Find verified properties in Nigeria with escrow protection.';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-5 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="max-w-7xl mx-auto">
          <div className="skeleton h-8 w-24 mb-6 rounded-xl" />
          <PropertySkeleton />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-5 text-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-[20px] font-bold text-white mb-2">Property not found</h1>
        <p className="text-[13px] text-white/40 mb-6 max-w-xs">{error || "This property doesn't exist or has been removed."}</p>
        <button onClick={() => navigate('/listings')} className="bg-[#1a6b3c] text-white px-6 py-3 rounded-xl font-semibold text-[14px] hover:bg-[#0f4a2a] transition-colors">
          Back to Listings
        </button>
      </div>
    );
  }

  if (property.status === 'inactive' || property.status === 'flagged' || property.deleted_at || (property.is_delisted && !isOwner)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-5 text-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <AlertCircle className="w-12 h-12 text-[#f0c040] mb-4" />
        <h1 className="text-[20px] font-bold text-white mb-2">Listing Unavailable</h1>
        <p className="text-[13px] text-white/40 mb-6 max-w-xs">This listing has been suspended and is currently unavailable.</p>
        <button onClick={() => navigate('/listings')} className="bg-[#1a6b3c] text-white px-6 py-3 rounded-xl font-semibold text-[14px] hover:bg-[#0f4a2a] transition-colors">
          Back to Listings
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{property.title} — RentEasy</title>
        <meta property="og:title" content={property.title} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={property.images?.[0] || 'https://renteasyapp.com/og-image.png'} />
        <meta property="og:url" content={propertyUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={property.title} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={property.images?.[0] || 'https://renteasyapp.com/og-image.png'} />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0a] page-with-tabs" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ── Sticky top bar ── */}
        <div className="sticky top-16 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[13px] font-semibold text-white/55 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (!user) { navigate('/login'); return; }
                  setSavingProperty(true);
                  try {
                    if (saved) {
                      await supabase.from('saved_properties').delete().eq('user_id', user.id).eq('property_id', property.id);
                      setSaved(false);
                    } else {
                      await supabase.from('saved_properties').insert({ user_id: user.id, property_id: property.id });
                      setSaved(true);
                    }
                  } catch { }
                  finally { setSavingProperty(false); }
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${saved ? 'bg-gold/25 text-gold' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/8'}`}
              >
                {savingProperty
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                }
              </button>
              <button
                onClick={() => setShowSharePanel(true)}
                className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-5 py-6">

          {/* ── Media gallery ── */}
          <div className="mb-6">
            <div
              className="relative aspect-[16/9] lg:aspect-[21/9] bg-[#0a1f11] rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => currentMedia?.type === 'image' && setLightboxOpen(true)}
            >
              {currentMedia?.type === 'image' ? (
                <img src={currentMedia.url} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : currentMedia?.type === 'video' ? (
                <video src={currentMedia.url} className="w-full h-full object-cover" controls autoPlay />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-14 h-14 text-white/10" />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-[#f0c040] text-black text-[11px] font-bold px-3 py-1.5 rounded-xl uppercase">
                  {property.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}
                </span>
                {property.escrow_verified && (
                  <span className="bg-[#1a6b3c] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Escrow Verified
                  </span>
                )}
              </div>
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Eye className="w-3 h-3" /> {activeIndex + 1} / {allMedia.length}
              </div>
              {allMedia.length > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); goPrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); goNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {allMedia.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {allMedia.map((media, i) => (
                  <button key={i} onClick={() => setActiveIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeIndex === i ? 'border-[#f0c040] opacity-100' : 'border-transparent opacity-40 hover:opacity-70'}`}
                  >
                    {media.type === 'image' ? (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#0a1f11] flex flex-col items-center justify-center gap-1">
                        <Video className="w-5 h-5 text-white/60" />
                        <span className="text-[8px] text-white/40 font-bold uppercase">Video</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <span className="text-[12px] text-white/35">
                {property.images?.length || 0} photo{(property.images?.length || 0) !== 1 ? 's' : ''}
                {property.videos?.length ? ` · ${property.videos.length} video${property.videos.length > 1 ? 's' : ''}` : ''}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/25">Share:</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🏠 ${property.title}\n📍 ${property.lga}, ${property.state}\n💰 ${formatNaira(property.price)}\n\n${propertyUrl}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 bg-[#25D366]/15 rounded-lg flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${property.title} · ${formatNaira(property.price)} · ${propertyUrl} #RentEasy`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <Twitter className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setShowSharePanel(true)}
                  className="text-[11px] text-[#f0c040]/60 hover:text-[#f0c040] font-semibold transition-colors"
                >
                  More →
                </button>
              </div>
            </div>
          </div>

          {/* ── Main layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left */}
            <div className="lg:col-span-2 space-y-5">

              {/* Title + Price */}
              <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-[22px] lg:text-[26px] font-black text-white tracking-tight leading-snug mb-2">
                      {property.title}
                    </h1>
                    <div className="flex items-center gap-1.5 text-white/45">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-[#1a6b3c]" />
                      <span className="text-[13px]">{property.address}, {property.lga}, {property.state}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] text-white/30 bg-white/5 px-2.5 py-1 rounded-lg capitalize flex items-center gap-1">
                        <Layers className="w-3 h-3" />{property.listing_type}
                      </span>
                      <span className="text-[11px] text-white/30 bg-white/5 px-2.5 py-1 rounded-lg capitalize">{property.category}</span>
                      <span className="text-[11px] text-white/30 bg-white/5 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Eye className="w-3 h-3" />{property.view_count || 0} views
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right flex-shrink-0">
                    <div className="text-[28px] font-black text-[#f0c040] leading-none">{formatNaira(property.price)}</div>
                    {property.price_period && (
                      <div className="text-[12px] text-white/35 mt-1">{periodLabel[property.price_period]}</div>
                    )}
                    {priceHistory.length > 0 && (
                      <button
                        onClick={() => setShowPriceHistory(!showPriceHistory)}
                        className="text-[11px] text-white/30 hover:text-white/55 underline mt-1 transition-colors"
                      >
                        Price history
                      </button>
                    )}
                    {showPriceHistory && priceHistory.length > 0 && (
                      <div className="mt-2 space-y-1 text-right">
                        {priceHistory.map((h, i) => (
                          <div key={i} className="text-[11px] text-white/35">
                            {formatNaira(h.old_price)} {'\u2192'} {formatNaira(h.new_price)}
                            <span className="text-white/20"> · {new Date(h.changed_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {property.listing_type === 'house' ? (
                  <>
                    {property.bedrooms && <StatBox icon={Bed} value={property.bedrooms} label="Bedrooms" />}
                    {property.bathrooms && <StatBox icon={Bath} value={property.bathrooms} label="Bathrooms" />}
                  </>
                ) : (
                  <div className="col-span-2">
                    <StatBox icon={Maximize} value={`${property.land_size_value} ${property.land_size_unit}`} label="Land Size" />
                  </div>
                )}
                {property.listing_type === 'land' && property.land_title && (
                  <StatBox icon={FileText} value={property.land_title} label="Title Type" />
                )}
                {property.min_rental_duration && (
                  <StatBox icon={Clock} value={property.min_rental_duration} label="Min Duration" />
                )}
              </div>

              {/* Rental terms */}
              {property.transaction_type === 'rent' && (property.min_rental_duration || property.house_rules) && (
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ScrollText className="w-4 h-4 text-[#1a6b3c]" />
                    <h3 className="text-[14px] font-bold text-white">Rental Terms</h3>
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-lg">Public info</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {property.min_rental_duration && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-[#1a6b3c]" />
                        </div>
                        <div>
                          <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-0.5">Min Duration</p>
                          <p className="text-[13px] font-semibold text-white">{property.min_rental_duration}</p>
                        </div>
                      </div>
                    )}
                    {property.house_rules && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Tag className="w-4 h-4 text-[#1a6b3c]" />
                        </div>
                        <div>
                          <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-0.5">House Rules</p>
                          <p className="text-[13px] text-white/65 leading-relaxed">{property.house_rules}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {property.description && (
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                  <h3 className="text-[14px] font-bold text-white mb-3">About this property</h3>
                  <p className="text-[13px] text-white/55 leading-relaxed whitespace-pre-wrap">{property.description}</p>
                </div>
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                  <h3 className="text-[14px] font-bold text-white mb-4">Amenities & Features</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {property.amenities.map((amenity, i) => <AmenityChip key={i} text={amenity} />)}
                  </div>
                </div>
              )}

              {/* Survey plan */}
              {property.listing_type === 'land' && property.survey_plan_url && (
                <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                  <h3 className="text-[14px] font-bold text-white mb-3">Survey Plan</h3>
                  <a href={property.survey_plan_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-white/4 border border-white/8 rounded-xl hover:border-[#f0c040]/25 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#1a6b3c]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-white">View Survey Plan</p>
                      <p className="text-[11px] text-white/35">Opens in new tab</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#f0c040] transition-colors" />
                  </a>
                </div>
              )}

              {/* Barrister Amaka */}
              <div className="bg-[#0a1f11] border border-[#f0c040]/10 rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                  <svg width="44" height="58" viewBox="0 0 80 110" fill="none" className="flex-shrink-0">
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
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-[#f0c040] uppercase tracking-widest mb-1">Know Your Rights</div>
                    <p className="text-[12px] font-semibold text-white leading-snug mb-0.5">
                      Always sign a tenancy agreement before making any payment
                    </p>
                    <p className="text-[11px] text-white/30">Tenancy Law of Lagos State 2011</p>
                  </div>
                </div>
                <Link to="/legal-guide" className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-[11px] font-semibold text-[#f0c040]/50 hover:text-[#f0c040] transition-colors">
                  Learn your full rights as a tenant
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">

              {/* Owner card */}
              <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
                <h3 className="text-[12px] font-bold text-white/40 uppercase tracking-wider mb-4">Listed by</h3>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-[#1a6b3c] rounded-xl overflow-hidden flex items-center justify-center text-white font-bold text-[16px] flex-shrink-0">
                    {owner?.avatar_url ? (
                      <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (owner?.full_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-white truncate">{owner?.full_name}</span>
                      <VerifiedBadge status={owner?.verification_status} size={14} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-white/35 capitalize font-medium">
                        {owner?.role === 'agent' ? 'Agent' : owner?.role === 'landlord' ? 'Landlord' : owner?.role}
                        {owner?.verification_status === 'verified' && <span className="text-white/25"> · Verified</span>}
                      </span>
                      {owner?.lasrera_id && (
                        <span className="text-[10px] text-white/25 font-mono">
                          {owner.lasrera_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isOwner && (
                  <ChatButton
                    property={property}
                    buttonLabel={owner?.role === 'agent' ? 'Message Agent' : 'Message Landlord'}
                  />
                )}
                {isOwner && (
                  <div className="text-[12px] text-white/30 text-center py-2">This is your listing</div>
                )}
              </div>

              {/* Inspection fee */}
              {property.status === 'active' && !isOwner && <InspectionFeeDisplay property={property} />}

              {/* Escrow info */}
              <div className="bg-[#0a1f11] border border-[#1a6b3c]/25 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-[#1a6b3c]" />
                  <h3 className="text-[14px] font-bold text-white">Escrow Protected</h3>
                </div>
                <p className="text-[12px] text-white/45 leading-relaxed mb-4">
                  Your payment is held securely by RentEasy and only released to the {owner?.role} after you've confirmed everything is right.
                </p>
                <div className="space-y-2">
                  {['Payment held until move-in confirmed', 'Full refund if property is misrepresented', 'Permanent transaction audit trail'].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#4ade80] flex-shrink-0 mt-0.5" />
                      <span className="text-[12px] text-white/50">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {user && !isOwner && (
                <button className="w-full text-[12px] text-white/25 hover:text-white/50 transition-colors py-2 text-center">
                  🚩 Report this listing
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxOpen && currentMedia?.type === 'image' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLightboxOpen(false)}
              className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
            >
              <button onClick={e => { e.stopPropagation(); goPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <img src={currentMedia.url} alt={property.title} className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
              <button onClick={e => { e.stopPropagation(); goNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ArrowLeft className="w-4 h-4 rotate-[135deg]" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-white/40">
                {activeIndex + 1} / {allMedia.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share panel */}
        <AnimatePresence>
          {showSharePanel && (
            <SharePanel property={property} owner={owner} onClose={() => setShowSharePanel(false)} />
          )}
        </AnimatePresence>

        {/* Report listing modal */}
        <AnimatePresence>
          {showReportModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { if (!submittingReport) { setShowReportModal(false); setReportSubmitted(false); setReportReason(''); setReportDetails(''); } }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-x-4 bottom-4 md:inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] overflow-hidden shadow-2xl p-6"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {reportSubmitted ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-[#1a6b3c]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-6 h-6 text-[#4ade80]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-white mb-2">Report submitted</h3>
                    <p className="text-[13px] text-white/40 mb-6">Thanks for flagging this. Our team will review it shortly.</p>
                    <button
                      onClick={() => { setShowReportModal(false); setReportSubmitted(false); setReportReason(''); setReportDetails(''); }}
                      className="w-full bg-[#1a6b3c] text-white py-3 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-[15px] font-bold text-white">Report this listing</h3>
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 mb-4">
                      {[
                        'Misleading photos or description',
                        'Price seems wrong or fake',
                        'Property already rented/sold elsewhere',
                        'Suspected scam or fraud',
                        'Inappropriate content',
                        'Other',
                      ].map((r) => (
                        <button
                          key={r}
                          onClick={() => setReportReason(r)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-[13px] font-medium transition-colors border ${
                            reportReason === r
                              ? 'bg-[#f0c040]/10 border-[#f0c040]/30 text-white'
                              : 'bg-white/4 border-white/8 text-white/60 hover:bg-white/6'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Any extra details (optional)..."
                      rows={3}
                      className="w-full p-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#f0c040]/40 transition-colors resize-none mb-4"
                    />
                    <button
                      onClick={async () => {
                        if (!reportReason || !user) return;
                        setSubmittingReport(true);
                        try {
                          await supabase.from('property_reports').insert({
                            property_id: property.id,
                            reporter_id: user.id,
                            reason: reportReason,
                            details: reportDetails.trim() || null,
                          });
                          setReportSubmitted(true);
                        } catch (err) {
                          console.error('Failed to submit report:', err);
                        } finally {
                          setSubmittingReport(false);
                        }
                      }}
                      disabled={!reportReason || submittingReport}
                      className="w-full bg-red-500/90 text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-red-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {submittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
                    </button>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}