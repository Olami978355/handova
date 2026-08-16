import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Handova?',
        a: 'Handova is an escrow-protected real estate marketplace that connects tenants with verified landlords and agents. We hold your rent payment securely until you confirm you have successfully moved in — protecting you from scams and property fraud.'
      },
      {
        q: 'How is Handova different from other property sites?',
        a: 'Unlike other listing sites that simply show properties, Handova provides end-to-end transaction protection. Every payment goes through our escrow system, every landlord and agent must verify their NIN, and every inspection is paid for upfront to ensure both parties are serious.'
      },
      {
        q: 'Is Handova available across all Nigerian states?',
        a: 'Yes. Handova covers all 36 states and the FCT. However, we currently have the highest concentration of listings in Lagos, Abuja, Port Harcourt, Ibadan, and Enugu. We are actively expanding to more cities.'
      },
      {
        q: 'Is it free to sign up?',
        a: 'Yes, creating an account on Handova is completely free for tenants, landlords, and agents. We only charge fees when a transaction takes place — a 2% platform fee on escrow payments.'
      },
    ]
  },
  {
    category: 'Inspection Fees',
    questions: [
      {
        q: 'What is an inspection fee and why do I have to pay it?',
        a: 'An inspection fee is a small deposit paid before visiting a property. It confirms you are a serious tenant and not wasting the landlord\'s time. It protects both parties — the landlord gets assurance you will show up, and you get a guaranteed viewing slot.'
      },
      {
        q: 'How is the inspection fee calculated?',
        a: 'The inspection fee is calculated as a small percentage of the annual rent, typically between 0.5% and 2% depending on the property price. For a ₦500,000/year property, the inspection fee would typically be around ₦5,000 to ₦10,000.'
      },
      {
        q: 'Can I get my inspection fee back?',
        a: "You can cancel and get a full refund any time before the scheduled inspection date. Once that date arrives, the fee is automatically released to the agent or landlord and can't be reversed through a refund request. If the inspection didn't happen as agreed or the property was significantly misrepresented, you can raise a dispute for a moderator to review — a refund is only issued if the dispute is upheld."
      },
      {
        q: 'What if the property looks nothing like the photos?',
        a: 'This is covered under our misrepresentation policy. If the property is significantly different from the listing — different location, smaller size, missing features, or in poor condition — you are entitled to a 100% refund of your inspection fee and can report the listing for removal.'
      },
    ]
  },
  {
    category: 'Escrow & Payments',
    questions: [
      {
        q: 'How does the escrow system work?',
        a: 'After you and a landlord/agent agree on a deal: you pay the full rent amount into our escrow via Paystack, the landlord uploads a tenancy agreement, you sign the agreement, you move in and confirm it on the app, then we release the funds to the landlord. Your money is never touched until you confirm you are happy with the property.'
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept all major debit cards (Visa, Mastercard, Verve) through Paystack. Bank transfers are also available. We do not accept cash payments as this defeats the purpose of our escrow protection.'
      },
      {
        q: 'How long does it take for the landlord to receive funds after I confirm move-in?',
        a: 'Funds are disbursed to the landlord or agent within 24 hours of your move-in confirmation. Depending on their bank, it may take an additional 1-3 business days to reflect in their account.'
      },
      {
        q: 'What happens if I pay but the landlord refuses to hand over the keys?',
        a: 'This is exactly what our escrow protects against. Since the landlord has not given you access and you cannot confirm move-in, the funds remain in escrow. You can raise a dispute through the app and our moderation team will investigate and refund your money if your claim is valid.'
      },
    ]
  },
  {
    category: 'Landlords & Agents',
    questions: [
      {
        q: 'How do I list my property on Handova?',
        a: 'Create an account, complete NIN verification, then click "List Property" on your dashboard. You will be asked to provide property details, upload photos and videos, set your price, and add house rules. Your listing will be reviewed and approved within 24 hours if you are verified.'
      },
      {
        q: 'What is NIN verification and why is it required?',
        a: 'NIN (National Identification Number) verification confirms your identity as a Nigerian citizen or resident. It is required for all landlords and agents before their listings can go live. This protects tenants from anonymous scammers and builds trust on the platform.'
      },
      {
        q: 'How does agent commission work on Handova?',
        a: 'When an agent closes a deal through Handova, their commission (typically 10%) is automatically calculated and deducted from the total amount. The commission is paid to the agent directly from the escrow disbursement — no need to chase the landlord for payment.'
      },
      {
        q: 'Can a landlord list without using an agent?',
        a: 'Absolutely. Landlords can list directly and manage their own transactions. If no agent is involved, the full amount minus the 2% platform fee goes directly to the landlord upon deal completion.'
      },
    ]
  },
  {
    category: 'Security & Trust',
    questions: [
      {
        q: 'Is my money safe with Handova?',
        a: 'Yes. All payments are processed by Paystack, a CBN-licensed payment company. Funds are held in a secure escrow account and are never accessible to the landlord until you confirm your move-in. We use bank-grade encryption and security practices.'
      },
      {
        q: 'What if I suspect a listing is fraudulent?',
        a: 'Click the "Report this listing" button on any property page. Our moderation team will investigate within 24 hours. If fraud is confirmed, the listing is removed and the account is banned. You can also email us at joinrenteasy@gmail.com.'
      },
      {
        q: 'How do I raise a dispute?',
        a: 'Go to your deal page and click "Flag Transaction" in the danger zone section (admin only for now) or contact our support team at joinrenteasy@gmail.com with your deal reference number and a description of the issue. Our team responds within 48 hours.'
      },
      {
        q: 'What if someone asks me to pay outside Handova?',
        a: "Don't do it — payments made outside the platform aren't covered by escrow protection, and we can't help if something goes wrong. Use the Report option in your conversation to flag it to our team."
      },
    ]
  },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/6 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-[14px] font-semibold text-paper leading-snug">{q}</span>
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
              <p className="text-[13px] text-paper/55 leading-relaxed pt-4">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FAQPage() {
  const [search, setSearch] = useState('');

  const filtered = faqs.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => q.q.toLowerCase().includes(search.toLowerCase()) ||
           q.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen bg-ink pt-24 pb-20" style={font}>
      <div className="max-w-3xl mx-auto px-5">

        <div className="text-center mb-12">
          <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">FAQ</div>
          <h1 className="text-[32px] font-black text-paper mb-4">Frequently Asked Questions</h1>
          <p className="text-[14px] text-paper/45 max-w-lg mx-auto">
            Everything you need to know about renting, listing, and transacting safely on Handova.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[14px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-paper/30">No questions found for "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-4 text-gold text-[13px] font-semibold">
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map(cat => (
              <div key={cat.category}>
                <h2 className="text-[11px] font-bold text-gold uppercase tracking-widest mb-4">
                  {cat.category}
                </h2>
                <div className="space-y-2">
                  {cat.questions.map((item, i) => (
                    <FAQItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 bg-ink border border-white/6 rounded-2xl p-8 text-center">
          <h3 className="text-[18px] font-bold text-paper mb-2">Still have questions?</h3>
          <p className="text-[13px] text-paper/45 mb-6">
            Our support team is available Monday to Friday, 9am to 6pm WAT.
          </p>
          
          <a
            href="mailto:joinrenteasy@gmail.com"
            className="inline-flex items-center gap-2 bg-gold text-black px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
          >
            Email Us
          </a>
        </div>
      </div>
    </div>
  );
}