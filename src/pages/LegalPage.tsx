import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, FileText, RefreshCw, Lock } from 'lucide-react';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const sections = [
  {
    id: 'terms',
    icon: FileText,
    title: 'Terms of Service',
    lastUpdated: 'January 1, 2025',
    content: [
      {
        heading: '1. Acceptance of Terms',
        body: `By accessing or using RentEasy Nigeria ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms apply to all users including tenants, landlords, agents, and visitors.`
      },
      {
        heading: '2. Description of Service',
        body: `RentEasy Nigeria is an online real estate marketplace that connects tenants with landlords and agents. We provide an escrow-based payment system to protect both parties during property transactions. We are not a real estate agency and do not own any of the listed properties.`
      },
      {
        heading: '3. User Accounts',
        body: `You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years old to use this platform. RentEasy reserves the right to suspend or terminate accounts that violate these terms.`
      },
      {
        heading: '4. Landlord and Agent Obligations',
        body: `Landlords and agents must provide accurate property information including location, size, amenities, and price. All images and videos must be genuine representations of the property. NIN verification is required before listings go live. Misrepresentation of property details is grounds for immediate account termination and legal action.`
      },
      {
        heading: '5. Tenant Obligations',
        body: `Tenants must use the platform in good faith. Inspection bookings must be honored or cancelled at least 24 hours in advance. Tenants must not attempt to bypass the escrow system to make direct payments. False dispute claims may result in account suspension.`
      },
      {
        heading: '6. Platform Fees',
        body: `RentEasy charges a 2% platform fee on all escrow transactions. This fee is deducted from the total amount before funds are disbursed. Agent commission (typically 10%) is agreed upon between the agent and property owner and is separate from the platform fee. Inspection fees are non-refundable except as outlined in our Refund Policy.`
      },
      {
        heading: '7. Prohibited Activities',
        body: `Users must not: post false or misleading property listings, engage in fraudulent transactions, harass or threaten other users, attempt to hack or disrupt the platform, use the platform for money laundering or any illegal activity, or create multiple accounts to circumvent suspensions.`
      },
      {
        heading: '8. Limitation of Liability',
        body: `RentEasy Nigeria is a marketplace platform and is not liable for disputes between landlords and tenants beyond what is covered by our escrow policy. We are not responsible for the physical condition of properties. Our liability in any dispute is limited to the amount held in escrow.`
      },
      {
        heading: '9. Governing Law',
        body: `These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Lagos State, Nigeria. By using this platform you consent to the jurisdiction of Nigerian courts.`
      },
      {
        heading: '10. Changes to Terms',
        body: `RentEasy reserves the right to modify these terms at any time. Users will be notified of significant changes via email. Continued use of the platform after changes constitutes acceptance of the new terms.`
      },
    ]
  },
  {
    id: 'privacy',
    icon: Lock,
    title: 'Privacy Policy',
    lastUpdated: 'January 1, 2025',
    content: [
      {
        heading: '1. Information We Collect',
        body: `We collect information you provide directly including: full name, email address, phone number, National Identification Number (NIN) for verification, bank account details for payouts, property information for landlords and agents, and profile photos. We also collect usage data including IP addresses, browser type, pages visited, and transaction history.`
      },
      {
        heading: '2. How We Use Your Information',
        body: `We use your information to: verify your identity and prevent fraud, process transactions and disbursements, send notifications about bookings and deals, improve our platform and user experience, comply with Nigerian law including the Data Protection Act 2023 (NDPA), and communicate important updates about your account.`
      },
      {
        heading: '3. NIN Data Handling',
        body: `Your National Identification Number is collected solely for identity verification purposes. NIN data is encrypted at rest and in transit. We do not share NIN data with third parties except where required by Nigerian law. NIN data is retained for the duration of your account and deleted within 90 days of account closure.`
      },
      {
        heading: '4. Data Sharing',
        body: `We do not sell your personal data. We may share data with: payment processors (Paystack) for transaction processing, identity verification services for NIN checks, law enforcement when required by Nigerian law, and service providers who assist in platform operations under strict confidentiality agreements.`
      },
      {
        heading: '5. Data Security',
        body: `We implement industry-standard security measures including SSL encryption, secure database storage via Supabase, row-level security policies, and regular security audits. Despite these measures, no system is 100% secure and we cannot guarantee absolute security.`
      },
      {
        heading: '6. Your Rights Under NDPA 2023',
        body: `Under the Nigeria Data Protection Act 2023, you have the right to: access your personal data, correct inaccurate data, request deletion of your data, object to processing of your data, and lodge complaints with the Nigeria Data Protection Commission (NDPC). To exercise these rights, contact us at joinrenteasy@gmail.com.`
      },
      {
        heading: '7. Cookies',
        body: `We use essential cookies to maintain your session and preferences. We do not use advertising or tracking cookies. You can disable cookies in your browser settings but this may affect platform functionality.`
      },
      {
        heading: '8. Data Retention',
        body: `We retain your data for as long as your account is active. Transaction records are kept for 7 years as required by Nigerian financial regulations. After account deletion, personal data is removed within 90 days except where retention is legally required.`
      },
    ]
  },
  {
    id: 'refund',
    icon: RefreshCw,
    title: 'Refund Policy',
    lastUpdated: 'January 1, 2025',
    content: [
      {
        heading: '1. Inspection Fee Refunds',
        body: `Inspection fees are partially refundable based on the outcome of your inspection visit. The following refund schedule applies:`
      },
      {
        heading: '100% Refund Cases',
        body: `You receive a full refund of your inspection fee if: the property is significantly different from what was advertised, the landlord or agent cancels or fails to show up for the inspection, another tenant completes an escrow deal for the property before your inspection, or the property is found to be uninhabitable.`
      },
      {
        heading: '70% Refund Cases',
        body: `You receive 70% of your inspection fee if: you inspect the property and decide not to proceed for any personal reason, the property matches the listing but does not meet your expectations, or you choose a different property on the platform.`
      },
      {
        heading: '0% Refund Cases',
        body: `No refund is issued if: you book an inspection but fail to show up without cancelling at least 24 hours in advance, you have already entered into an escrow deal for the property, or your account is suspended for violating our terms of service.`
      },
      {
        heading: '2. Escrow Payment Refunds',
        body: `Escrow payments are held securely until move-in is confirmed. Refunds of escrow funds are issued if: the landlord fails to provide the property as described, a legitimate dispute is resolved in the tenant's favour by our moderation team, the deal is cancelled before the agreement signing stage, or the property becomes unavailable through no fault of the tenant.`
      },
      {
        heading: '3. Refund Processing Time',
        body: `Approved refunds are processed within 5-7 business days to your original payment method. Paystack processing times may add an additional 1-3 business days. RentEasy is not liable for delays caused by your bank or payment provider.`
      },
      {
        heading: '4. How to Request a Refund',
        body: `To request a refund, contact us at joinrenteasy@gmail.com with your booking or deal reference number, the reason for your refund request, and any supporting evidence. Our team will review your request within 48 hours.`
      },
      {
        heading: '5. Platform Fee',
        body: `The 2% platform fee is non-refundable once an escrow transaction has been initiated. This fee covers the cost of our escrow service, payment processing, and platform operations.`
      },
    ]
  },
  {
    id: 'escrow',
    icon: Shield,
    title: 'Escrow Agreement',
    lastUpdated: 'January 1, 2025',
    content: [
      {
        heading: '1. What is Escrow?',
        body: `Escrow is a financial arrangement where a neutral third party (RentEasy Nigeria) holds funds on behalf of two parties in a transaction until specific conditions are met. This protects both the tenant and the landlord/agent during property rental transactions.`
      },
      {
        heading: '2. How RentEasy Escrow Works',
        body: `When a tenant accepts a deal offer: the tenant pays the agreed rent amount plus 2% platform fee into escrow via Paystack, funds are held securely by RentEasy, the landlord or agent uploads the tenancy agreement, both parties sign the agreement, the tenant moves in and confirms move-in on the platform, RentEasy releases the funds to the landlord or agent within 24 hours of move-in confirmation.`
      },
      {
        heading: '3. Parties to the Escrow',
        body: `Depositor (Tenant): The party who deposits funds into escrow. Beneficiary (Landlord/Agent): The party who receives funds after conditions are met. Escrow Agent (RentEasy Nigeria): The neutral party that holds and disburses funds according to this agreement.`
      },
      {
        heading: '4. Conditions for Fund Release',
        body: `Funds are released to the beneficiary when: the tenant confirms they have successfully moved into the property, the move-in confirmation is not disputed within 24 hours, or the RentEasy moderation team approves release after dispute resolution.`
      },
      {
        heading: '5. Dispute Resolution',
        body: `If a dispute is raised: both parties submit their evidence through the platform, the RentEasy moderation team reviews all evidence within 3-5 business days, a decision is made and funds are either released to the beneficiary or refunded to the tenant, decisions by the moderation team are final and binding.`
      },
      {
        heading: '6. Escrow Fees',
        body: `RentEasy charges 2% of the total transaction amount as an escrow fee. This is paid by the tenant and deducted before disbursement to the beneficiary. There are no hidden charges beyond the agreed amount and platform fee.`
      },
      {
        heading: '7. Prohibited Escrow Transactions',
        body: `The escrow service cannot be used for: outright property purchases above ₦50,000,000 without prior approval, transactions involving parties outside Nigeria, properties that are subject to legal disputes or court orders, or any transaction that violates Nigerian law.`
      },
      {
        heading: '8. Liability',
        body: `RentEasy's liability as escrow agent is limited to the amount held in escrow. We are not liable for: loss of rental income, property damage, personal injury, or any consequential damages arising from the transaction. We act solely as a neutral holder of funds.`
      },
      {
        heading: '9. Regulatory Compliance',
        body: `RentEasy Nigeria operates in compliance with the Central Bank of Nigeria (CBN) guidelines on electronic payments, the Federal Competition and Consumer Protection Act (FCCPA), and the Nigeria Data Protection Act (NDPA) 2023. Our payment processing is handled by Paystack, a CBN-licensed payment company.`
      },
    ]
  },
];

