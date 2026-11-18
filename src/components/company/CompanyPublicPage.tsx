import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, ShieldAlert, Users, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Property } from '../../types';
import PropertyCard from '../PropertyCard';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface Props {
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    created_at: string;
  };
}

interface CompanyRow {
  name: string;
  verification_status: string;
  description: string | null;
  logo_url: string | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string;
}

export default function CompanyPublicPage({ profile }: Props) {
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [listings, setListings] = useState<Property[]>([]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from('companies')
        .select('name, verification_status, description, logo_url')
        .eq('id', profile.id)
        .maybeSingle();
      setCompany(c);

      const { data: rows } = await supabase
        .from('company_members')
        .select('member_id')
        .eq('company_id', profile.id)
        .eq('status', 'active');
      const ids = (rows || []).map(r => r.member_id);
      if (ids.length > 0) {
        const { data: people } = await supabase
          .from('public_profiles')
          .select('id, full_name, username, avatar_url, verification_status')
          .in('id', ids);
        setTeam(people || []);
      }

      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .eq('company_id', profile.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      setListings(props || []);
    })();
  }, [profile.id]);

  const name = company?.name || profile.full_name || 'Company';
  const verified = company?.verification_status === 'verified';
  const pending = company?.verification_status === 'pending_verification';
  const logo = company?.logo_url || profile.avatar_url;
  const since = new Date(profile.created_at).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 space-y-8" style={font}>
      <div className="bg-ink border border-white/6 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 bg-white/5 border border-white/8 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
            {logo
              ? <img src={logo} alt="" className="w-full h-full object-cover" />
              : <Building2 className="w-8 h-8 text-gold" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black text-white leading-tight">{name}</h1>
            <div className="mt-2">
              {verified ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gold bg-gold/10 px-3 py-1.5 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified business
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/50 bg-white/5 px-3 py-1.5 rounded-lg">
                  <ShieldAlert className="w-3.5 h-3.5" />{' '}
                  {pending ? 'Verification pending' : 'Unverified business'}
                </span>
              )}
            </div>
            <p className="text-[12px] text-white/30 mt-3">On Handova since {since}</p>
          </div>
        </div>
        {company?.description && (
          <p className="text-[13px] text-white/60 leading-relaxed mt-5">
            {company.description}
          </p>
        )}
        {!verified && (
          <p className="text-[11px] text-white/35 mt-5">
            Handova has not yet confirmed this company's registration.
            Check the agent you deal with and never pay outside Handova.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 mt-6 max-w-sm">
          <div className="p-3 bg-white/4 rounded-xl">
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Home className="w-3.5 h-3.5" /> Active listings
            </p>
            <p className="text-[20px] font-black text-white mt-1">{listings.length}</p>
          </div>
          <div className="p-3 bg-white/4 rounded-xl">
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Users className="w-3.5 h-3.5" /> Agents
            </p>
            <p className="text-[20px] font-black text-white mt-1">{team.length}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-bold text-white mb-4">Our agents</h2>
        {team.length === 0 ? (
          <div className="bg-ink border border-white/6 rounded-2xl p-8 text-center">
            <p className="text-[13px] text-white/25">No agents listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {team.map(a => {
              const card = (
                <div className="bg-ink border border-white/6 rounded-2xl p-4 flex items-center gap-3 hover:border-white/15 transition-colors">
                  <div className="w-11 h-11 bg-gold/15 rounded-xl overflow-hidden flex items-center justify-center text-gold font-bold flex-shrink-0">
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (a.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {a.full_name || 'Agent'}
                    </p>
                    <p className="text-[11px] text-white/35 truncate">
                      {a.username ? '@' + a.username : 'Agent'}
                      {a.verification_status === 'verified' ? ' · Verified' : ''}
                    </p>
                  </div>
                </div>
              );
              return a.username
                ? <Link key={a.id} to={'/u/' + a.username}>{card}</Link>
                : <div key={a.id}>{card}</div>;
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[15px] font-bold text-white mb-4">
          {listings.length > 0
            ? listings.length + ' active listing' + (listings.length !== 1 ? 's' : '')
            : 'Listings'}
        </h2>
        {listings.length === 0 ? (
          <div className="bg-ink border border-white/6 rounded-2xl p-12 text-center">
            <p className="text-[13px] text-white/25">No active listings right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(p => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
