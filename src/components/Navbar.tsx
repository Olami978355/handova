import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, LayoutDashboard,
  MessageSquare, Shield, Plus, ChevronRight,
  FileText, HelpCircle, Home, MapPin, Users, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './notifications/NotificationBell';
import { useConversationsContext } from '../context/ConversationsContext';
import { HandovaLogo } from './brand/HandovaMark';


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { totalUnreadCount } = useConversationsContext();
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
    { name: 'Properties', path: '/listings', icon: Home },
    { name: 'Map View', path: '/map', icon: MapPin },
    { name: 'Find an Agent', path: '/directory', icon: Users },
    { name: 'How it Works', path: '/how-it-works', icon: FileText },
  ];

  if (isAuthPage) return null;

  const navBg = 'bg-slate/20 backdrop-blur-xl border-b border-white/5';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <HandovaLogo size={34} animateKey />
            <span className="text-[20px] font-extrabold tracking-tight text-paper leading-none">
              Hand<span className="text-gold">ova</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-[13px] font-semibold transition-colors ${
                  location.pathname === link.path ? 'text-gold' : 'text-paper/65 hover:text-paper'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold border border-gold/20 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-gold/20 transition-colors"
                  >
                    <Shield className="w-3 h-3" />
                    Admin
                  </Link>
                )}
                <Link
                  to={getDashboardPath()}
                  className="text-[13px] font-semibold text-paper/65 hover:text-paper transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <NotificationBell />
                <Link
                  to="/messages"
                  className="relative p-2 text-paper/60 hover:text-paper transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-ink text-[9px] font-black rounded-full flex items-center justify-center">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  )}
                </Link>
                <div className="w-px h-6 bg-white/10" />
                <Link
                  to="/profile"
                  className="w-8 h-8 bg-gold rounded-xl flex items-center justify-center font-bold text-sm text-ink overflow-hidden hover:ring-2 hover:ring-gold/40 transition-all"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.full_name || user.email || 'U').charAt(0).toUpperCase()
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-paper/35 hover:text-danger transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-[13px] font-semibold text-paper/65 hover:text-paper px-4 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-gold text-ink px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-gold-dark transition-all active:scale-95"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-9 h-9 flex items-center justify-center text-paper hover:bg-white/5 rounded-xl transition-colors"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-ink border-t border-white/5 overflow-hidden"
          >
            <div className="px-5 py-5">
              {user && profile ? (
                <>
                  {/* Identity — always first */}
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 mb-5 bg-slate/20 border border-white/6 rounded-2xl"
                  >
                    <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center text-ink text-[18px] font-bold overflow-hidden flex-shrink-0">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (profile.full_name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-paper truncate">{profile.full_name}</p>
                      <p className="text-[12px] text-paper/40 capitalize">
                        {profile.role} &middot; {profile.verification_status === 'verified' ? 'Verified' : 'Unverified'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-paper/25 flex-shrink-0" />
                  </Link>

                  {/* Yours — primary personal actions */}
                  <p className="text-[11px] font-bold text-paper/30 uppercase tracking-widest px-1 mb-2">Yours</p>
                  <div className="space-y-0.5 mb-5">
                    {(profile.role === 'admin' || profile.role === 'moderator') && (
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-gold hover:bg-gold/8 transition-colors"
                      >
                        <Shield className="w-[18px] h-[18px]" /> Admin Panel
                      </Link>
                    )}
                    <Link
                      to={getDashboardPath()}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard className="w-[18px] h-[18px] text-gold" /> Dashboard
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-[18px] h-[18px] text-gold" /> Messages
                      </div>
                      {totalUnreadCount > 0 && (
                        <span className="bg-gold text-ink text-[10px] font-black px-2 py-0.5 rounded-full">
                          {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                        </span>
                      )}
                    </Link>
                    {(profile.role === 'landlord' || profile.role === 'agent') && (
                      <Link
                        to="/add-property"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper hover:bg-white/5 transition-colors"
                      >
                        <Plus className="w-[18px] h-[18px] text-gold" /> List Property
                      </Link>
                    )}
                  </div>

                  {/* Discover — public browsing links */}
                  <p className="text-[11px] font-bold text-paper/30 uppercase tracking-widest px-1 mb-2">Discover</p>
                  <div className="space-y-0.5 mb-5">
                    {navLinks.filter(l => l.name !== 'How it Works').map(link => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper/65 hover:bg-white/5 hover:text-paper transition-colors"
                      >
                        <link.icon className="w-[18px] h-[18px] text-paper/40" /> {link.name}
                      </Link>
                    ))}
                  </div>

                  {/* Support */}
                  <p className="text-[11px] font-bold text-paper/30 uppercase tracking-widest px-1 mb-2">Support</p>
                  <div className="space-y-0.5 mb-5">
                    <Link
                      to="/faq"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper/65 hover:bg-white/5 hover:text-paper transition-colors"
                    >
                      <HelpCircle className="w-[18px] h-[18px] text-paper/40" /> Help and Support
                    </Link>
                    <Link
                      to="/legal"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper/65 hover:bg-white/5 hover:text-paper transition-colors"
                    >
                      <FileText className="w-[18px] h-[18px] text-paper/40" /> Legal
                    </Link>
                  </div>

                  {/* Sign out — isolated, deliberate */}
                  <div className="pt-4 border-t border-white/6">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-danger hover:bg-danger/8 transition-colors"
                    >
                      <LogOut className="w-[18px] h-[18px]" /> Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gold/12 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-6 h-6 text-gold" />
                    </div>
                    <p className="text-[15px] font-bold text-paper mb-1">Sign in to Handova</p>
                    <p className="text-[12px] text-paper/45">Manage deals, messages, and your listings in one place.</p>
                  </div>
                  <div className="space-y-2.5 mb-6">
                    <Link
                      to="/signup"
                      onClick={() => setIsOpen(false)}
                      className="block w-full bg-gold text-ink text-center py-3.5 rounded-xl font-bold text-[14px]"
                    >
                      Get Started, It's Free
                    </Link>
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full bg-white/5 text-paper text-center py-3.5 rounded-xl font-semibold text-[14px] border border-white/8"
                    >
                      Sign In
                    </Link>
                  </div>
                  <div className="pt-4 border-t border-white/6 space-y-0.5">
                    {navLinks.map(link => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper/65 hover:bg-white/5 hover:text-paper transition-colors"
                      >
                        <link.icon className="w-[18px] h-[18px] text-paper/40" /> {link.name}
                      </Link>
                    ))}
                    <Link
                      to="/faq"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 py-2.5 px-2.5 rounded-xl text-[14px] font-semibold text-paper/65 hover:bg-white/5 hover:text-paper transition-colors"
                    >
                      <HelpCircle className="w-[18px] h-[18px] text-paper/40" /> Help and Support
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
