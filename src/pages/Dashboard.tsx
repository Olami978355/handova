import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Home, Shield, MessageSquare, Heart, 
  Settings, Plus, Loader2, AlertCircle, CheckCircle, Clock, 
  ArrowRight, User, MapPin, CreditCard, FileText, Calendar,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Property, Profile, Inspection, Deal } from '../types';
import { formatNaira } from '../utils/format';

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [transactions, setTransactions] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setError('Taking too long. Please refresh.');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!authLoading && user) {
      if (!profile?.role) {
        navigate('/onboarding');
        return;
      }
      fetchDashboardData();
    }
  }, [user, profile, authLoading]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (profile?.role === 'tenant') {
        // Fetch tenant data
        const { data: inspectionData } = await supabase
          .from('inspection_requests')
          .select('*, properties(*)')
          .eq('tenant_id', user!.id);
        setInspections(inspectionData || []);

        const { data: transactionData } = await supabase
          .from('deals')
          .select('*, properties(*)')
          .eq('tenant_id', user!.id);
        setTransactions(transactionData || []);
      } else {
        // Fetch landlord/agent data
        const { data: propertyData } = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', user!.id);
        setProperties(propertyData || []);

        const { data: inspectionData } = await supabase
          .from('inspection_requests')
          .select('*, properties(*)')
          .in('property_id', propertyData?.map(p => p.id) || []);
        setInspections(inspectionData || []);

        const { data: transactionData } = await supabase
          .from('deals')
          .select('*, properties(*)')
          .or(`landlord_id.eq.${user!.id},agent_id.eq.${user!.id}`);
        setTransactions(transactionData || []);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Something went wrong</h2>
        <p className="text-zinc-500 mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => fetchDashboardData()}
          className="bg-[#1a6b3c] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#14522e] transition-colors shadow-lg shadow-[#1a6b3c]/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
        <Loader2 className="w-12 h-12 text-[#1a6b3c] animate-spin mb-4" />
        <p className="text-zinc-500 font-bold">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Dashboard Header */}
      <div className="bg-[#1a6b3c] pt-12 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-[32px] flex items-center justify-center font-bold text-3xl text-white mr-6 border border-white/20 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Hello, {profile?.full_name.split(' ')[0]}!</h1>
                <div className="flex items-center text-white/70 font-medium">
                  <span className="capitalize">{profile?.role}</span>
                  <span className="mx-2 text-white/30">•</span>
                  <span className="flex items-center">
                    {profile?.verification_status === 'verified' ? (
                      <><CheckCircle className="w-4 h-4 mr-1 text-[#f0c040]" /> Verified Account</>
                    ) : (
                      <><Clock className="w-4 h-4 mr-1 text-white/50" /> {profile?.verification_status.replace('_', ' ')}</>
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {(profile?.role === 'landlord' || profile?.role === 'agent') && (
                <Link 
                  to="/add-property"
                  className="bg-[#f0c040] text-[#1a6b3c] px-6 py-3 rounded-2xl font-bold flex items-center hover:bg-[#c97d0e] transition-colors shadow-lg shadow-black/10"
                >
                  <Plus className="w-5 h-5 mr-2" /> List Property
                </Link>
              )}
              <Link 
                to="/profile"
                className="bg-white/10 backdrop-blur text-white px-6 py-3 rounded-2xl font-bold border border-white/20 hover:bg-white/20 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-8 rounded-[40px] shadow-xl border border-zinc-100">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                  <Home className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-black text-zinc-900">{profile?.role === 'tenant' ? inspections.length : properties.length}</div>
                <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
                  {profile?.role === 'tenant' ? 'Inspections' : 'Active Listings'}
                </div>
              </div>
              <div className="bg-white p-8 rounded-[40px] shadow-xl border border-zinc-100">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-black text-zinc-900">{transactions.length}</div>
                <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Escrow Deals</div>
              </div>
              <div className="bg-white p-8 rounded-[40px] shadow-xl border border-zinc-100">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-3xl font-black text-zinc-900">0</div>
                <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Unread Messages</div>
              </div>
            </div>

            {/* Recent Activity & Deals */}
            <div className="grid grid-cols-1 gap-8">
              {/* Escrow Deals */}
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-zinc-100">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-zinc-900">Escrow Deals</h2>
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                </div>

                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
                      <CreditCard className="w-10 h-10 text-zinc-200 mx-auto mb-4" />
                      <p className="text-zinc-400 font-medium">No active escrow deals.</p>
                    </div>
                  ) : (
                    transactions.map((deal) => (
                      <Link 
                        key={deal.id} 
                        to={`/deals/${deal.id}`}
                        className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-[#1a6b3c]/20 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white shrink-0 border border-zinc-100">
                            <img src={deal.properties?.images[0]} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{deal.properties?.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                deal.status === 'funds_released' ? 'bg-emerald-50 text-emerald-600' :
                                deal.status === 'disputed' ? 'bg-red-50 text-red-600' :
                                'bg-[#f0c040]/10 text-zinc-700'
                              }`}>
                                {deal.status.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-bold text-[#1a6b3c]">{formatNaira(deal.amount)}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-zinc-300 group-hover:text-[#1a6b3c] group-hover:translate-x-1 transition-all" />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity (Inspections) */}
              <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-zinc-100">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-zinc-900">Recent Activity</h2>
                  <button className="text-sm font-bold text-[#1a6b3c] hover:underline">View All</button>
                </div>

                <div className="space-y-6">
                  {inspections.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-zinc-200" />
                      </div>
                      <p className="text-zinc-400 font-medium">No recent activity to show.</p>
                    </div>
                  ) : (
                    inspections.map((inspection) => (
                      <div key={inspection.id} className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-[#1a6b3c]/20 transition-all group">
                        <div className="flex items-center">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                            <Calendar className="w-6 h-6 text-[#1a6b3c]" />
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">Inspection Requested</div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {new Date(inspection.preferred_date).toLocaleDateString()} • Status: <span className="capitalize font-bold text-[#1a6b3c]">{inspection.status}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-zinc-300 group-hover:text-[#1a6b3c] group-hover:translate-x-1 transition-all" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-[40px] p-8 shadow-xl border border-zinc-100">
              <h3 className="text-lg font-bold text-zinc-900 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <Link to="/listings" className="flex items-center p-4 bg-zinc-50 rounded-2xl hover:bg-[#1a6b3c]/5 transition-colors group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Search className="w-5 h-5 text-[#1a6b3c]" />
                  </div>
                  <span className="font-bold text-zinc-700">Browse Properties</span>
                </Link>
                <Link to="/chat" className="flex items-center p-4 bg-zinc-50 rounded-2xl hover:bg-[#1a6b3c]/5 transition-colors group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5 text-[#1a6b3c]" />
                  </div>
                  <span className="font-bold text-zinc-700">Messages</span>
                </Link>
                <Link to="/profile" className="flex items-center p-4 bg-zinc-50 rounded-2xl hover:bg-[#1a6b3c]/5 transition-colors group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-4 shadow-sm group-hover:scale-110 transition-transform">
                    <User className="w-5 h-5 text-[#1a6b3c]" />
                  </div>
                  <span className="font-bold text-zinc-700">Account Settings</span>
                </Link>
              </div>
            </div>

            {/* Verification Banner */}
            {profile?.verification_status === 'unverified' && (
              <div className="bg-gradient-to-br from-[#1a6b3c] to-[#14522e] rounded-[40px] p-8 text-white shadow-xl shadow-[#1a6b3c]/20 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <Shield className="w-12 h-12 mb-6 text-[#f0c040]" />
                <h3 className="text-xl font-bold mb-3">Get Verified</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6">
                  Verify your identity to build trust with {profile.role === 'tenant' ? 'landlords' : 'tenants'} and unlock all platform features.
                </p>
                <Link 
                  to="/profile"
                  className="inline-flex items-center font-bold text-[#f0c040] hover:text-white transition-colors"
                >
                  Start Verification <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
