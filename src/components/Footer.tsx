import React from 'react';
import { Link } from 'react-router-dom';

const HandovaLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="-60 -85 120 170" fill="none">
    <path d="M-50 -70 L-20 -55 L-20 55 L-50 70 Z" fill="#D4AF37" />
    <path d="M50 -70 L20 -55 L20 55 L50 70 Z" fill="#D4AF37" />
    <circle cx="-32" cy="0" r="17" fill="none" stroke="#D4AF37" strokeWidth="9" />
    <rect x="-15" y="-4.5" width="35" height="9" fill="#D4AF37" />
    <rect x="10" y="4.5" width="8" height="10" fill="#D4AF37" />
    <rect x="22" y="4.5" width="8" height="10" fill="#D4AF37" />
  </svg>
);

const legalLinks = [
  { label: 'Privacy', path: '/legal#privacy' },
  { label: 'Terms', path: '/legal#terms' },
  { label: 'Refund Policy', path: '/legal#refund' },
  { label: 'Escrow Agreement', path: '/legal#escrow' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
];

export default function Footer() {
  return (
    <footer className="bg-[#060f09] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <HandovaLogo size={20} />
          <span className="text-[14px] font-bold tracking-tight text-white">
            Hand<span className="text-[#f0c040]">ova</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {legalLinks.map(({ label, path }) => (
            <Link
              key={label}
              to={path}
              className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <p className="text-[11px] text-white/25">
          © {new Date().getFullYear()} Handova Nigeria
        </p>
      </div>
    </footer>
  );
}
