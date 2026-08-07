import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, Loader2, CheckCircle2, XCircle, AlertCircle, ShieldOff, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { UserRole } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { VerifiedBadge } from '../../components/VerifiedBadge';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function UserManagement() {
  const { users, loading, fetchUsers, updateUserRole, suspendUser, isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [userToSuspend, setUserToSuspend] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchUsers();
    const timer = setTimeout(() => {
      if (loading && users.length === 0) setError('Taking too long. Please refresh.');
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = (u.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const result = await updateUserRole(userId, newRole);
    if (result.success) { setSelectedUser(null); showToast(`Role updated to ${newRole}`, 'success'); }
    else showToast(result.error || 'Failed to update role', 'error');
  };

  const handleSuspend = async () => {
    if (!userToSuspend || !suspendReason) return;
    setActionLoading(true);
    const result = await suspendUser(userToSuspend, suspendReason);
    setActionLoading(false);
    if (result.success) {
      showToast('User suspended', 'success');
      setShowSuspendModal(false);
      setSuspendReason('');
      setUserToSuspend(null);
      setSelectedUser(null);
    } else {
      showToast(result.error || 'Failed to suspend user', 'error');
    }
  };

  const roleStyle = (role: string) => {
    if (role === 'admin') return 'bg-gold/15 text-gold';
    if (role === 'moderator') return 'bg-gold/15 text-gold';
    if (role === 'agent') return 'bg-white/8 text-paper/60';
    if (role === 'landlord') return 'bg-white/8 text-paper/60';
    return 'bg-white/5 text-paper/30';
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate/20 border border-white/6 rounded-2xl text-center" style={font}>
        <AlertCircle className="w-10 h-10 text-danger mb-4" />
        <h3 className="text-[16px] font-bold text-paper mb-2">Failed to load users</h3>
        <p className="text-[12px] text-paper/35 mb-5">{error}</p>
        <button onClick={() => { setError(null); fetchUsers(); }} className="bg-gold text-paper px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-paper/30">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={font}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl text-[13px] font-bold shadow-xl ${
              toast.type === 'success' ? 'bg-gold text-paper' : 'bg-danger text-paper'
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
            type="text" placeholder="Search by name or email..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-paper/25 outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper outline-none focus:border-gold/50 transition-colors">
          <option value="all" className="bg-slate/20">All Roles</option>
          {(['tenant', 'landlord', 'agent', 'moderator', 'admin'] as UserRole[]).map(r => (
            <option key={r} value={r} className="bg-slate/20 capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}s</option>
          ))}
        </select>
      </div>

      <div className="bg-slate/20 border border-white/6 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-4 text-[10px] font-bold text-paper/30 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/4 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gold/20 rounded-xl overflow-hidden flex items-center justify-center text-gold text-[12px] font-bold flex-shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-bold text-paper">{u.full_name || 'Unnamed User'}</p>
                          <VerifiedBadge status={u.verification_status} size={13} />
                          {(u.strike_count || 0) > 0 && (
                            <span
                              title={`${u.strike_count} strike${u.strike_count === 1 ? '' : 's'}`}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                (u.strike_count || 0) >= 3 ? 'bg-danger/15 text-danger' : 'bg-gold/15 text-gold'
                              }`}
                            >
                              {u.strike_count} strike{u.strike_count === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-paper/35">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${roleStyle(u.role)}`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {u.verification_status === 'verified'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                        : <XCircle className="w-3.5 h-3.5 text-paper/20" />
                      }
                      <span className={`text-[11px] font-semibold ${u.verification_status === 'verified' ? 'text-gold' : 'text-paper/30'}`}>
                        {u.verification_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[11px] text-paper/35">{new Date(u.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <button onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)}
                      className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors ml-auto">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {selectedUser === u.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 6 }}
                          className="absolute right-5 top-14 w-48 bg-ink border border-white/10 rounded-xl shadow-2xl z-20 p-1.5"
                        >
                          <p className="px-3 py-2 text-[10px] font-bold text-paper/25 uppercase tracking-wider">Change Role</p>
                          {(['tenant', 'landlord', 'agent', 'moderator', 'admin'] as UserRole[]).map((role) => (
                            <button key={role} disabled={!isAdmin} onClick={() => handleRoleChange(u.id, role)}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold rounded-lg transition-colors ${
                                u.role === role ? 'bg-gold/15 text-gold' : 'text-paper/50 hover:bg-white/5 hover:text-paper'
                              } ${!isAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              {u.role === role && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                              <span className="capitalize">{role}</span>
                            </button>
                          ))}
                          <div className="h-px bg-white/5 my-1.5" />
                          <button
                            onClick={() => { setUserToSuspend(u.id); setShowSuspendModal(true); setSelectedUser(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          >
                            <ShieldOff className="w-3.5 h-3.5" /> Suspend Account
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-[13px] text-paper/25">No users found.</td></tr>
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
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-slate/20 border border-white/8 rounded-2xl z-[110] p-6 shadow-2xl" style={font}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-danger/10 rounded-xl flex items-center justify-center">
                    <ShieldOff className="w-4 h-4 text-danger" />
                  </div>
                  <h3 className="text-[15px] font-bold text-paper">Suspend User Account</h3>
                </div>
                <button onClick={() => setShowSuspendModal(false)} className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-paper/40 hover:text-paper transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[12px] text-paper/45 mb-4 leading-relaxed">
                This will immediately block the user from accessing the platform. They will be notified with your reason.
              </p>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Repeated fraudulent listings, harassment of other users..."
                className="w-full h-28 p-4 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder-paper/25 outline-none focus:border-danger/40 transition-colors resize-none mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowSuspendModal(false); setSuspendReason(''); setUserToSuspend(null); }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-paper/40 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSuspend} disabled={!suspendReason || actionLoading}
                  className="flex-1 bg-danger text-paper py-3.5 rounded-xl font-bold text-[14px] hover:bg-danger-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Suspension'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}