import React, { useEffect, useState } from 'react';
import {
  Building2, CheckCircle2, AlertTriangle, Loader2,
  Search, MapPin, ExternalLink, X, Eye
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { PropertyStatus } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { abbreviatePrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function PropertyModeration() {
  const { properties, setProperties, loading, fetchProperties } = useAdmin();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [propertyToSuspend, setPropertyToSuspend] = useState<string | null>(null);
  const [previewProperty, setPreviewProperty] = useState<typeof properties[0] | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchProperties(); }, []);

  const handleApprove = async (propertyId: string) => {
    if (!user) return;
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;
    if (property.status === 'active') {
      showToast('This property is already approved.', 'error');
      return;
    }
    setActionLoading(propertyId);
    try {
      const { error } = await supabase.from('properties').update({ status: 'active' }).eq('id', propertyId);
      if (error) throw error;
      await supabase.from('admin_logs').insert({ actor_id: user.id, action: 'property_approved', target_id: propertyId, target_type: 'property', details: { new_status: 'active' } });
      await supabase.from('notifications').insert({ user_id: property.owner_id, title: 'Property Approved!', body: `Your listing "${property.title}" is now live.`, type: 'listing_approved', link: `/property/${propertyId}` });
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'active' as PropertyStatus } : p));
      showToast('Property approved and is now live', 'success');
      setPreviewProperty(null);
    } catch (err: unknown) {
      showToast(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (!user || !propertyToSuspend || !suspensionReason) return;
    const property = properties.find(p => p.id === propertyToSuspend);
    if (property?.status === 'inactive') {
      showToast('This property is already suspended.', 'error');
      setShowSuspendModal(false);
      return;
    }
    setActionLoading(propertyToSuspend);
    try {
      const { error } = await supabase.from('properties').update({ status: 'inactive' }).eq('id', propertyToSuspend);
      if (error) throw error;
      await supabase.from('admin_logs').insert({ actor_id: user.id, action: 'property_suspended', target_id: propertyToSuspend, target_type: 'property', details: { reason: suspensionReason } });
      if (property) {
        await supabase.from('notifications').insert({ user_id: property.owner_id, title: 'Property Suspended', body: `Your listing "${property.title}" was suspended. Reason: ${suspensionReason}`, type: 'listing_rejected', link: `/property/${propertyToSuspend}` });
      }
      setProperties(prev => prev.map(p => p.id === propertyToSuspend ? { ...p, status: 'inactive' as PropertyStatus } : p));
      showToast('Property suspended', 'success');
      setShowSuspendModal(false);
      setSuspensionReason('');
      setPropertyToSuspend(null);
      setPreviewProperty(null);
    } catch (err: unknown) {
      showToast(`Failed to suspend: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = properties.filter(p => {
    const matchSearch = (p.title || "").toLowerCase().includes(searchTerm.toLowerCase()) || (p.address || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusStyle = (status: string) => {
    if (status === 'active') return 'bg-gold/12 text-gold';
    if (status === 'pending_review') return 'bg-white/8 text-paper/60';
    if (status === 'inactive') return 'bg-danger/10 text-danger';
    return 'bg-white/6 text-paper/40';
  };

  if (loading && properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-paper/30">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={font}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl text-[13px] font-bold shadow-xl ${
              toast.type === 'success' ? 'bg-gold text-ink' : 'bg-danger text-paper'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/25" />
          <input
            type="text"
            placeholder="Search by title or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-paper/25 outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | 'all')}
          className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper outline-none focus:border-gold/50 transition-colors"
        >
          <option value="all" className="bg-ink">All Statuses</option>
          <option value="pending_review" className="bg-ink">Pending Review</option>
          <option value="active" className="bg-ink">Active</option>
          <option value="inactive" className="bg-ink">Suspended</option>
        </select>
      </div>

      {/* Card list -- one row per property, actions inline and stacked on
          mobile, no floating dropdown that's awkward to tap on a phone */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate/20 border border-white/6 rounded-2xl p-12 text-center">
            <p className="text-[13px] text-paper/25">No properties found.</p>
          </div>
        ) : (
          filtered.map((property) => (
            <div key={property.id} className="bg-slate/20 border border-white/6 rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => setPreviewProperty(property)}
                  className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/8"
                >
                  {property.images[0]
                    ? <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                    : <Building2 className="w-5 h-5 text-paper/20 m-auto mt-3" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => setPreviewProperty(property)} className="text-left w-full">
                    <p className="text-[13px] font-bold text-paper truncate">{property.title}</p>
                  </button>
                  <p className="text-[11px] text-paper/35 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />{property.lga}, {property.state}
                  </p>
                  <p className="text-[11px] text-paper/40 mt-0.5">{property.profiles?.full_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-black text-gold tabular-nums">
                    {abbreviatePrice(property.price)}
                    {property.price_period && <span className="text-[10px] text-paper/30 font-normal ml-1">/{property.price_period}</span>}
                  </p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${statusStyle(property.status)}`}>
                    {property.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {property.status !== 'active' && (
                  <button
                    onClick={() => handleApprove(property.id)}
                    disabled={actionLoading === property.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold text-ink rounded-xl font-bold text-[12px] hover:bg-gold-dark transition-colors disabled:opacity-50"
                  >
                    {actionLoading === property.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                )}
                {property.status !== 'inactive' && (
                  <button
                    onClick={() => { setPropertyToSuspend(property.id); setShowSuspendModal(true); }}
                    disabled={actionLoading === property.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-paper/60 rounded-xl font-bold text-[12px] hover:bg-white/8 hover:text-paper transition-colors disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Suspend
                  </button>
                )}
                <button
                  onClick={() => window.open(`/property/${property.id}`, '_blank')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-paper/40 rounded-xl font-bold text-[12px] hover:bg-white/8 hover:text-paper/70 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Listing
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Property preview modal */}
      <AnimatePresence>
        {previewProperty && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPreviewProperty(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed inset-x-4 top-4 bottom-4 md:inset-0 md:m-auto md:w-full md:max-w-2xl md:h-fit md:max-h-[85vh] bg-slate/20 border border-white/8 rounded-2xl z-[110] shadow-2xl overflow-hidden flex flex-col" style={font}
            >
              <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between flex-shrink-0">
                <h3 className="text-[15px] font-bold text-paper">Property Preview</h3>
                <button onClick={() => setPreviewProperty(null)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {previewProperty.images?.[0] && (
                  <img src={previewProperty.images[0]} alt="" className="w-full h-56 object-cover rounded-xl" />
                )}
                {previewProperty.images && previewProperty.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {previewProperty.images.slice(1).map((img, i) => (
                      <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                    ))}
                  </div>
                )}
                <div>
                  <h4 className="text-[18px] font-black text-paper mb-1">{previewProperty.title}</h4>
                  <p className="text-[12px] text-paper/40 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />{previewProperty.address}, {previewProperty.lga}, {previewProperty.state}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-[20px] font-black text-gold tabular-nums">
                    {abbreviatePrice(previewProperty.price)}
                    {previewProperty.price_period && <span className="text-[12px] text-paper/30 font-normal ml-1">/{previewProperty.price_period}</span>}
                  </p>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${statusStyle(previewProperty.status)}`}>
                    {previewProperty.status.replace('_', ' ')}
                  </span>
                </div>
                {previewProperty.description && (
                  <div>
                    <p className="text-[11px] font-bold text-paper/30 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-[13px] text-paper/60 leading-relaxed whitespace-pre-wrap">{previewProperty.description}</p>
                  </div>
                )}
                {previewProperty.amenities && previewProperty.amenities.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-paper/30 uppercase tracking-wider mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {previewProperty.amenities.map((a, i) => (
                        <span key={i} className="text-[11px] text-paper/60 bg-white/5 px-2.5 py-1 rounded-lg">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold text-paper/30 uppercase tracking-wider mb-1">Listed by</p>
                  <p className="text-[13px] font-semibold text-paper">{previewProperty.profiles?.full_name || 'Unknown'}</p>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-white/6 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                {previewProperty.status !== 'inactive' && (
                  <button
                    onClick={() => { setPropertyToSuspend(previewProperty.id); setShowSuspendModal(true); setPreviewProperty(null); }}
                    disabled={actionLoading === previewProperty.id}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 text-paper/60 rounded-xl font-bold text-[12px] hover:bg-white/8 transition-colors disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
                {previewProperty.status !== 'active' && (
                  <button
                    onClick={() => handleApprove(previewProperty.id)}
                    disabled={actionLoading === previewProperty.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-ink rounded-xl font-bold text-[12px] hover:bg-gold-dark transition-colors disabled:opacity-50"
                  >
                    {actionLoading === previewProperty.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve Property
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Suspend modal */}
      <AnimatePresence>
        {showSuspendModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSuspendModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-slate/20 border border-white/8 rounded-2xl z-[110] p-6 shadow-2xl" style={font}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold text-paper">Suspend Property</h3>
                <button onClick={() => setShowSuspendModal(false)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-paper/45 mb-4 leading-relaxed">Provide a reason for suspending this listing. The owner will be notified.</p>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Inaccurate pricing, misleading photos..."
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-paper/25 outline-none focus:border-gold/40 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowSuspendModal(false); setSuspensionReason(''); setPropertyToSuspend(null); }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-paper/40 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSuspend} disabled={!suspensionReason || actionLoading !== null}
                  className="flex-1 bg-danger text-paper py-3.5 rounded-xl font-bold text-[14px] hover:bg-danger-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Suspend'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
