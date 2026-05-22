import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, LayoutDashboard,
  MessageSquare, Shield, Plus, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './notifications/NotificationBell';
import { useConversationsContext } from '../context/ConversationsContext';
import { useNotifications } from '../hooks/useNotifications';

const RentEasyLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="18" fill="#1a6b3c" />
    <path d="M16 54 L16 32 L40 14 L64 32 L64 54" stroke="#f0c040" strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 54 L28 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M54 54 L64 54" stroke="#f0c040" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 54 L28 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="28" cy="38" r="6" fill="none" stroke="white" strokeWidth="3" />
    <path d="M32 54 L32 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 54 L36 51" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="43" y="42" width="16" height="13" rx="3" fill="rgba(255,255,255,0.12)" stroke="white" strokeWidth="2" />
    <path d="M46 42 L46 38 Q46 35 51 35 Q56 35 56 38 L56 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M47.5 48.5 L50 51 L54.5 46" stroke="#f0c040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
const { totalUnreadCount } = useConversationsContext();

  // ← single instance for both desktop and mobile bells
  const notificationProps = useNotifications();

  const isLandingPage = location.pathname === '/';
  const isAuthPage = ['/login', '/signup', '/onboarding'].includes(location.pathname);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!profile?.role) return '/dashboard';
    if (profile.role === 'admin' || profile.role === 'moderator') return '/admin';
    if (profile.role === 'landlord') return '/landlord/dashboard';
    if (profile.role === 'agent') return '/agent/dashboard';
    return '/dashboard';
  };

  const navLinks = [
    { name: 'Properties', path: '/listings' },
    { name: 'Map View', path: '/map' },
    { name: 'How it Works', path: '/#how-it-works' },
  ];

  if (isAuthPage) return null;

  const navBg = scrolled || !isLandingPage
    ? 'bg-[#0a1f11]/95 backdrop-blur-xl border-b border-white/5'
    : 'bg-transparent';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <RentEasyLogo size={34} />
            <span className="text-[20px] font-extrabold tracking-tight text-white leading-none">
              Rent<span className="text-[#f0c040]">Easy</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-[13px] font-semibold transition-colors ${
                  location.pathname === link.path
                    ? 'text-[#f0c040]'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0c040]/10 text-[#f0c040] border border-[#f0c040]/20 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-[#f0c040]/20 transition-colors"
                  >
                    <Shield className="w-3 h-3" />
                    Admin
                  </Link>
                )}
                <Link
                  to={getDashboardPath()}
                  className="text-[13px] font-semibold text-white/65 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>

                {/* Desktop bell — shared notificationProps */}
                <NotificationBell {...notificationProps} />

                <Link to="/messages" className="relative p-2 text-white/60 hover:text-white transition-colors">
                  <MessageSquare className="w-5 h-5" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[#f0c040] text-black text-[9px] font-black rounded-full flex items-center justify-center">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  )}
                </Link>
                <div className="w-px h-6 bg-white/10" />
                <Link
                  to="/profile"
                  className="w-8 h-8 bg-[#1a6b3c] rounded-xl flex items-center justify-center font-bold text-sm text-white overflow-hidden hover:ring-2 hover:ring-[#f0c040]/40 transition-all"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.full_name || user.email || 'U').charAt(0).toUpperCase()
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-white/35 hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-[13px] font-semibold text-white/65 hover:text-white px-4 py-2 transition-colors">
                  Sign In
                </Link>
                <Link to="/signup" className="bg-[#f0c040] text-black px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#e0b030] transition-all active:scale-95">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile right */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Mobile bell — same shared notificationProps */}
            {user && <NotificationBell {...notificationProps} />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-9 h-9 flex items-center justify-center text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-[#0a1f11] border-t border-white/5 overflow-hidden"
          >
            <div className="px-5 py-5 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between py-3 px-3 rounded-xl text-[14px] font-semibold transition-colors ${
                    location.pathname === link.path
                      ? 'bg-[#1a6b3c]/20 text-[#f0c040]'
                      : 'text-white/65 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.name}
                  <ChevronRight className="w-4 h-4 opacity-30" />
                </Link>
              ))}

              <div className="h-px bg-white/5 my-3" />

              {user ? (
                <>
                  {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                    <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold text-[#f0c040] hover:bg-[#f0c040]/5 transition-colors">
                      <Shield className="w-5 h-5" /> Admin Panel
                    </Link>
                  )}
                  <Link to={getDashboardPath()} onClick={() => setIsOpen(false)} className="flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold text-white/65 hover:bg-white/5 hover:text-white transition-colors">
                    <LayoutDashboard className="w-5 h-5 text-[#1a6b3c]" /> Dashboard
                  </Link>
                  <Link to="/messages" onClick={() => setIsOpen(false)} className="flex items-center justify-between py-3 px-3 rounded-xl text-[14px] font-semibold text-white/65 hover:bg-white/5 hover:text-white transition-colors">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-[#1a6b3c]" /> Messages
                    </div>
                    {totalUnreadCount > 0 && (
                      <span className="bg-[#f0c040] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                        {totalUnreadCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold text-white/65 hover:bg-white/5 hover:text-white transition-colors">
                    <div className="w-5 h-5 bg-[#1a6b3c] rounded-lg flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (profile?.full_name || 'U').charAt(0).toUpperCase()
                      }
                    </div>
                    Profile
                  </Link>
                  {(profile?.role === 'landlord' || profile?.role === 'agent') && (
                    <Link to="/add-property" onClick={() => setIsOpen(false)} className="flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold text-white/65 hover:bg-white/5 hover:text-white transition-colors">
                      <Plus className="w-5 h-5 text-[#1a6b3c]" /> List Property
                    </Link>
                  )}
                  <div className="h-px bg-white/5 my-2" />
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 py-3 px-3 rounded-xl text-[14px] font-semibold text-red-400 hover:bg-red-500/5 transition-colors">
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                  {profile && (
                    <div className="pt-3 mt-2 border-t border-white/5">
                      <div className="flex items-center gap-3 px-3">
                        <div className="w-8 h-8 bg-[#1a6b3c] rounded-xl flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                          {profile.avatar_url
                            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            : (profile.full_name || 'U').charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-white truncate">{profile.full_name}</div>
                          <div className="text-[11px] text-white/35 capitalize">
                            {profile.role} · {profile.verification_status === 'verified' ? '✓ Verified' : 'Unverified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2 pt-2">
                  <Link to="/signup" onClick={() => setIsOpen(false)} className="block w-full bg-[#f0c040] text-black text-center py-3.5 rounded-xl font-bold text-[14px]">
                    Get Started — It's Free
                  </Link>
                  <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full bg-white/5 text-white text-center py-3.5 rounded-xl font-semibold text-[14px] border border-white/8">
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}