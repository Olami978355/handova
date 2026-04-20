import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Loader2, 
  Search, 
  Filter,
  MapPin,
  Shield,
  User,
  Calendar,
  MoreVertical,
  ExternalLink,
  History as HistoryIcon
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { PropertyStatus } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { abbreviatePrice } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function PropertyModeration() {
  const { properties, setProperties, loading, fetchProperties } = useAdmin();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [propertyToSuspend, setPropertyToSuspend] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleApprove = async (propertyId: string) => {
    if (!user) return;
    try {
      setActionLoading(propertyId);
      
      const { error } = await supabase
        .from('properties')
        .update({ status: 'active' })
        .eq('id', propertyId);
      
      if (error) throw error;

      // Log the action
      await supabase.from('admin_logs').insert({
        actor_id: user.id,
        action: 'property_approved',
        target_id: propertyId,
        target_type: 'property',
        details: { previous_status: 'pending_review', new_status: 'active' }
      });

      // Notify property owner
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        await supabase.from('notifications').insert({
          user_id: property.owner_id,
          title: 'Property Approved!',
          body: `Your listing "${property.title}" is now live.`,
          type: 'listing_approved',
          link: `/property/${propertyId}`
        });
      }

      // Refresh the list
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      showToast('Property approved and is now live', 'success');
      setSelectedProperty(null);
    } catch (err: any) {
      showToast(`Failed to approve: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    if (!user || !propertyToSuspend || !suspensionReason) return;
    try {
      setActionLoading(propertyToSuspend);
      
      const { error } = await supabase
        .from('properties')
        .update({ status: 'inactive' })
        .eq('id', propertyToSuspend);
      
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        actor_id: user.id,
        action: 'property_suspended',
        target_id: propertyToSuspend,
        target_type: 'property',
        details: { reason: suspensionReason, new_status: 'inactive' }
      });

      const property = properties.find(p => p.id === propertyToSuspend);
      if (property) {
        await supabase.from('notifications').insert({
          user_id: property.owner_id,
          title: 'Property Suspended',
          body: `Your listing "${property.title}" has been suspended. Reason: ${suspensionReason}`,
          type: 'listing_rejected',
          link: `/property/${propertyToSuspend}`
        });
      }

      setProperties(prev => prev.filter(p => p.id !== propertyToSuspend));
      showToast('Property suspended', 'success');
      setShowSuspendModal(false);
      setSuspensionReason('');
      setPropertyToSuspend(null);
      setSelectedProperty(null);
    } catch (err: any) {
      showToast(`Failed to suspend: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async (propertyId: string) => {
    if (!user) return;
    try {
      setActionLoading(propertyId);
      
      const { error } = await supabase
        .from('properties')
        .update({ status: 'flagged' })
        .eq('id', propertyId);
      
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        actor_id: user.id,
        action: 'property_flagged',
        target_id: propertyId,
        target_type: 'property',
        details: { status: 'flagged' }
      });

      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, status: 'flagged' } : p
      ));
      showToast('Property flagged for review', 'success');
      setSelectedProperty(null);
    } catch (err: any) {
      showToast(`Failed to flag: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast UI fixed at bottom right */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className={`fixed bottom-4 right-4 z-50 px-6 py-3 
              rounded-lg text-white font-medium shadow-lg
              ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search properties by title or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a6b3c]/20 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="flagged">Flagged</option>
            <option value="sold">Sold</option>
            <option value="rented">Rented</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Property</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Owner</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredProperties.map((property) => (
                <tr key={property.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden border border-zinc-100">
                        <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{property.title}</p>
                        <p className="text-[10px] text-zinc-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" /> {property.lga}, {property.state}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 overflow-hidden">
                        <img src={property.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${property.profiles?.full_name}`} alt="" />
                      </div>
                      <p className="text-xs font-bold text-zinc-700">{property.profiles?.full_name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-[#1a6b3c]">
                      {abbreviatePrice(property.price)}
                      {property.price_period && <span className="text-[10px] font-bold text-zinc-400 ml-1">/{property.price_period}</span>}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      property.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                      property.status === 'pending_review' ? 'bg-amber-50 text-amber-600' :
                      property.status === 'inactive' ? 'bg-zinc-100 text-zinc-600' :
                      property.status === 'flagged' ? 'bg-red-50 text-red-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {property.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <button 
                      onClick={() => setSelectedProperty(selectedProperty === property.id ? null : property.id)}
                      className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-zinc-400" />
                    </button>

                    <AnimatePresence>
                      {selectedProperty === property.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-8 top-16 w-48 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-20 p-2"
                        >
                          <p className="px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Moderation</p>
                          <button
                            onClick={() => handleApprove(property.id)}
                            disabled={actionLoading === property.id}
                            className="w-full flex items-center px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {actionLoading === property.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setPropertyToSuspend(property.id);
                              setShowSuspendModal(true);
                            }}
                            disabled={actionLoading === property.id}
                            className="w-full flex items-center px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {actionLoading === property.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                            Suspend
                          </button>
                          <button
                            onClick={() => handleFlag(property.id)}
                            disabled={actionLoading === property.id}
                            className="w-full flex items-center px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {actionLoading === property.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HistoryIcon className="w-4 h-4 mr-2" />}
                            Flag for Review
                          </button>
                          <div className="h-px bg-zinc-50 my-1"></div>
                          <button
                            onClick={() => window.open(`/property/${property.id}`, '_blank')}
                            className="w-full flex items-center px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 rounded-xl transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" /> View Listing
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend Modal */}
      <AnimatePresence>
        {showSuspendModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black text-zinc-900 mb-2">Suspend Property</h3>
              <p className="text-zinc-500 text-sm font-bold mb-6">Please provide a reason for suspending this listing. The owner will be notified.</p>
              
              <textarea 
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Inaccurate pricing, misleading photos, or reported as scam..."
                className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500/20 text-sm mb-6 resize-none"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspensionReason('');
                    setPropertyToSuspend(null);
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSuspend}
                  disabled={!suspensionReason || actionLoading !== null}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Suspend'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
