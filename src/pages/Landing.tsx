import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, Home, MapPin, Search, ArrowRight, CheckCircle2, 
  Users, CreditCard, Building2, Sparkles, Star,
  Phone, Mail, Map as MapIcon, Menu, X, Play,
  ChevronRight, Facebook, Twitter, Instagram, Linkedin,
  CheckCircle, Zap, Heart, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

export default function Landing() {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useState({
    location: '',
    type: 'all',
    transaction_type: 'rent'
  });

  useEffect(() => {
    fetchFeaturedProperties();
  }, []);

  const fetchFeaturedProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setFeaturedProperties(data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchParams.location) params.set('location', searchParams.location);
    if (searchParams.type !== 'all') params.set('type', searchParams.type);
    if (searchParams.transaction_type !== 'all') params.set('transaction_type', searchParams.transaction_type);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#1a6b3c] selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-40 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[#1a6b3c]/5 -z-10"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#1a6b3c]/10 to-transparent -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-zinc-100 mb-8">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-6 h-6 rounded-full border-2 border-white" alt="" />
                  ))}
                </div>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Trusted by 10k+ Nigerians</span>
              </div>

              <h1 className="text-6xl md:text-8xl font-black text-zinc-900 leading-[0.95] tracking-tighter mb-8">
                Rent or Buy <br />
                <span className="text-[#1a6b3c]">Safely</span> in Nigeria.
              </h1>
              
              <p className="text-xl text-zinc-500 font-medium mb-12 max-w-lg leading-relaxed">
                The only real estate marketplace with built-in escrow protection, verified listings, and registered agents. No more "Omonile" stress.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="bg-white p-3 rounded-[32px] shadow-2xl shadow-zinc-200 border border-zinc-100 flex flex-col md:flex-row gap-2 max-w-2xl relative z-10">
                <div className="flex-1 flex items-center px-4 py-3 bg-zinc-50 rounded-2xl border border-zinc-100 group focus-within:border-[#1a6b3c] transition-all">
                  <MapPin className="w-5 h-5 text-zinc-400 mr-3 group-focus-within:text-[#1a6b3c]" />
                  <input 
                    type="text" 
                    placeholder="Lekki, Lagos..." 
                    className="bg-transparent border-none outline-none w-full font-bold text-zinc-900 placeholder:text-zinc-400"
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
                  />
                </div>
                <div className="flex-1 flex items-center px-4 py-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <Building2 className="w-5 h-5 text-zinc-400 mr-3" />
                  <select 
                    className="bg-transparent border-none outline-none w-full font-bold text-zinc-900 appearance-none"
                    value={searchParams.transaction_type}
                    onChange={(e) => setSearchParams({...searchParams, transaction_type: e.target.value as any})}
                  >
                    <option value="rent">For Rent</option>
                    <option value="sell">For Sale</option>
                  </select>
                </div>
                <button type="submit" className="bg-[#1a6b3c] text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center hover:bg-[#14522e] transition-all active:scale-95">
                  <Search className="w-5 h-5 mr-2" /> Search
                </button>
              </form>

              <div className="mt-12 flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Escrow Protected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Verified Listings</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative aspect-[4/5] rounded-[60px] overflow-hidden shadow-2xl border-8 border-white group">
                <img 
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80" 
                  alt="Modern Nigerian Home" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-10 left-10 right-10">
                  <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-[#1a6b3c]/10 text-[#1a6b3c] text-[10px] font-black uppercase tracking-widest rounded-full">New Listing</span>
                      <span className="text-xl font-black text-[#1a6b3c]">₦4.5M/yr</span>
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 mb-1">Luxury 4-Bed Duplex</h3>
                    <p className="text-zinc-500 text-xs font-medium flex items-center">
                      <MapPin className="w-3 h-3 mr-1" /> Phase 1, Lekki, Lagos
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Badges */}
              <motion.div 
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -left-10 top-1/4 bg-white p-4 rounded-2xl shadow-2xl border border-zinc-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-[#f0c040] rounded-xl flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Premium</p>
                  <p className="text-sm font-black text-zinc-900">Verified Agent</p>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute -right-10 bottom-1/4 bg-white p-4 rounded-2xl shadow-2xl border border-zinc-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-[#1a6b3c] rounded-xl flex items-center justify-center text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Secure</p>
                  <p className="text-sm font-black text-zinc-900">Escrow Payment</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-black text-[#1a6b3c] uppercase tracking-[0.3em] mb-4">Process</h2>
            <h3 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">How Rent Easy Works</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StepCard 
              number="01"
              title="Search"
              description="Browse thousands of verified listings in your preferred location."
              icon={<Search className="w-6 h-6" />}
            />
            <StepCard 
              number="02"
              title="Inspect"
              description="Book an inspection. Your fee is held in escrow until you confirm."
              icon={<MapPin className="w-6 h-6" />}
            />
            <StepCard 
              number="03"
              title="Pay"
              description="Pay rent or purchase price securely through our escrow system."
              icon={<CreditCard className="w-6 h-6" />}
            />
            <StepCard 
              number="04"
              title="Move In"
              description="Get your keys and move in. We release funds to the landlord."
              icon={<Home className="w-6 h-6" />}
            />
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-32 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <h2 className="text-xs font-black text-[#1a6b3c] uppercase tracking-[0.3em] mb-4">Listings</h2>
              <h3 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">Featured Properties</h3>
            </div>
            <Link to="/listings" className="group flex items-center gap-2 text-sm font-black text-zinc-900 uppercase tracking-widest hover:text-[#1a6b3c] transition-colors">
              View All Properties <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-[4/5] bg-zinc-200 rounded-[40px] animate-pulse"></div>
              ))}
            </div>
          ) : featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
              <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-300">
                <Home className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-black text-zinc-900 mb-2">Properties coming soon</h4>
              <p className="text-zinc-500 font-medium mb-8">Be the first to list a property on Nigeria's safest marketplace!</p>
              <Link to="/add-property" className="inline-flex items-center gap-2 bg-[#1a6b3c] text-white px-8 py-4 rounded-2xl font-black hover:bg-[#14522e] transition-all">
                List Your Property <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Why Rent Easy */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="relative aspect-square rounded-[60px] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80" 
                  alt="Happy Family" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 bg-[#1a6b3c] p-10 rounded-[40px] shadow-2xl text-white max-w-xs">
                <p className="text-4xl font-black mb-2">100%</p>
                <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Safety Guarantee</p>
                <p className="mt-4 text-xs leading-relaxed opacity-60">We've processed over ₦500M in secure transactions without a single fraud case.</p>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black text-[#1a6b3c] uppercase tracking-[0.3em] mb-4">Trust</h2>
              <h3 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-8">Why Nigeria Trusts <br />Rent Easy</h3>
              
              <div className="space-y-8">
                <FeatureItem 
                  icon={<Shield className="w-6 h-6" />}
                  title="Escrow Protection"
                  description="Your money is never sent directly to a landlord or agent. We hold it until you're satisfied."
                />
                <FeatureItem 
                  icon={<CheckCircle className="w-6 h-6" />}
                  title="Verified Listings"
                  description="Every property is physically verified by our team or registered partners before going live."
                />
                <FeatureItem 
                  icon={<Zap className="w-6 h-6" />}
                  title="Instant Approval"
                  description="Verified agents get instant approval on listings, making the process faster for everyone."
                />
                <FeatureItem 
                  icon={<Heart className="w-6 h-6" />}
                  title="24/7 Support"
                  description="Our dedicated support team is always ready to help you with any issues or disputes."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Landlords */}
      <section className="py-32 bg-zinc-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[#1a6b3c]/20 blur-3xl -z-0"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-xs font-black text-[#f0c040] uppercase tracking-[0.3em] mb-4">Landlords & Agents</h2>
              <h3 className="text-4xl md:text-6xl font-black mb-8 leading-tight">List Your Property <br />to Verified Tenants</h3>
              <p className="text-zinc-400 text-lg mb-12 max-w-lg leading-relaxed">
                Reach thousands of serious, verified tenants. Manage your properties, track payments, and get paid directly to your bank account.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1a6b3c] rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm">Zero Listing Fees</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1a6b3c] rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm">Verified Tenants Only</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1a6b3c] rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm">Automated Payments</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1a6b3c] rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm">Legal Protection</span>
                </div>
              </div>

              <Link to="/signup" className="inline-flex items-center gap-3 bg-[#f0c040] text-zinc-900 px-10 py-5 rounded-2xl font-black text-lg hover:bg-[#d9ac3a] transition-all active:scale-95">
                List Your Property <ArrowRight className="w-6 h-6" />
              </Link>
            </motion.div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-12">
                  <div className="aspect-[3/4] bg-zinc-800 rounded-3xl overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80" className="w-full h-full object-cover opacity-60" alt="" />
                  </div>
                  <div className="aspect-square bg-[#1a6b3c] rounded-3xl p-8 flex flex-col justify-end">
                    <p className="text-4xl font-black">2.5k+</p>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Active Listings</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="aspect-square bg-zinc-800 rounded-3xl p-8 flex flex-col justify-end">
                    <p className="text-4xl font-black">₦500M</p>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Payouts Made</p>
                  </div>
                  <div className="aspect-[3/4] bg-zinc-800 rounded-3xl overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80" className="w-full h-full object-cover opacity-60" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-black text-[#1a6b3c] uppercase tracking-[0.3em] mb-4">Testimonials</h2>
            <h3 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight">What Our Users Say</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard 
              name="Chidi Okafor"
              role="Tenant in Lagos"
              content="I was skeptical about paying online, but the escrow system gave me peace of mind. Found a great apartment in Surulere within a week!"
              avatar="https://i.pravatar.cc/150?u=chidi"
            />
            <TestimonialCard 
              name="Amina Bello"
              role="Landlord in Abuja"
              content="Rent Easy has made managing my properties so much easier. The tenant verification is thorough, and I always get my rent on time."
              avatar="https://i.pravatar.cc/150?u=amina"
            />
            <TestimonialCard 
              name="Tunde Adeyemi"
              role="Agent in Lekki"
              content="As a registered agent, this platform has helped me reach more serious clients. The 10% commission is handled automatically."
              avatar="https://i.pravatar.cc/150?u=tunde"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-50 pt-32 pb-12 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-[#1a6b3c] rounded-xl flex items-center justify-center text-white">
                  <Home className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-zinc-900">RentEasy</span>
              </Link>
              <p className="text-zinc-500 font-medium max-w-sm leading-relaxed mb-8">
                Nigeria's most trusted real estate platform. We're on a mission to bring trust, transparency, and safety to the Nigerian property market.
              </p>
      <div className="flex items-center gap-4">
        <SocialLink icon={<Facebook />} />
        <SocialLink icon={<Twitter />} href="https://x.com/Renteasyapp" />
        <SocialLink icon={<Instagram />} />
        <SocialLink icon={<Linkedin />} />
      </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-8">Platform</h4>
              <ul className="space-y-4">
                <li><FooterLink to="/listings">Browse Properties</FooterLink></li>
                <li><FooterLink to="/map">Map Search</FooterLink></li>
                <li><FooterLink to="/signup">List Property</FooterLink></li>
                <li><FooterLink to="#">How it Works</FooterLink></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-8">Company</h4>
              <ul className="space-y-4">
                <li><FooterLink to="#">About Us</FooterLink></li>
                <li><FooterLink to="#">Contact Support</FooterLink></li>
                <li><FooterLink to="#">Privacy Policy</FooterLink></li>
                <li><FooterLink to="#">Terms of Service</FooterLink></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">© 2024 Rent Easy Nigeria. Built for trust.</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">System Status: Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="group p-8 rounded-[40px] bg-zinc-50 border border-zinc-100 hover:border-[#1a6b3c]/20 transition-all hover:shadow-2xl hover:-translate-y-2">
      <div className="flex items-center justify-between mb-8">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#1a6b3c] shadow-sm group-hover:bg-[#1a6b3c] group-hover:text-white transition-all duration-500">
          {icon}
        </div>
        <span className="text-4xl font-black text-zinc-200 group-hover:text-[#1a6b3c]/10 transition-colors duration-500">{number}</span>
      </div>
      <h4 className="text-xl font-black text-zinc-900 mb-3">{title}</h4>
      <p className="text-zinc-500 text-sm font-medium leading-relaxed">{description}</p>
    </div>
  );
}

