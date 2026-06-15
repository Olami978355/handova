import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Facebook, Twitter, Instagram, Linkedin, ArrowRight, CheckCircle, Shield, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const RentEasyLogo = ({ size = 28 }: { size?: number }) => (
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

const socials = [
  { icon: Facebook, label: 'Facebook', href: 'https://www.facebook.com/RentEasy' },
  { icon: Twitter, label: 'X', href: 'https://x.com/Renteasyapp' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
];

const quickLinks = [
  { label: 'Browse Properties', path: '/listings' },
  { label: 'Map View', path: '/map' },
  { label: 'How It Works', path: '/#how-it-works' },
  { label: 'Know Your Rights', path: '/legal-guide' },
  { label: 'FAQ', path: '/faq' },
  { label: 'About Us', path: '/about' },
  { label: 'Contact Us', path: '/contact' },
];

const legalLinks = [
  { label: 'Privacy Policy', path: '/legal#privacy' },
  { label: 'Terms of Service', path: '/legal#terms' },
  { label: 'Refund Policy', path: '/legal#refund' },
  { label: 'Escrow Agreement', path: '/legal#escrow' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subError, setSubError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;
    setSubscribing(true);
    setSubError('');
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: email.trim().toLowerCase() });
      if (error) {
        if (error.code === '23505') {
          setSubError('This email is already subscribed!');
        } else {
          throw error;
        }
      } else {
        setSubscribed(true);
        setEmail('');
      }
    } catch {
      setSubError('Something went wrong. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-[#060f09] border-t border-white/5">
      <div className="h-px bg-gradient-to-r from-transparent via-[#1a6b3c] to-transparent" />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">

          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2.5 w-fit">
              <RentEasyLogo size={30} />
              <span className="text-[20px] font-extrabold tracking-tight text-white">
                Rent<span className="text-[#f0c040]">Easy</span>
              </span>
            </Link>
            <p className="text-[13px] text-white/45 leading-relaxed">
              Nigeria's most trusted real estate platform. Verified listings, secure escrow payments, and zero inspection scams.
            </p>
            <div className="flex items-center gap-2 w-fit px-3 py-1.5 bg-white/4 border border-white/8 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-[#1a6b3c]" />
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Verified Platform</span>
            </div>
            <div className="flex items-center gap-2">
              {socials.map(({ icon: Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-9 h-9 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-white/45 hover:bg-[#1a6b3c] hover:text-white hover:border-transparent transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h4 className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-6">Platform</h4>
            <ul className="space-y-3">
              {quickLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link to={path} className="group flex items-center gap-2 text-[13px] text-white/45 hover:text-white transition-colors">
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + contact */}
          <div>
            <h4 className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-3 mb-8">
              {legalLinks.map(({ label, path }) => (
                <li key={label}>
                  <Link to={path} className="group flex items-center gap-2 text-[13px] text-white/45 hover:text-white transition-colors">
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-4">Contact</h4>
            <a href="mailto:joinrenteasy@gmail.com"
              className="flex items-center gap-2.5 text-[13px] text-white/45 hover:text-white transition-colors group">
              <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#1a6b3c] transition-colors">
                <Mail className="w-3.5 h-3.5" />
              </div>
              joinrenteasy@gmail.com
            </a>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-6">Stay Updated</h4>
            <p className="text-[13px] text-white/45 leading-relaxed mb-5">
              Be first to know about verified listings in your area.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2.5 py-3 px-4 bg-[#1a6b3c]/20 border border-[#1a6b3c]/30 rounded-xl">
                <CheckCircle className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
                <span className="text-[13px] text-[#4ade80] font-medium">You're on the list!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setSubError(''); }}
                    placeholder="Your email address"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#1a6b3c] transition-colors"
                  />
                  <button type="submit" disabled={subscribing}
                    className="absolute right-2 top-1.5 bottom-1.5 w-8 bg-[#1a6b3c] rounded-lg flex items-center justify-center hover:bg-[#0f4a2a] transition-colors disabled:opacity-50">
                    {subscribing
                      ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                      : <ArrowRight className="w-4 h-4 text-white" />
                    }
                  </button>
                </div>
                {subError && <p className="text-[11px] text-red-400">{subError}</p>}
                <p className="text-[11px] text-white/20">No spam. Unsubscribe anytime.</p>
              </form>
            )}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[{ value: '36', label: 'States' }, { value: '100%', label: 'Secure' }].map(({ value, label }) => (
                <div key={label} className="bg-white/4 border border-white/6 rounded-xl p-3 text-center">
                  <div className="text-[18px] font-black text-[#f0c040]">{value}</div>
                  <div className="text-[10px] text-white/35 font-medium uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/25">
            © {new Date().getFullYear()} RentEasy Nigeria. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-[12px] text-white/25">
            <span>Built in Nigeria 🇳🇬</span>
            <span>·</span>
            <span>Powered by trust & technology</span>
          </div>
        </div>
      </div>
    </footer>
  );
}