export default function LegalPage() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('terms');

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && sections.find(s => s.id === hash)) {
      setActiveSection(hash);
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.hash]);

  const active = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="min-h-screen bg-ink pt-24 pb-20" style={font}>
      <div className="max-w-6xl mx-auto px-5">

        {/* Header */}
        <div className="mb-10">
          <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">Legal</div>
          <h1 className="text-[32px] font-black text-paper mb-3">Legal Documents</h1>
          <p className="text-[14px] text-paper/45 max-w-xl">
            Please read these documents carefully. By using RentEasy Nigeria you agree to all terms outlined below.
          </p>
        </div>

        <div className="flex gap-8 flex-col lg:flex-row">

          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-ink border border-white/6 rounded-2xl p-4 lg:sticky lg:top-24">
              <p className="text-[10px] font-bold text-paper/30 uppercase tracking-widest mb-3 px-2">Documents</p>
              <div className="space-y-1">
                {sections.map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        window.history.pushState(null, '', `#${section.id}`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-left ${
                        activeSection === section.id
                          ? 'bg-gold text-paper'
                          : 'text-paper/50 hover:bg-white/5 hover:text-paper'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {section.title}
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
                <div className="w-12 h-12 bg-gold/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <active.icon className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h2 className="text-[22px] font-black text-paper">{active.title}</h2>
                  <p className="text-[12px] text-paper/30 mt-1">Last updated: {active.lastUpdated}</p>
                </div>
              </div>

              <div className="space-y-6">
                {active.content.map((item, i) => (
                  <div key={i}>
                    <h3 className="text-[14px] font-bold text-gold mb-2">{item.heading}</h3>
                    <p className="text-[13px] text-paper/55 leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-white/5">
                <p className="text-[12px] text-paper/25 leading-relaxed">
                  Questions about this document? Contact us at{' '}
                  <a href="mailto:joinrenteasy@gmail.com" className="text-gold/70 hover:text-gold transition-colors">
                    joinrenteasy@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}