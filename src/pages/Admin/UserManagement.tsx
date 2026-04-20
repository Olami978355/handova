import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserCog, 
  Shield, 
  ShieldAlert, 
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { UserRole } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserManagement() {
  const { users, loading, fetchUsers, updateUserRole, isAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && users.length === 0) {
        setError('Taking too long. Please refresh.');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading, users.length]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      setSelectedUser(null);
      showToast(`User role updated to ${newRole}`, 'success');
    } else {
      showToast(result.error || 'Failed to update role', 'error');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-zinc-100 shadow-sm text-center px-6">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Failed to load users</h3>
        <p className="text-zinc-500 mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => { setError(null); fetchUsers(); }}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors shadow-lg shadow-[#1a6b3c]/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading users...</p>
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
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a6b3c]/20 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden xl:block text-right">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Testing Note</p>
            <p className="text-[10px] text-zinc-500 font-bold max-w-[200px]">
              To test as tenant or landlord, open an incognito window and sign up with a different email.
            </p>
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#1a6b3c]/20"
          >
            <option value="all">All Roles</option>
            <option value="tenant">Tenants</option>
            <option value="landlord">Landlords</option>
            <option value="agent">Agents</option>
            <option value="moderator">Moderators</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Joined</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden border-2 border-white shadow-sm">
                        <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{user.full_name}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                      user.role === 'moderator' ? 'bg-blue-50 text-blue-600' :
                      user.role === 'agent' ? 'bg-amber-50 text-amber-600' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-2">
                      {user.verification_status === 'verified' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-300" />
                      )}
                      <span className={`text-xs font-bold ${user.verification_status === 'verified' ? 'text-emerald-600' : 'text-zinc-500'}`}>
                        {user.verification_status}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-zinc-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <button 
                      onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                      className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-zinc-400" />
                    </button>

                    <AnimatePresence>
                      {selectedUser === user.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-8 top-16 w-48 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-20 p-2"
                        >
                          <p className="px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Change Role</p>
                          {(['tenant', 'landlord', 'agent', 'moderator', 'admin'] as UserRole[]).map((role) => (
                            <button
                              key={role}
                              disabled={!isAdmin}
                              onClick={() => handleRoleChange(user.id, role)}
                              className={`w-full flex items-center px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                                user.role === role 
                                  ? 'bg-[#1a6b3c]/10 text-[#1a6b3c]' 
                                  : 'text-zinc-600 hover:bg-zinc-50'
                              } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                          ))}
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
    </div>
  );
}
