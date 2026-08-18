import React, { useState } from 'react';
import { ChevronDown, Scale, Home, Shield, AlertTriangle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const rights = [
  {
    id: 'tenant',
    icon: Home,
    title: "Tenant Rights",
    color: '#D4AF37',
    law: 'Tenancy Law of Lagos State 2011 & Recovery of Premises Act',
    items: [
      { title: 'Right to Quiet Enjoyment', desc: 'Once you have a valid tenancy agreement and have paid your rent, your landlord cannot interfere with your peaceful use of the property. Landlords cannot enter without notice or your permission except in genuine emergencies.' },
      { title: 'Protection from Illegal Eviction', desc: 'Your landlord CANNOT evict you without a court order. Self-help evictions — changing locks, removing doors, cutting utilities, or using thugs — are illegal under Nigerian law and constitute a criminal offence.' },
      { title: 'Right to Proper Notice', desc: 'For a yearly tenancy, you must receive at least 6 months written notice before the landlord can ask you to leave. Monthly tenancies require 1 month notice. Notice must be in writing.' },
      { title: 'Receipt for All Payments', desc: 'You have the right to demand and receive a written receipt for every payment you make including rent, service charge, and caution fee. Keep all receipts safely.' },
      { title: 'Protection from Arbitrary Rent Increases', desc: 'A landlord cannot increase your rent mid-tenancy without your agreement. Rent increases can only take effect when a new tenancy is being entered into, and you must be given adequate notice.' },
      { title: 'Right to a Habitable Property', desc: 'You are entitled to live in a property that is safe and habitable. Structural defects, broken essential facilities (water, electricity infrastructure), and pest infestations should be fixed by the landlord.' },
    ]
  },
  {
    id: 'landlord',
    icon: Shield,
    title: "Landlord Rights",
    color: '#D4AF37',
    law: 'Recovery of Premises Act & Property Law',
    items: [
      { title: 'Right to Receive Rent', desc: 'Landlords have the right to receive the agreed rent on time. If a tenant fails to pay rent, the landlord can begin legal proceedings after proper notice has been served.' },
      { title: 'Right to Recover Property', desc: 'After properly serving a Notice to Quit and Notice of Intention to Apply to Court, a landlord can apply to court for an Order of Possession to recover their property from a defaulting tenant.' },
      { title: 'Right to Inspect Property', desc: 'With reasonable notice (at least 24 hours), a landlord has the right to inspect the property to assess its condition, especially at the end of a tenancy period.' },
      { title: 'Right to Use Security Deposit', desc: 'A caution fee or security deposit can be used by the landlord to cover damage to the property caused by the tenant beyond normal wear and tear. Any unused portion must be returned.' },
      { title: 'Right to Set House Rules', desc: 'Landlords can set reasonable house rules as part of the tenancy agreement — such as no pets, no subletting, or noise restrictions — as long as these are legal and agreed upon before the tenancy begins.' },
    ]
  },
  {
    id: 'scams',
    icon: AlertTriangle,
    title: "Common Scams to Avoid",
    color: '#ef4444',
    law: 'Know your rights, protect your money',
    items: [
      { title: 'Ghost Landlord Scam', desc: 'Someone claims to be the owner of a property they do not own, collects rent from multiple people, and disappears. ALWAYS verify ownership documents. On Handova, every landlord is NIN-verified.' },
      { title: 'Fake "Caution Fee" Scam', desc: 'Fraudsters request large "caution fees" or "agency fees" upfront before you ever see the property. Legitimate caution fees are paid AFTER you have inspected the property and signed an agreement.' },
      { title: 'Omonile/Land Grabber Fraud', desc: 'Multiple individuals claim ownership of the same land or property and collect money from different buyers. Always conduct due diligence with a lawyer before purchasing land.' },
      { title: 'Online Rental Scam', desc: 'Property photos copied from legitimate listings are posted at suspiciously low prices. The "landlord" is always unavailable to show the property in person and asks for upfront payment before viewing. Never pay before you physically see a property.' },
      { title: 'Fake Agent Scam', desc: 'Someone poses as a professional agent, collects agency fees, and provides fake keys or access. Always verify an agent\'s credentials and use platforms like Handova where agents are verified.' },
    ]
  },
  {
    id: 'agreement',
    icon: FileText,
    title: "Tenancy Agreement Guide",
    color: '#60a5fa',
    law: 'What to look for before you sign',
    items: [
      { title: 'What Must Be in Every Agreement', desc: 'A valid tenancy agreement must include: full names and addresses of both landlord and tenant, detailed description of the property, amount of rent and payment schedule, duration of tenancy, caution fee amount and conditions for return, notice period for either party to terminate.' },
      { title: 'Red Flags in an Agreement', desc: 'Be cautious of agreements that: allow landlord entry without notice, permit rent increases at any time without notice, waive your right to the caution fee return, include penalties that are clearly excessive, or are vague about the tenancy end date.' },
      { title: 'Always Get a Lawyer', desc: 'For any tenancy above ₦500,000 per year, we strongly recommend engaging a lawyer to review your agreement before signing. A lawyer can identify unfair clauses and ensure the document is legally enforceable.' },
      { title: 'Keep Your Copy Safe', desc: 'Always keep a signed copy of your tenancy agreement. Take photos of the property on move-in day. Document all fixtures, fittings, and existing damage in writing, signed by both parties, to protect your caution fee when you leave.' },
    ]
  },
];

const RightItem = ({ title, desc }: { title: string; desc: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/6 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-[14px] font-semibold text-paper">{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-paper/40 flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 border-t border-white/5">
              <p className="text-[13px] text-paper/55 leading-relaxed pt-4">{desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LegalGuidePage() {
  const [activeSection, setActiveSection] = useState('tenant');
  const active = rights.find(r => r.id === activeSection) || rights[0];

  return (
    <div className="min-h-screen bg-ink pt-24 pb-20" style={font}>
      <div className="max-w-6xl mx-auto px-5">

        {/* Header */}
        <div className="flex items-start gap-5 mb-12">
          <div className="w-16 h-16 bg-ink border border-gold/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Scale className="w-8 h-8 text-gold" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-2">Know Your Rights</div>
            <h1 className="text-[32px] font-black text-paper mb-3">Nigerian Real Estate Legal Guide</h1>
            <p className="text-[14px] text-paper/45 max-w-2xl">
              Understanding your rights as a tenant or landlord in Nigeria can protect you from exploitation, 
              illegal eviction, and financial loss. This guide is based on Nigerian property law.
            </p>
          </div>
        </div>

        {/* Barrister Amaka intro */}
        <div className="bg-ink border border-gold/15 rounded-2xl p-6 mb-10 flex items-start gap-5">
          <svg width="60" height="78" viewBox="0 0 80 110" fill="none" className="flex-shrink-0">
            <rect x="18" y="55" width="44" height="55" rx="6" fill="#1a1a2e" />
            <rect x="22" y="58" width="36" height="50" rx="4" fill="#16213e" />
            <rect x="28" y="55" width="24" height="8" rx="2" fill="#e8e8e8" />
            <ellipse cx="40" cy="58" rx="16" ry="18" fill="#f5c5a3" />
            <ellipse cx="40" cy="44" rx="18" ry="14" fill="#2c1810" />
            <ellipse cx="40" cy="40" rx="16" ry="12" fill="#3d2314" />
            <ellipse cx="40" cy="58" rx="10" ry="11" fill="#f0b088" />
            <ellipse cx="35" cy="56" rx="2" ry="2.5" fill="#3d2314" />
            <ellipse cx="45" cy="56" rx="2" ry="2.5" fill="#3d2314" />
            <path d="M36 63 Q40 66 44 63" stroke="#c07060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <rect x="14" y="65" width="12" height="30" rx="4" fill="#1a1a2e" />
            <rect x="54" y="65" width="12" height="30" rx="4" fill="#1a1a2e" />
            <rect x="24" y="80" width="32" height="6" rx="2" fill="#D4AF37" />
            <text x="40" y="85" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#fff">BARRISTER AMAKA</text>
          </svg>
          <div>
            <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-2">A word from Barrister Amaka</div>
            <p className="text-[14px] font-semibold text-paper leading-snug mb-2">
              "Knowledge is your first line of defence. A tenant who knows their rights cannot be easily exploited. 
              A landlord who understands the law protects their investment."
            </p>
            <p className="text-[12px] text-paper/35">Property Law Specialist · Lagos Bar Association</p>
          </div>
        </div>

        <div className="flex gap-8 flex-col lg:flex-row">

          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-ink border border-white/6 rounded-2xl p-4 lg:sticky lg:top-24">
              <p className="text-[10px] font-bold text-paper/30 uppercase tracking-widest mb-3 px-2">Sections</p>
              <div className="space-y-1">
                {rights.map(right => {
                  const Icon = right.icon;
                  return (
                    <button
                      key={right.id}
                      onClick={() => setActiveSection(right.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-left ${
                        activeSection === right.id
                          ? 'bg-gold text-paper'
                          : 'text-paper/50 hover:bg-white/5 hover:text-paper'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{
                        color: activeSection === right.id ? 'white' : right.color
                      }} />
                      {right.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-ink border border-white/6 rounded-2xl p-6 lg:p-8">
              <div className="flex items-start gap-4 mb-8 pb-6 border-b border-white/5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${active.color}15`, border: `1px solid ${active.color}25` }}
                >
                  <active.icon className="w-6 h-6" style={{ color: active.color }} />
                </div>
                <div>
                  <h2 className="text-[22px] font-black text-paper">{active.title}</h2>
                  <p className="text-[12px] text-paper/30 mt-1">{active.law}</p>
                </div>
              </div>

              <div className="space-y-2">
                {active.items.map((item, i) => (
                  <RightItem key={i} title={item.title} desc={item.desc} />
                ))}
              </div>

              <div className="mt-8 p-4 bg-gold/5 border border-gold/15 rounded-xl">
                <p className="text-[12px] text-gold/70 leading-relaxed">
                  <strong className="text-gold">Disclaimer:</strong> This guide is for general information only and does not constitute legal advice. 
                  For specific legal issues, please consult a qualified Nigerian lawyer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}