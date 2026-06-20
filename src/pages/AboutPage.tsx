import React from 'react';
import { Shield, Search, Key, CheckCircle, Users, Target, Heart } from 'lucide-react';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20" style={font}>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-5 text-center mb-20">
        <div className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest mb-4">About Us</div>
        <h1 className="text-[36px] lg:text-[48px] font-black text-white leading-tight mb-6">
          Nigeria's first escrow-protected<br />
          <span className="text-[#f0c040]">real estate marketplace</span>
        </h1>
        <p className="text-[16px] text-white/50 leading-relaxed max-w-2xl mx-auto">
          We built RentEasy because we were tired of seeing Nigerians lose their hard-earned money to property scams, 
          ghost landlords, and Omonile stress. There had to be a better way.
        </p>
      </div>

      {/* Mission */}
      <div className="max-w-6xl mx-auto px-5 mb-20">
        <div className="bg-[#0a1f11] border border-[#1a6b3c]/25 rounded-2xl p-8 lg:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-[#f0c040]" />
            <span className="text-[11px] font-bold text-[#f0c040] uppercase tracking-widest">Our Mission</span>
          </div>
          <h2 className="text-[28px] font-black text-white mb-4 max-w-2xl">
            To make renting and letting property in Nigeria safe, transparent, and stress-free for everyone.
          </h2>
          <p className="text-[14px] text-white/50 leading-relaxed max-w-2xl">
            Whether you are a tenant looking for your first apartment in Lagos, a landlord in Abuja wanting guaranteed 
            payments, or an agent in Port Harcourt building a portfolio — RentEasy gives you the tools and protection 
            you need to transact with confidence.
          </p>
        </div>
      </div>

      {/* Problem we solve */}
      <div className="max-w-6xl mx-auto px-5 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-black text-white mb-3">The problem we solve</h2>
          <p className="text-[14px] text-white/45 max-w-xl mx-auto">
            The Nigerian rental market has long been broken. We are fixing it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              emoji: '😤',
              problem: 'Fake listings',
              solution: 'Every landlord and agent must verify their NIN before listing. No NIN, no listing.',
            },
            {
              emoji: '💸',
              problem: 'Money lost to scams',
              solution: 'Rent is held in escrow and only released after you confirm you have moved in successfully.',
            },
            {
              emoji: '🏚️',
              problem: 'Properties not as described',
              solution: 'Our inspection fee system ensures you physically see the property before committing to pay rent.',
            },
          ].map(({ emoji, problem, solution }) => (
            <div key={problem} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6">
              <div className="text-3xl mb-4">{emoji}</div>
              <h3 className="text-[16px] font-bold text-red-400 mb-3">{problem}</h3>
              <p className="text-[13px] text-white/50 leading-relaxed">{solution}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-6xl mx-auto px-5 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-black text-white mb-3">How RentEasy works</h2>
          <p className="text-[14px] text-white/45">Three simple steps to your new home</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              step: '01',
              icon: Search,
              title: 'Find & Inspect',
              desc: 'Browse verified listings, pay a small inspection fee, and physically visit the property before committing.',
              color: '#f0c040',
            },
            {
              step: '02',
              icon: Shield,
              title: 'Pay into Escrow',
              desc: 'Once you find the right property, pay your rent securely into our escrow. Your money is protected until you move in.',
              color: '#1a6b3c',
            },
            {
              step: '03',
              icon: Key,
              title: 'Move In Safely',
              desc: 'Move in, confirm on the app, and funds are released to your landlord. Simple, safe, and stress-free.',
              color: '#4ade80',
            },
          ].map(({ step, icon: Icon, title, desc, color }) => (
            <div key={step} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[40px] font-black text-white/4">{step}</div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${color}15`, border: `1px solid ${color}25` }}
              >
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <h3 className="text-[16px] font-bold text-white mb-3">{title}</h3>
              <p className="text-[13px] text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="max-w-6xl mx-auto px-5 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-black text-white mb-3">What we stand for</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { icon: Shield, title: 'Security First', desc: 'Every transaction on RentEasy is protected by our escrow system. Your money never touches the landlord\'s hands until you are satisfied.' },
            { icon: CheckCircle, title: 'Verified Only', desc: 'We verify every landlord and agent with their NIN before they can list. No anonymous listings, no ghost landlords.' },
            { icon: Users, title: 'Community Trust', desc: 'We build trust between strangers. A tenant from Imo state can safely rent from a landlord in Lagos without ever worrying about being scammed.' },
            { icon: Heart, title: 'Built for Nigerians', desc: 'We understand the Nigerian market — from agency fees to inspection wahala. We built RentEasy to solve real Nigerian problems with real solutions.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0a1f11] border border-white/6 rounded-2xl p-6 flex gap-4">
              <div className="w-10 h-10 bg-[#1a6b3c]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#1a6b3c]" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-white mb-2">{title}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-5 text-center">
        <div className="bg-[#0a1f11] border border-[#1a6b3c]/25 rounded-2xl p-10">
          <h2 className="text-[24px] font-black text-white mb-4">Ready to rent safely?</h2>
          <p className="text-[14px] text-white/45 mb-8">
            Join thousands of Nigerians already using RentEasy to find and let properties without the stress.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="/listings"
              className="bg-[#f0c040] text-black px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
            >
              Browse Properties
            </a>
            <a
              href="/signup"
              className="bg-white/5 text-white px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-white/8 transition-colors border border-white/8"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}