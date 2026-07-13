import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ShieldCheck, Building2, History,
  LayoutDashboard, AlertCircle, ChevronRight,
  DollarSign, Shield, User, Home, Eye, TrendingUp,
  Bell, Settings, LogOut, CreditCard
} from 'lucide-react';
import CardRequestQueue from './CardRequestQueue';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAdminStats } from '../../hooks/useAdminStats';
import { supabase } from '../../lib/supabase';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import UserManagement from './UserManagement';
import VerificationReview from './VerificationReview';
import PropertyModeration from './PropertyModeration';
import DisputeQueue from './DisputeQueue';
import EscrowQueue from './EscrowQueue';
import AdminLogs from './AdminLogs';
import PropertyReports from './PropertyReports';

type AdminTab = 'overview' | 'users' | 'verifications' | 'properties' | 'disputes' | 'fund-releases' | 'logs' | 'card-requests' | 'reports';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const RentEasyLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="18" fill="#1a6b3c" />
    <path d="M16 54 L16 32 L40 14 L64 32 L64 54" stroke="#f0c040" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 54 L28 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M54 54 L64 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 54 L28 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="28" cy="38" r="6" fill="none" stroke="white" strokeWidth="3" />
    <rect x="43" y="42" width="16" height="13" rx="3" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="2" />
    <path d="M46 42 L46 38 Q46 35 51 35 Q56 35 56 38 L56 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M47.5 48.5 L50 51 L54.5 46" stroke="#f0c040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const { isModerator, loading, error } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isModerator) navigate('/dashboard');
  }, [isModerator, loading, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#070b08] flex flex-col items-center justify-center p-5 text-center" style={font}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-[20px] font-bold text-white mb-2">Admin Panel Error</h2>
        <p className="text-[13px] text-white/40 mb-6 max-w-md">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-[#1a6b3c] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0f4a2a] transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (loading && !isModerator) {
    return (
      <div className="min-h-screen bg-[#070b08] flex items-center justify-center" style={font}>
        <div className="w-8 h-8 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isModerator) return null;

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'moderator'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
    { id: 'verifications', label: 'Verifications', icon: ShieldCheck, roles: ['admin', 'moderator'] },
    { id: 'properties', label: 'Properties', icon: Building2, roles: ['admin', 'moderator'] },
    { id: 'disputes', label: 'Disputes', icon: AlertCircle, roles: ['admin', 'moderator'] },
    { id: 'fund-releases', label: 'Fund Releases', icon: DollarSign, roles: ['admin', 'moderator'] },
    { id: 'card-requests', label: 'ID Cards', icon: CreditCard, roles: ['admin', 'moderator'] },
    { id: 'reports', label: 'Reports', icon: AlertCircle, roles: ['admin', 'moderator'] },
    { id: 'logs', label: 'Logs', icon: History, roles: ['admin'] },
  ].filter(item => item.roles.includes(profile?.role || ''));

  return (
    <div className="min-h-screen bg-[#070b08] flex flex-col lg:flex-row" style={font}>

      {/* Desktop sidebar */}
      <aside className="w-64 bg-[#0a1f11] border-r border-white/6 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-white/6 flex items-center gap-2.5">
          <RentEasyLogo size={32} />
          <div>
            <span className="text-[15px] font-extrabold text-white">Rent<span className="text-[#f0c040]">Easy</span></span>
            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4 mb-2">Menu</p>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-[13px] transition-all group ${
                activeTab === item.id
                  ? 'bg-[#1a6b3c] text-white shadow-lg shadow-[#1a6b3c]/20'
                  : 'text-white/45 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </div>
              {activeTab === item.id && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/6 space-y-1">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[12px] text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" /> Account Settings
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[12px] text-red-400/60 hover:bg-red-500/8 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="p-4 border-t border-white/6">
          <div className="flex items-center gap-3 p-3 bg-white/4 rounded-xl">
            <div className="w-9 h-9 bg-[#1a6b3c] rounded-xl overflow-hidden flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (profile?.full_name || 'A').charAt(0).toUpperCase()
              }
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-[12px] font-bold text-white truncate">{profile?.full_name}</p>
                <VerifiedBadge status={profile?.verification_status} size={12} />
              </div>
              <p className="text-[10px] font-bold text-[#f0c040] uppercase tracking-wider">{profile?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-[#0a1f11]/80 backdrop-blur-xl border-b border-white/6 h-16 flex items-center justify-between px-5 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <RentEasyLogo size={26} />
            </div>
            <div className="hidden lg:block">
              <h2 className="text-[18px] font-black text-white">
                {sidebarItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-[11px] text-white/30">Manage and moderate the RentEasy platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider border ${
              profile?.role === 'admin'
                ? 'bg-[#f0c040]/10 text-[#f0c040] border-[#f0c040]/20'
                : 'bg-[#1a6b3c]/15 text-[#1a6b3c] border-[#1a6b3c]/25'
            }`}>
              {profile?.role}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 lg:p-8 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'overview' && <OverviewStats setActiveTab={setActiveTab} />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'verifications' && <VerificationReview />}
              {activeTab === 'properties' && <PropertyModeration />}
              {activeTab === 'disputes' && <DisputeQueue />}
              {activeTab === 'fund-releases' && <EscrowQueue />}
              {activeTab === 'logs' && <AdminLogs />}
              {activeTab === 'card-requests' && <CardRequestQueue />}
              {activeTab === 'reports' && <PropertyReports />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0a1f11]/95 backdrop-blur-xl border-t border-white/6 flex items-center gap-1 px-2 py-2 z-50 overflow-x-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as AdminTab)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-shrink-0 ${
              activeTab === item.id ? 'text-[#f0c040]' : 'text-white/30'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function OverviewStats({ setActiveTab }: { setActiveTab: (tab: AdminTab) => void }) {
  const { stats, loading, error, refresh } = useAdminStats();
  const [recentActivity, setRecentActivity] = useState<{
    type: string; message: string; time: string;
    icon: React.ElementType; tab: string;
  }[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const getLastUpdatedText = () => {
    const diff = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const [
        { data: recentUsers },
        { data: recentProperties },
        { data: recentDeals },
        { data: recentVerifications },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('properties').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('deals').select('id, status, created_at, amount').order('created_at', { ascending: false }).limit(4),
        supabase.from('verification_requests').select('id, status, submitted_at').order('submitted_at', { ascending: false }).limit(4),
      ]);

      const activities = [
        ...(recentUsers || []).map(u => ({ type: 'user_registered', message: `${u.full_name || 'New user'} registered`, time: u.created_at, icon: User, tab: 'users' })),
        ...(recentProperties || []).map(p => ({ type: 'property_listed', message: `New listing: ${p.title}`, time: p.created_at, icon: Home, tab: 'properties' })),
        ...(recentDeals || []).map(d => ({ type: 'deal_created', message: `New escrow deal: ₦${d.amount?.toLocaleString()}`, time: d.created_at, icon: DollarSign, tab: 'fund-releases' })),
        ...(recentVerifications || []).map(() => ({ type: 'verification_submitted', message: 'New verification request', time: new Date().toISOString(), icon: Shield, tab: 'verifications' })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      setRecentActivity(activities);
    } catch (err) {
      console.error('Error fetching activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
    const channelId = Math.random().toString(36).slice(7);
    const channel = supabase
      .channel(`admin-dashboard-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => { refresh(); fetchRecentActivity(); setLastUpdated(new Date()); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => { refresh(); fetchRecentActivity(); setLastUpdated(new Date()); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => { refresh(); fetchRecentActivity(); setLastUpdated(new Date()); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 aspect-square animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-500/8 border border-red-500/15 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-[15px] font-bold text-white mb-2">Error loading stats</h3>
        <p className="text-[12px] text-white/40 mb-4">{error}</p>
        <button onClick={() => refresh()} className="bg-[#1a6b3c] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#0f4a2a] transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { id: 'users', label: 'Total Users', value: stats?.totalUsers.toLocaleString() || '0', icon: Users, color: '#1a6b3c', trend: '+12%' },
    { id: 'verifications', label: 'Pending Verifications', value: stats?.pendingVerifications.toLocaleString() || '0', icon: ShieldCheck, color: '#f0c040', urgent: (stats?.pendingVerifications || 0) > 0 },
    { id: 'properties', label: 'Active Properties', value: stats?.activeProperties.toLocaleString() || '0', icon: Building2, color: '#60a5fa', trend: '+8%' },
    { id: 'fund-releases', label: 'Platform Revenue', value: `₦${(stats?.totalRevenue || 0).toLocaleString('en-NG')}`, icon: DollarSign, color: '#a78bfa', trend: '+24%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[20px] font-black text-white">Platform Overview</h3>
          <p className="text-[12px] text-white/30 mt-1">Real-time snapshot of RentEasy activity</p>
        </div>
        <span className="text-[11px] text-white/25 font-medium flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" />
          Updated {getLastUpdatedText()}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <button
            key={stat.id}
            onClick={() => setActiveTab(stat.id as AdminTab)}
            className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 text-left hover:border-white/15 hover:-translate-y-0.5 transition-all group relative overflow-hidden"
          >
            {stat.urgent && (
              <div className="absolute top-3 right-3 w-2 h-2 bg-[#f0c040] rounded-full animate-pulse" />
            )}
            <div className="flex flex-col justify-between h-full gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1.5">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[26px] font-black text-white leading-none">{stat.value}</h3>
                  {stat.trend && (
                    <span className="text-[10px] font-bold text-[#4ade80] flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />{stat.trend}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent activity */}
        <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#1a6b3c]" />
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3">
            {activityLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-white/5 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                    <div className="h-2.5 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <p className="text-[12px] text-white/25 text-center py-8">No recent activity</p>
            ) : (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-3 group p-2 rounded-xl hover:bg-white/3 transition-colors">
                  <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/30 group-hover:bg-[#1a6b3c]/15 group-hover:text-[#1a6b3c] transition-colors flex-shrink-0">
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{activity.message}</p>
                    <p className="text-[10px] text-white/25">{new Date(activity.time).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} · {new Date(activity.time).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                  <button onClick={() => setActiveTab(activity.tab as AdminTab)} className="w-7 h-7 bg-white/4 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 transition-colors flex-shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform health */}
        <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-white">Platform Health</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#1a6b3c] rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-[#1a6b3c]">All Systems OK</span>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Verification Response Time', value: '4.2h', pct: 85, color: '#1a6b3c' },
              { label: 'Escrow Success Rate', value: '99.8%', pct: 99, color: '#4ade80' },
              { label: 'Server Uptime', value: '99.99%', pct: 100, color: '#60a5fa' },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-white/4 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-white/60">{item.label}</span>
                  <span className="text-[12px] font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}