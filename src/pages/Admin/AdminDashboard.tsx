import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ShieldCheck, 
  Building2, 
  History, 
  LayoutDashboard,
  AlertCircle,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  UserCog,
  Eye,
  ArrowRight,
  DollarSign,
  Shield,
  User,
  Home,
  Loader2
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAdminStats } from '../../hooks/useAdminStats';
import { formatNaira } from '../../utils/format';
import { supabase } from '../../lib/supabase';

// Sub-components
import UserManagement from './UserManagement';
import VerificationQueue from './VerificationQueue';
import PropertyModeration from './PropertyModeration';
import DisputeQueue from './DisputeQueue';
import AdminLogs from './AdminLogs';

type AdminTab = 'overview' | 'users' | 'verifications' | 'properties' | 'escrow' | 'logs';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { isAdmin, isModerator, loading, error, fetchUsers, fetchPendingVerifications, fetchProperties, fetchLogs } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isModerator) {
      navigate('/dashboard');
    }
  }, [isModerator, loading, navigate]);

  const handleRetry = () => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'verifications') fetchPendingVerifications();
    else if (activeTab === 'properties') fetchProperties();
    else if (activeTab === 'logs') fetchLogs();
    else window.location.reload();
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Admin Panel Error</h2>
        <p className="text-zinc-500 mb-6 max-w-md">{error}</p>
        <button 
          onClick={handleRetry}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors shadow-lg shadow-[#1a6b3c]/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading && !isModerator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a6b3c]"></div>
      </div>
    );
  }

  if (!isModerator) return null;

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'moderator'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] },
    { id: 'verifications', label: 'Verification Queue', icon: ShieldCheck, roles: ['admin', 'moderator'] },
    { id: 'properties', label: 'Property Moderation', icon: Building2, roles: ['admin', 'moderator'] },
    { id: 'escrow', label: 'Escrow & Disputes', icon: AlertCircle, roles: ['admin', 'moderator'] },
    { id: 'logs', label: 'Admin Logs', icon: History, roles: ['admin'] },
  ];

  const filteredSidebarItems = sidebarItems.filter(item => 
    item.roles.includes(profile?.role || '')
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-zinc-200 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#1a6b3c] rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tighter text-zinc-900">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredSidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === item.id 
                  ? 'bg-[#1a6b3c] text-white shadow-lg shadow-[#1a6b3c]/20' 
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="bg-zinc-50 rounded-2xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden">
                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}`} alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">{profile?.full_name}</p>
                <p className="text-xs font-bold text-[#1a6b3c] uppercase tracking-wider">{profile?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-zinc-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-[#1a6b3c] rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <h2 className="text-sm font-black text-zinc-900 tracking-tighter">Admin</h2>
          </div>
          
          <h2 className="text-sm lg:text-lg font-bold text-zinc-900 hidden lg:block">
            {sidebarItems.find(i => i.id === activeTab)?.label}
          </h2>
          
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search anything..."
                className="pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1a6b3c]/20 w-64"
              />
            </div>
            <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && <OverviewStats setActiveTab={setActiveTab} />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'verifications' && <VerificationQueue />}
              {activeTab === 'properties' && <PropertyModeration />}
              {activeTab === 'escrow' && <DisputeQueue />}
              {activeTab === 'logs' && <AdminLogs />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 flex items-center justify-around p-2 z-50">
        {filteredSidebarItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as AdminTab)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === item.id ? 'text-[#1a6b3c]' : 'text-zinc-400'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function OverviewStats({ setActiveTab }: { setActiveTab: (tab: AdminTab) => void }) {
  const { stats, loading, error, refresh } = useAdminStats();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [tick, setTick] = useState(0);

  const getLastUpdatedText = () => {
    const diff = Math.floor(
      (new Date().getTime() - lastUpdated.getTime()) / 1000
    );
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff/60)} minutes ago`;
    return `${Math.floor(diff/3600)} hours ago`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1); // force re-render
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const [
        { data: recentUsers },
        { data: recentProperties },
        { data: recentDeals },
        { data: recentVerifications }
      ] = await Promise.all([
        supabase.from('profiles')
          .select('id, full_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('properties')
          .select('id, title, status, created_at, owner_id')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('deals')
          .select('id, status, created_at, amount')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('verification_requests')
          .select('id, status, submitted_at, user_id')
          .order('submitted_at', { ascending: false })
          .limit(5)
      ]);

      // Combine and sort by date
      const activities = [
        ...(recentUsers || []).map(u => ({
          type: 'user_registered',
          message: `${u.full_name || 'New user'} registered`,
          time: u.created_at,
          icon: User,
          tab: 'users'
        })),
        ...(recentProperties || []).map(p => ({
          type: 'property_listed',
          message: `New property listed: ${p.title}`,
          time: p.created_at,
          icon: Home,
          tab: 'properties'
        })),
        ...(recentDeals || []).map(d => ({
          type: 'deal_created',
          message: `New escrow deal: ₦${d.amount?.toLocaleString()}`,
          time: d.created_at,
          icon: DollarSign,
          tab: 'disputes' // Assuming escrow/deals are managed here or in a separate tab
        })),
        ...(recentVerifications || []).map(v => ({
          type: 'verification_submitted',
          message: `New verification request submitted`,
          time: v.submitted_at,
          icon: Shield,
          tab: 'verifications'
        }))
      ].sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      setRecentActivity(activities);
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
    
    // Realtime subscription
    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`admin-dashboard-${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profiles'
      }, () => {
        refresh();
        fetchRecentActivity();
        setLastUpdated(new Date());
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public', 
        table: 'properties'
      }, (payload) => {
        // Add to activity feed
        const newActivity = {
          type: 'property_updated',
          message: `Property status changed to ${payload.new.status}`,
          time: new Date().toISOString(),
          icon: Home,
          tab: 'properties'
        };
        setRecentActivity(prev => [newActivity, ...prev].slice(0, 50));
        refresh();
        setLastUpdated(new Date());
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'properties'
      }, () => {
        refresh();
        fetchRecentActivity();
        setLastUpdated(new Date());
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deals'
      }, () => {
        refresh();
        fetchRecentActivity();
        setLastUpdated(new Date());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (stats) {
      setLastUpdated(new Date());
    }
  }, [stats]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm animate-pulse">
            <div className="w-12 h-12 bg-zinc-100 rounded-2xl mb-4"></div>
            <div className="h-4 bg-zinc-100 rounded w-24 mb-2"></div>
            <div className="h-8 bg-zinc-100 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-[40px] text-red-700 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-12 h-12" />
        <div>
          <h3 className="font-bold text-lg">Error loading stats</h3>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={() => refresh()}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    { id: 'users', label: 'Total Users', value: stats?.totalUsers.toLocaleString(), icon: Users, color: 'bg-blue-50 text-blue-600' },
    { id: 'verifications', label: 'Pending Verifications', value: stats?.pendingVerifications.toLocaleString(), icon: ShieldCheck, color: 'bg-amber-50 text-amber-600' },
    { id: 'properties', label: 'Active Properties', value: stats?.activeProperties.toLocaleString(), icon: Building2, color: 'bg-emerald-50 text-emerald-600' },
    { id: 'escrow', label: 'Platform Revenue', value: `₦${((stats?.totalRevenue || 0)).toLocaleString('en-NG')}`, icon: DollarSign, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-zinc-900 tracking-tight">Platform Overview</h3>
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          Last updated {getLastUpdatedText()}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <button 
            key={i} 
            onClick={() => setActiveTab(stat.id as AdminTab)}
            className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
            </div>
            <p className="text-zinc-500 text-sm font-bold mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-zinc-900">{stat.value}</h3>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-zinc-900">Recent Activity</h3>
            <button 
              onClick={() => setShowAllActivity(!showAllActivity)}
              className="text-[#1a6b3c] font-bold text-sm flex items-center hover:underline"
            >
              {showAllActivity ? 'Show Less' : 'View All'} <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${showAllActivity ? 'rotate-90' : ''}`} />
            </button>
          </div>
          <div className="space-y-6">
            {activityLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-zinc-100"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-100 rounded w-3/4"></div>
                    <div className="h-3 bg-zinc-100 rounded w-1/4"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                {(showAllActivity ? recentActivity : recentActivity.slice(0, 4)).map((activity, i) => (
                  <div key={i} className="flex items-center space-x-4 group">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-[#1a6b3c]/10 group-hover:text-[#1a6b3c] transition-colors">
                      <activity.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900">{activity.message}</p>
                      <p className="text-xs text-zinc-500">{getLastUpdatedText() === 'Just now' && (new Date().getTime() - new Date(activity.time).getTime() < 60000) ? 'Just now' : new Date(activity.time).toLocaleTimeString()}</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab(activity.tab as AdminTab)}
                      className="p-2 hover:bg-zinc-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-zinc-400 hover:text-[#1a6b3c]" />
                    </button>
                  </div>
                ))}
                
                {recentActivity.length > 4 && (
                  <button 
                    onClick={() => setShowAllActivity(!showAllActivity)}
                    className="w-full py-3 mt-4 text-sm font-bold text-[#1a6b3c] hover:bg-[#1a6b3c]/5 rounded-2xl transition-colors border border-dashed border-[#1a6b3c]/20"
                  >
                    {showAllActivity ? 'Show Less' : `Show More (${recentActivity.length - 4} more)`}
                  </button>
                )}
              </>
            )}
            {!activityLoading && recentActivity.length === 0 && (
              <p className="text-center py-10 text-zinc-400 font-bold">No recent activity found.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-zinc-900">Platform Health</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">All Systems Operational</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-bold text-zinc-700">Verification Response Time</span>
                <span className="text-sm font-bold text-[#1a6b3c]">4.2h</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-[#1a6b3c]"></div>
              </div>
            </div>
            <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-bold text-zinc-700">Escrow Success Rate</span>
                <span className="text-sm font-bold text-[#1a6b3c]">99.8%</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div className="w-[99%] h-full bg-[#1a6b3c]"></div>
              </div>
            </div>
            <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-bold text-zinc-700">Server Uptime</span>
                <span className="text-sm font-bold text-[#1a6b3c]">99.99%</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div className="w-[99.9%] h-full bg-[#1a6b3c]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