function PropertyCard({ property }: { property: Property }) {
  return (
    <Link to={`/property/${property.id}`} className="group block">
      <div className="relative aspect-[4/5] rounded-[40px] overflow-hidden shadow-xl mb-6">
        <img 
          src={property.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80'} 
          alt={property.title} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        <div className="absolute top-6 right-6">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl">
            <p className="text-sm font-black text-[#1a6b3c]">₦{property.price.toLocaleString()}{property.transaction_type === 'rent' ? '/yr' : ''}</p>
          </div>
        </div>
        <div className="absolute bottom-8 left-8 right-8">
          <p className="text-xs font-black text-white/70 uppercase tracking-widest mb-1">{property.category}</p>
          <h4 className="text-xl font-black text-white tracking-tight">{property.title}</h4>
        </div>
      </div>
    </Link>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="flex-shrink-0 w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-[#1a6b3c] border border-zinc-100 group-hover:bg-[#1a6b3c] group-hover:text-white transition-all duration-500">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-black text-zinc-900 mb-1">{title}</h4>
        <p className="text-zinc-500 text-sm font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TestimonialCard({ name, role, content, avatar }: { name: string, role: string, content: string, avatar: string }) {
  return (
    <div className="p-10 rounded-[40px] bg-zinc-50 border border-zinc-100 hover:shadow-2xl transition-all">
      <div className="flex text-[#f0c040] mb-8">
        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
      </div>
      <p className="text-zinc-700 font-medium leading-relaxed mb-10 italic">"{content}"</p>
      <div className="flex items-center gap-4">
        <img src={avatar} className="w-12 h-12 rounded-2xl object-cover" alt={name} />
        <div>
          <p className="font-black text-zinc-900 text-sm">{name}</p>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{role}</p>
        </div>
      </div>
    </div>
  );
}

function SocialLink({ icon, href = "#" }: { icon: React.ReactNode, href?: string }) {
  return (
    <a href={href} target={href !== "#" ? "_blank" : undefined} rel={href !== "#" ? "noopener noreferrer" : undefined} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 hover:bg-[#1a6b3c] hover:text-white transition-all shadow-sm border border-zinc-100">
      <div className="w-5 h-5">
        {icon}
      </div>
    </a>
  );
}

function FooterLink({ to, children }: { to: string, children: React.ReactNode }) {
  return (
    <Link to={to} className="text-sm font-bold text-zinc-500 hover:text-[#1a6b3c] transition-colors">
      {children}
    </Link>
  );
}
