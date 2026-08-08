import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ShieldCheck, Building2, History,
  LayoutDashboard, AlertCircle, ChevronRight,
  DollarSign, Shield, User, Home, Eye, TrendingUp,
  Bell, Settings, LogOut, CreditCard
} from 'lucide-react';
import CardRequestQueue from './CardRequestQueue';
import { ID_CARD_FEATURE_ENABLED } from '../../constants';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useAdminStats } from '../../hooks/useAdminStats';
import { supabase } from '../../lib/supabase';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { formatNaira } from '../../utils/format';
import UserManagement from './UserManagement';
import VerificationReview from './VerificationReview';
import PropertyModeration from './PropertyModeration';
import DisputeQueue from './DisputeQueue';
import EscrowQueue from './EscrowQueue';
import AdminLogs from './AdminLogs';
import PropertyReports from './PropertyReports';
import AnalyticsDashboard from './AnalyticsDashboard';

type AdminTab = 'overview' | 'users' | 'verifications' | 'properties' | 'disputes' | 'fund-releases' | 'logs' | 'card-requests' | 'reports' | 'analytics';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const HandovaLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="-60 -85 120 170" fill="none">
    <path d="M-50 -70 L-20 -55 L-20 55 L-50 70 Z" fill="#D4AF37" />
    <path d="M50 -70 L20 -55 L20 55 L50 70 Z" fill="#D4AF37" />
    <circle cx="-32" cy="0" r="17" fill="none" stroke="#D4AF37" strokeWidth="9" />
    <rect x="-15" y="-4.5" width="35" height="9" fill="#D4AF37" />
    <rect x="10" y="4.5" width="8" height="10" fill="#D4AF37" />
    <rect x="22" y="4.5" width="8" height="10" fill="#D4AF37" />
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
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-5 text-center" style={font}>
        <AlertCircle className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-[20px] font-bold text-paper mb-2">Admin Panel Error</h2>
        <p className="text-[13px] text-paper/40 mb-6 max-w-md">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-gold text-paper px-8 py-3 rounded-xl font-bold hover:bg-gold-dark transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  if (loading && !isModerator) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center" style={font}>
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
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
    ...(ID_CARD_FEATURE_ENABLED ? [{ id: 'card-requests', label: 'ID Cards', icon: CreditCard, roles: ['admin', 'moderator'] }] : []),
    { id: 'reports', label: 'Reports', icon: AlertCircle, roles: ['admin', 'moderator'] },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, roles: ['admin', 'moderator'] },
    { id: 'logs', label: 'Logs', icon: History, roles: ['admin'] },
  ].filter(item => item.roles.includes(profile?.role || ''));

  return (
    <div className="min-h-screen bg-ink flex flex-col lg:flex-row" style={font}>

      {/* Desktop sidebar */}
      <aside className="w-64 bg-slate/20 border-r border-white/6 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-5 border-b border-white/6 flex items-center gap-2.5">
          <HandovaLogo size={32} />
          <div>
            <span className="text-[15px] font-extrabold text-paper">Hand<span className="text-gold">ova</span></span>
            <p className="text-[9px] text-paper/30 font-bold uppercase tracking-widest">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          <p className="text-[10px] font-bold text-paper/20 uppercase tracking-widest px-4 mb-2">Menu</p>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-[13px] transition-all group ${
                activeTab === item.id
                  ? 'bg-gold text-paper shadow-lg shadow-gold/20'
                  : 'text-paper/45 hover:bg-white/5 hover:text-paper'
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
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[12px] text-paper/40 hover:bg-white/5 hover:text-paper transition-colors"
          >
            <Settings className="w-4 h-4" /> Account Settings
          </button>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[12px] text-danger/60 hover:bg-danger/8 hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="p-4 border-t border-white/6">
          <div className="flex items-center gap-3 p-3 bg-white/4 rounded-xl">
            <div className="w-9 h-9 bg-gold rounded-xl overflow-hidden flex items-center justify-center text-paper text-[12px] font-bold flex-shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (profile?.full_name || 'A').charAt(0).toUpperCase()
              }
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-[12px] font-bold text-paper truncate">{profile?.full_name}</p>
                <VerifiedBadge status={profile?.verification_status} size={12} />
              </div>
              <p className="text-[10px] font-bold text-gold uppercase tracking-wider">{profile?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-slate/20 backdrop-blur-xl border-b border-white/6 h-16 flex items-center justify-between px-5 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <HandovaLogo size={26} />
            </div>
            <div className="hidden lg:block">
              <h2 className="text-[18px] font-black text-paper">
                {sidebarItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-[11px] text-paper/30">Manage and moderate the Handova platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider border ${
              profile?.role === 'admin'
                ? 'bg-gold/10 text-gold border-gold/20'
                : 'bg-gold/15 text-gold border-gold/25'
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
              {activeTab === 'analytics' && <AnalyticsDashboard />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-slate/20 backdrop-blur-xl border-t border-white/6 flex items-center gap-1 px-2 py-2 z-50 overflow-x-auto">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as AdminTab)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-shrink-0 ${
              activeTab === item.id ? 'text-gold' : 'text-paper/30'
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
        ...(recentDeals || []).map(d => ({ type: 'deal_created', message: `New escrow deal: ${formatNaira(d.amount || 0)}`, time: d.created_at, icon: DollarSign, tab: 'fund-releases' })),
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
          <div key={i} className="bg-slate/20 border border-white/6 rounded-2xl p-5 aspect-square animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-danger/8 border border-danger/15 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
        <h3 className="text-[15px] font-bold text-paper mb-2">Error loading stats</h3>
        <p className="text-[12px] text-paper/40 mb-4">{error}</p>
        <button onClick={() => refresh()} className="bg-gold text-paper px-6 py-2.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { id: 'users', label: 'Total Users', value: stats?.totalUsers.toLocaleString() || '0', icon: Users, color: '#D4AF37', trend: '+12%' },
    { id: 'verifications', label: 'Pending Verifications', value: stats?.pendingVerifications.toLocaleString() || '0', icon: ShieldCheck, color: '#D4AF37', urgent: (stats?.pendingVerifications || 0) > 0 },
    { id: 'properties', label: 'Active Properties', value: stats?.activeProperties.toLocaleString() || '0', icon: Building2, color: '#D4AF37', trend: '+8%' },
    { id: 'fund-releases', label: 'Platform Revenue', value: formatNaira(stats?.totalRevenue || 0), icon: DollarSign, color: '#D4AF37', trend: '+24%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[20px] font-black text-paper">Platform Overview</h3>
          <p className="text-[12px] text-paper/30 mt-1">Real-time snapshot of Handova activity</p>
        </div>
        <span className="text-[11px] text-paper/25 font-medium flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
          Updated {getLastUpdatedText()}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <button
            key={stat.id}
            onClick={() => setActiveTab(stat.id as AdminTab)}
            className="bg-slate/20 border border-white/6 rounded-2xl p-5 text-left hover:border-white/15 hover:-translate-y-0.5 transition-all group relative overflow-hidden"
          >
            {stat.urgent && (
              <div className="absolute top-3 right-3 w-2 h-2 bg-gold rounded-full animate-pulse" />
            )}
            <div className="flex flex-col justify-between h-full gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-[10px] text-paper/30 font-bold uppercase tracking-wider mb-1.5">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[26px] font-black text-paper leading-none">{stat.value}</h3>
                  {stat.trend && (
                    <span className="text-[10px] font-bold text-gold flex items-center gap-0.5">
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
        <div className="bg-slate/20 border border-white/6 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-paper flex items-center gap-2">
              <Bell className="w-4 h-4 text-gold" />
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
              <p className="text-[12px] text-paper/25 text-center py-8">No recent activity</p>
            ) : (
              recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-3 group p-2 rounded-xl hover:bg-white/3 transition-colors">
                  <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-paper/30 group-hover:bg-gold/15 group-hover:text-gold transition-colors flex-shrink-0">
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-paper truncate">{activity.message}</p>
                    <p className="text-[10px] text-paper/25">{new Date(activity.time).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} · {new Date(activity.time).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                  <button onClick={() => setActiveTab(activity.tab as AdminTab)} className="w-7 h-7 bg-white/4 rounded-lg flex items-center justify-center text-paper/20 hover:text-paper/60 transition-colors flex-shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform health */}
        <div className="bg-slate/20 border border-white/6 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-paper">Platform Health</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-gold">All Systems OK</span>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Verification Response Time', value: '4.2h', pct: 85, color: '#D4AF37' },
              { label: 'Escrow Success Rate', value: '99.8%', pct: 99, color: '#D4AF37' },
              { label: 'Server Uptime', value: '99.99%', pct: 100, color: '#D4AF37' },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-white/4 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-paper/60">{item.label}</span>
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