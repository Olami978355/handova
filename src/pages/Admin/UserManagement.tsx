import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { UserRole } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function UserManagement() {
  const { users, loading, fetchUsers, updateUserRole, isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    const matchSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const result = await updateUserRole(userId, newRole);
    if (result.success) { setSelectedUser(null); showToast(`Role updated to ${newRole}`, 'success'); }
    else showToast(result.error || 'Failed to update role', 'error');
  };

  const roleStyle = (role: string) => {
    if (role === 'admin') return 'bg-[#f0c040]/15 text-[#f0c040]';
    if (role === 'moderator') return 'bg-[#1a6b3c]/15 text-[#1a6b3c]';
    if (role === 'agent') return 'bg-white/8 text-white/60';
    if (role === 'landlord') return 'bg-white/8 text-white/60';
    return 'bg-white/5 text-white/30';
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0a1f11] border border-white/6 rounded-2xl text-center" style={font}>
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h3 className="text-[16px] font-bold text-white mb-2">Failed to load users</h3>
        <p className="text-[12px] text-white/35 mb-5">{error}</p>
        <button onClick={() => { setError(null); fetchUsers(); }} className="bg-[#1a6b3c] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" style={font}>
        <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-white/30">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={font}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl text-[13px] font-bold shadow-xl ${
              toast.type === 'success' ? 'bg-[#1a6b3c] text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text" placeholder="Search by name or email..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/50 transition-colors"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-white outline-none focus:border-[#1a6b3c]/50 transition-colors">
          <option value="all" className="bg-[#0a1f11]">All Roles</option>
          {(['tenant', 'landlord', 'agent', 'moderator', 'admin'] as UserRole[]).map(r => (
            <option key={r} value={r} className="bg-[#0a1f11] capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}s</option>
          ))}
        </select>
      </div>

      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-4 text-[10px] font-bold text-white/30 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/4 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#1a6b3c]/20 rounded-xl overflow-hidden flex items-center justify-center text-[#1a6b3c] text-[12px] font-bold flex-shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{u.full_name}</p>
                        <p className="text-[11px] text-white/35">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${roleStyle(u.role)}`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {u.verification_status === 'verified'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#1a6b3c]" />
                        : <XCircle className="w-3.5 h-3.5 text-white/20" />
                      }
                      <span className={`text-[11px] font-semibold ${u.verification_status === 'verified' ? 'text-[#1a6b3c]' : 'text-white/30'}`}>
                        {u.verification_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[11px] text-white/35">{new Date(u.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <button onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)}
                      className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors ml-auto">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {selectedUser === u.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 6 }}
                          className="absolute right-5 top-14 w-44 bg-[#111a14] border border-white/10 rounded-xl shadow-2xl z-20 p-1.5"
                        >
                          <p className="px-3 py-2 text-[10px] font-bold text-white/25 uppercase tracking-wider">Change Role</p>
                          {(['tenant', 'landlord', 'agent', 'moderator', 'admin'] as UserRole[]).map((role) => (
                            <button key={role} disabled={!isAdmin} onClick={() => handleRoleChange(u.id, role)}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-bold rounded-lg transition-colors ${
                                u.role === role ? 'bg-[#1a6b3c]/15 text-[#1a6b3c]' : 'text-white/50 hover:bg-white/5 hover:text-white'
                              } ${!isAdmin ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              {u.role === role && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                              <span className="capitalize">{role}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-[13px] text-white/25">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}