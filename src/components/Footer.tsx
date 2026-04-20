import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, Mail, Phone, MapPin, Facebook, 
  Twitter, Instagram, Linkedin, ArrowRight,
  Shield, CheckCircle
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-white pt-24 pb-12 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1a6b3c] to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          <div className="space-y-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-[#1a6b3c] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#1a6b3c]/20 group-hover:rotate-12 transition-transform duration-500">
                <Home className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter">RentEasy</span>
            </Link>
            <p className="text-zinc-400 font-medium leading-relaxed">
              Nigeria's most trusted real estate ecosystem. We're redefining how Nigerians find, rent, and buy properties through transparency and technology.
            </p>
            <div className="flex items-center gap-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href={Icon === Twitter ? "https://x.com/Renteasyapp" : "#"} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-[#1a6b3c] hover:text-white transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-black mb-8 uppercase tracking-widest text-[#1a6b3c]">Quick Links</h4>
            <ul className="space-y-4">
              {['Properties', 'Map View', 'How it Works', 'Pricing', 'About Us'].map((item) => (
                <li key={item}>
                  <Link to={item === 'Properties' ? '/listings' : item === 'Map View' ? '/map' : '#'} className="text-zinc-400 hover:text-white font-medium transition-colors flex items-center group">
                    <ArrowRight className="w-4 h-4 mr-2 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-black mb-8 uppercase tracking-widest text-[#1a6b3c]">Contact Us</h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-[#1a6b3c]" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Call Us</div>
                  <div className="font-bold">+234 800 RENT EASY</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#1a6b3c]" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Email Us</div>
                  <div className="font-bold">joinrenteasy@gmail.com</div>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-black mb-8 uppercase tracking-widest text-[#1a6b3c]">Newsletter</h4>
            <p className="text-zinc-400 font-medium mb-6">Stay updated with the latest property listings and market trends.</p>
            <form className="relative">
              <input 
                type="email" 
                placeholder="Your email address"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-16 outline-none focus:border-[#1a6b3c] transition-colors font-medium"
              />
              <button className="absolute right-2 top-2 bottom-2 w-12 bg-[#1a6b3c] rounded-xl flex items-center justify-center hover:bg-[#14522e] transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-zinc-500 font-medium text-sm">
            &copy; {new Date().getFullYear()} RentEasy Nigeria. All rights reserved.
          </div>
          <div className="flex items-center gap-8 text-zinc-500 font-medium text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
              <CheckCircle className="w-4 h-4 text-[#1a6b3c]" />
              <span className="text-xs font-black uppercase tracking-widest">Verified Platform</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
