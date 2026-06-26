import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface CardRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  requested_at: string;
  rejection_reason?: string;
  card_id?: string;
}

export const AgentCardRequest: React.FC = () => {
  const { profile, user } = useAuth();
  const [request, setRequest] = useState<CardRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchRequest();
  }, [user]);

  const fetchRequest = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('agent_card_requests')
      .select('*')
      .eq('agent_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequest(data);
    setLoading(false);
  };

  const handleRequest = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from('agent_card_requests').insert({
        agent_id: user.id,
        status: 'pending',
      });
      if (error) throw error;
      await fetchRequest();
    } catch (err) {
      console.error('Failed to request card:', err);
      alert('Failed to submit request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  if (profile?.role !== 'agent' && profile?.role !== 'landlord') return null;

  if (profile?.verification_status !== 'verified') {
    return (
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5" style={font}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white/30" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-white">RentEasy Digital ID</h3>
            <p className="text-[11px] text-white/30">Verify your account to request one</p>
          </div>
        </div>
        <p className="text-[12px] text-white/40 leading-relaxed">
          Complete NIN verification first to become eligible for a RentEasy Verified Agent Digital ID Card.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5 flex items-center justify-center" style={font}>
        <Loader2 className="w-5 h-5 text-[#1a6b3c] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5" style={font}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#f0c040]/15 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-[#f0c040]" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-white">RentEasy Digital ID</h3>
          <p className="text-[11px] text-white/30">Show this to tenants in person to verify your identity</p>
        </div>
      </div>

      {!request && (
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="w-full bg-[#f0c040] text-black py-3 rounded-xl font-bold text-[13px] hover:bg-[#e0b030] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          Request Digital ID Card
        </button>
      )}

      {request?.status === 'pending' && (
        <div className="flex items-center gap-3 p-3.5 bg-[#f0c040]/8 border border-[#f0c040]/15 rounded-xl">
          <Clock className="w-4 h-4 text-[#f0c040] flex-shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-[#f0c040]">Request pending review</p>
            <p className="text-[11px] text-white/35">Admins typically review within 24-48 hours</p>
          </div>
        </div>
      )}

      {request?.status === 'rejected' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3.5 bg-red-500/8 border border-red-500/15 rounded-xl">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-red-400">Request not approved</p>
              {request.rejection_reason && (
                <p className="text-[11px] text-white/35">{request.rejection_reason}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="w-full bg-white/5 border border-white/8 text-white/60 py-2.5 rounded-xl font-bold text-[12px] hover:bg-white/8 transition-colors disabled:opacity-50"
          >
            Submit New Request
          </button>
        </div>
      )}

      {(request?.status === 'approved' || request?.status === 'issued') && (
        <DigitalIDCard cardId={request.card_id || ''} />
      )}
    </div>
  );
};

const DigitalIDCard: React.FC<{ cardId: string }> = ({ cardId }) => {
  const { profile } = useAuth();
  const profileUrl = `https://rent-easy-ruby.vercel.app/agent/${profile?.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-br from-[#1a6b3c] to-[#0a1f11] rounded-2xl p-5 overflow-hidden border border-[#f0c040]/20"
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 20%, #f0c040 0%, transparent 50%)`,
        }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-[#f0c040] uppercase tracking-widest mb-0.5">Verified Agent</p>
          <p className="text-[16px] font-black text-white">RentEasy ID</p>
        </div>
        <Shield className="w-6 h-6 text-[#f0c040]" />
      </div>

      <div className="relative flex items-center gap-4">
        <div className="w-16 h-16 bg-white/10 rounded-xl overflow-hidden flex items-center justify-center text-white text-[20px] font-black flex-shrink-0 border-2 border-[#f0c040]/40">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (profile?.full_name || 'A').charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-white truncate">{profile?.full_name}</p>
          <p className="text-[11px] text-white/50 font-mono">{cardId || profile?.agent_id}</p>
          <p className="text-[10px] text-[#4ade80] font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> NIN Verified
          </p>
        </div>
      </div>

      <div className="relative mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <p className="text-[10px] text-white/30 leading-relaxed max-w-[180px]">
          Scan to verify this agent's profile on RentEasy
        </p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&bgcolor=0a1f11&color=ffffff&data=${encodeURIComponent(profileUrl)}`}
          alt="QR Code"
          className="w-16 h-16 rounded-lg border border-white/10"
        />
      </div>
    </motion.div>
  );
};