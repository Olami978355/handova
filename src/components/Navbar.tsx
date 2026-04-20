import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, Menu, X, User, LogOut, LayoutDashboard, 
  MessageSquare, Home, Search, Map as MapIcon, Plus,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './notifications/NotificationBell';
import { useConversations } from '../hooks/useConversations';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { totalUnreadCount } = useConversations();

  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Properties', path: '/listings' },
    { name: 'Map View', path: '/map' },
    { name: 'How it Works', path: '/#how-it-works' },
    { name: 'Pricing', path: '/#pricing' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled || !isLandingPage 
        ? 'bg-white/80 backdrop-blur-xl shadow-lg py-3' 
        : 'bg-transparent py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-[#1a6b3c] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#1a6b3c]/20 group-hover:rotate-12 transition-transform duration-500">
            <Home className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-zinc-900">RentEasy</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              className="text-sm font-black uppercase tracking-widest text-zinc-600 hover:text-[#1a6b3c] transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Auth Actions */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-6">
              {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                <Link 
                  to="/admin" 
                  className="flex items-center space-x-2 px-3 py-1.5 bg-[#1a6b3c]/10 text-[#1a6b3c] rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#1a6b3c]/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </Link>
              )}
              <Link to="/dashboard" className="text-sm font-black uppercase tracking-widest text-zinc-600 hover:text-[#1a6b3c] transition-colors flex items-center">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </Link>
              
              <div className="flex items-center gap-4 border-l border-zinc-100 pl-6">
                <NotificationBell />
                <Link to="/profile" className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center font-black text-sm text-[#1a6b3c] overflow-hidden hover:ring-2 hover:ring-[#1a6b3c]/20 transition-all">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.full_name || user.email || 'U').charAt(0).toUpperCase()
                  )}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/add-property" className="text-sm font-black text-[#1a6b3c] px-6 py-3 hover:bg-[#1a6b3c]/5 rounded-2xl transition-all">
                List Property
              </Link>
              <Link to="/login" className="text-sm font-black text-zinc-900 px-6 py-3 hover:bg-zinc-100 rounded-2xl transition-all">
                Sign In
              </Link>
              <Link to="/signup" className="bg-[#1a6b3c] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-[#1a6b3c]/20 hover:bg-[#14522e] hover:-translate-y-1 transition-all active:scale-95">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-zinc-100 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="block text-lg font-black text-zinc-900 uppercase tracking-widest"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              
              <div className="pt-6 border-t border-zinc-50 space-y-4">
                {user ? (
                  <>
                    {(profile?.role === 'admin' || profile?.role === 'moderator') && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 text-lg font-black text-[#1a6b3c] uppercase tracking-widest"
                        onClick={() => setIsOpen(false)}
                      >
                        <Shield className="w-5 h-5" /> Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 text-lg font-black text-zinc-900 uppercase tracking-widest"
                      onClick={() => setIsOpen(false)}
                    >
                      <LayoutDashboard className="w-5 h-5 text-[#1a6b3c]" /> Dashboard
                    </Link>
                    <Link
                      to="/messages"
                      className="flex items-center gap-3 text-lg font-black text-zinc-900 uppercase tracking-widest"
                      onClick={() => setIsOpen(false)}
                    >
                      <MessageSquare className="w-5 h-5 text-[#1a6b3c]" /> Messages
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 text-lg font-black text-zinc-900 uppercase tracking-widest"
                      onClick={() => setIsOpen(false)}
                    >
                      <User className="w-5 h-5 text-[#1a6b3c]" /> Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 text-lg font-black text-red-500 uppercase tracking-widest"
                    >
                      <LogOut className="w-5 h-5" /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/signup" onClick={() => setIsOpen(false)} className="block w-full bg-[#1a6b3c] text-white text-center py-4 rounded-2xl font-black">
                      Get Started
                    </Link>
                    <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full bg-zinc-100 text-zinc-900 text-center py-4 rounded-2xl font-black">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
