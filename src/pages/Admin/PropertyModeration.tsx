import React, { useEffect, useState } from 'react';
import {
  Building2, CheckCircle2, AlertTriangle, Loader2,
  Search, MapPin, MoreVertical, ExternalLink,
  History as HistoryIcon, X
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
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [propertyToSuspend, setPropertyToSuspend] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchProperties(); }, []);

  const handleApprove = async (propertyId: string) => {
    if (!user) return;
    setActionLoading(propertyId);
    try {
      const { error } = await supabase.from('properties').update({ status: 'active' }).eq('id', propertyId);
      if (error) throw error;
      await supabase.from('admin_logs').insert({ actor_id: user.id, action: 'property_approved', target_id: propertyId, target_type: 'property', details: { new_status: 'active' } });
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        await supabase.from('notifications').insert({ user_id: property.owner_id, title: 'Property Approved!', body: `Your listing "${property.title}" is now live.`, type: 'listing_approved', link: `/property/${propertyId}` });
      }
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      showToast('Property approved and is now live', 'success');
      setSelectedProperty(null);
    } catch (err: unknown) {
      showToast(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (!user || !propertyToSuspend || !suspensionReason) return;
    setActionLoading(propertyToSuspend);
    try {
      const { error } = await supabase.from('properties').update({ status: 'inactive' }).eq('id', propertyToSuspend);
      if (error) throw error;
      await supabase.from('admin_logs').insert({ actor_id: user.id, action: 'property_suspended', target_id: propertyToSuspend, target_type: 'property', details: { reason: suspensionReason } });
      const property = properties.find(p => p.id === propertyToSuspend);
      if (property) {
        await supabase.from('notifications').insert({ user_id: property.owner_id, title: 'Property Suspended', body: `Your listing "${property.title}" was suspended. Reason: ${suspensionReason}`, type: 'listing_rejected', link: `/property/${propertyToSuspend}` });
      }
      setProperties(prev => prev.filter(p => p.id !== propertyToSuspend));
      showToast('Property suspended', 'success');
      setShowSuspendModal(false);
      setSuspensionReason('');
      setPropertyToSuspend(null);
      setSelectedProperty(null);
    } catch (err: unknown) {
      showToast(`Failed to suspend: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async (propertyId: string) => {
    if (!user) return;
    setActionLoading(propertyId);
    try {
      const { error } = await supabase.from('properties').update({ status: 'flagged' }).eq('id', propertyId);
      if (error) throw error;
      await supabase.from('admin_logs').insert({ actor_id: user.id, action: 'property_flagged', target_id: propertyId, target_type: 'property', details: { status: 'flagged' } });
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'flagged' as PropertyStatus } : p));
      showToast('Property flagged for review', 'success');
      setSelectedProperty(null);
    } catch (err: unknown) {
      showToast(`Failed to flag: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
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
    if (status === 'active') return 'bg-[#1a6b3c]/15 text-[#1a6b3c]';
    if (status === 'pending_review') return 'bg-[#f0c040]/15 text-[#f0c040]';
    if (status === 'flagged') return 'bg-red-500/15 text-red-400';
    if (status === 'inactive') return 'bg-white/5 text-white/40';
    return 'bg-white/5 text-white/40';
  };

  if (loading && properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={font}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl text-[13px] font-bold shadow-xl ${
              toast.type === 'success' ? 'bg-[#1a6b3c] text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by title or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/50 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | 'all')}
          className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#1a6b3c]/50 transition-colors"
        >
          <option value="all" className="bg-[#0a1f11]">All Statuses</option>
          <option value="pending_review" className="bg-[#0a1f11]">Pending Review</option>
          <option value="active" className="bg-[#0a1f11]">Active</option>
          <option value="inactive" className="bg-[#0a1f11]">Inactive</option>
          <option value="flagged" className="bg-[#0a1f11]">Flagged</option>
          <option value="sold" className="bg-[#0a1f11]">Sold</option>
          <option value="rented" className="bg-[#0a1f11]">Rented</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-5 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-wider">Property</th>
                <th className="px-5 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-wider hidden md:table-cell">Owner</th>
                <th className="px-5 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-wider">Price</th>
                <th className="px-5 py-4 text-left text-[10px] font-bold text-white/30 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-right text-[10px] font-bold text-white/30 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {filtered.map((property) => (
                <tr key={property.id} className="hover:bg-white/4 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/8">
                        {property.images[0]
                          ? <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                          : <Building2 className="w-5 h-5 text-white/20 m-auto mt-2.5" />
                        }
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{property.title}</p>
                        <p className="text-[11px] text-white/35 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{property.lga}, {property.state}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-[12px] font-semibold text-white/60">{property.profiles?.full_name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-black text-[#f0c040]">
                      {abbreviatePrice(property.price)}
                      {property.price_period && <span className="text-[10px] text-white/30 font-normal ml-1">/{property.price_period}</span>}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${statusStyle(property.status)}`}>
                      {property.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <button
                      onClick={() => setSelectedProperty(selectedProperty === property.id ? null : property.id)}
                      className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors ml-auto"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {selectedProperty === property.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 6 }}
                          className="absolute right-5 top-14 w-44 bg-[#111a14] border border-white/10 rounded-xl shadow-2xl z-20 p-1.5"
                        >
                          <button onClick={() => handleApprove(property.id)} disabled={actionLoading === property.id}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-[#1a6b3c] hover:bg-[#1a6b3c]/10 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === property.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button onClick={() => { setPropertyToSuspend(property.id); setShowSuspendModal(true); }} disabled={actionLoading === property.id}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-[#f0c040] hover:bg-[#f0c040]/8 rounded-lg transition-colors disabled:opacity-50">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                          <button onClick={() => handleFlag(property.id)} disabled={actionLoading === property.id}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-red-400 hover:bg-red-500/8 rounded-lg transition-colors disabled:opacity-50">
                            <HistoryIcon className="w-3.5 h-3.5" />
                            Flag
                          </button>
                          <div className="h-px bg-white/5 my-1" />
                          <button onClick={() => window.open(`/property/${property.id}`, '_blank')}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-white/40 hover:bg-white/5 rounded-lg transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Listing
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-[13px] text-white/25">No properties found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend modal */}
      <AnimatePresence>
        {showSuspendModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSuspendModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#0a1f11] border border-white/8 rounded-2xl z-[110] p-6 shadow-2xl" style={font}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold text-white">Suspend Property</h3>
                <button onClick={() => setShowSuspendModal(false)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-white/45 mb-4 leading-relaxed">Provide a reason for suspending this listing. The owner will be notified.</p>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Inaccurate pricing, misleading photos..."
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#f0c040]/40 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowSuspendModal(false); setSuspensionReason(''); setPropertyToSuspend(null); }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white/40 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSuspend} disabled={!suspensionReason || actionLoading !== null}
                  className="flex-1 bg-[#f0c040] text-black py-3.5 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
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