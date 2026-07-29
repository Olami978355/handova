import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ArrowRight, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface DelegateRelation {
  id: string;
  deal_id: string;
  principal_id: string;
  delegate_id: string;
  can_sign: boolean;
  can_pay: boolean;
  can_confirm_movein: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  deals?: { id: string; status: string; properties?: { title: string } };
  principal?: { full_name: string; avatar_url?: string };
  delegate?: { full_name: string; avatar_url?: string };
}

const permissionLabels = (d: DelegateRelation) => {
  const perms: string[] = [];
  if (d.can_sign) perms.push('Sign');
  if (d.can_pay) perms.push('Pay');
  if (d.can_confirm_movein) perms.push('Confirm move-in');
  return perms.join(' · ');
};

const statusBadge = (status: DelegateRelation['status']) => {
  const styles: Record<string, string> = {
    accepted: 'bg-[#4ade80]/10 text-[#4ade80]',
    pending: 'bg-[#f0c040]/10 text-[#f0c040]',
    declined: 'bg-red-500/10 text-red-400',
    revoked: 'bg-white/8 text-white/35',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

const RelationCard: React.FC<{ relation: DelegateRelation; mode: 'granted' | 'received'; onClick: () => void }> = ({ relation, mode, onClick }) => {
  const otherPerson = mode === 'granted' ? relation.delegate : relation.principal;
  const propertyTitle = relation.deals?.properties?.title || 'a property';
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-[#0a1f11] border border-white/6 rounded-2xl flex items-center justify-between gap-3 text-left hover:border-white/12 transition-all"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-white truncate">
          {mode === 'granted'
            ? `${otherPerson?.full_name || 'Someone'} acting on your behalf`
            : `Acting on behalf of ${otherPerson?.full_name || 'someone'}`}
        </p>
        <p className="text-[11px] text-white/35 mt-0.5 truncate">{propertyTitle} · {permissionLabels(relation)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {statusBadge(relation.status)}
        <ArrowRight className="w-3.5 h-3.5 text-white/20" />
      </div>
    </button>
  );
};

export default function MyDelegates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [relations, setRelations] = useState<DelegateRelation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelations = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from('deal_delegates')
        .select('*, deals(id, status, properties(title)), principal:principal_id(full_name, avatar_url), delegate:delegate_id(full_name, avatar_url)')
        .or(`principal_id.eq.${user.id},delegate_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      setRelations(data || []);
      setLoading(false);
    };
    fetchRelations();
  }, [user]);

  const granted = relations.filter(r => r.principal_id === user?.id);
  const received = relations.filter(r => r.delegate_id === user?.id);

  return (
    <div className="h-[calc(100vh-64px)] bg-[#0a0a0a] overflow-y-auto" style={font}>
      <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
              aria-label="Go back"
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[18px] font-black text-white">My Delegates</h1>
            <p className="text-[12px] text-white/30">Every delegate relationship across all your deals</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-white/30">Loading delegates...</p>
          </div>
        ) : relations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/4 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-[15px] font-bold text-white/40 mb-1">No delegate relationships yet</p>
            <p className="text-[12px] text-white/20 max-w-xs mb-4">
              Delegates can sign, pay, or confirm move-in on your behalf for a specific deal. Add one from any active deal.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-[12px] font-semibold text-[#f0c040] hover:text-[#e0b030] transition-colors"
            >
              View Your Deals
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {granted.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-[#1a6b3c]" />
                  <h2 className="text-[13px] font-bold text-white/50 uppercase tracking-wider">Delegates You've Granted</h2>
                </div>
                <div className="space-y-2">
                  {granted.map(r => (
                    <RelationCard
                      key={r.id}
                      relation={r}
                      mode="granted"
                      onClick={() => r.deals?.id && navigate(`/deals/${r.deals.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {received.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#f0c040]" />
                  <h2 className="text-[13px] font-bold text-white/50 uppercase tracking-wider">Deals You're a Delegate On</h2>
                </div>
                <div className="space-y-2">
                  {received.map(r => (
                    <RelationCard
                      key={r.id}
                      relation={r}
                      mode="received"
                      onClick={() => r.deals?.id && navigate(`/deals/${r.deals.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
