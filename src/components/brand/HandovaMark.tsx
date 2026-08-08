import React from 'react';
import { motion } from 'framer-motion';

interface WatermarkLogoProps {
  className?: string;
  size?: number;
}

/**
 * Shared Handova brand mark (H + key motif).
 * Extracted from the inline SVG duplicated across Login.tsx, Navbar.tsx,
 * Footer.tsx, SignupPage.tsx, ForgotPasswordPage.tsx, ResetPasswordPage.tsx,
 * and AdminDashboard.tsx — this is the canonical source going forward.
 * `WatermarkLogo` is the large decorative variant (used as a faint
 * background watermark); pass `className` for positioning/opacity/color.
 */
export const WatermarkLogo: React.FC<WatermarkLogoProps> = ({ className = '', size = 400 }) => (
  <svg
    width={size}
    height={size}
    viewBox="-60 -85 120 170"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path d="M-50 -70 L-20 -55 L-20 55 L-50 70 Z" fill="currentColor" />
    <path d="M50 -70 L20 -55 L20 55 L50 70 Z" fill="currentColor" />
    <circle cx="-32" cy="0" r="17" fill="none" stroke="currentColor" strokeWidth="9" />
    <rect x="-15" y="-4.5" width="35" height="9" fill="currentColor" />
    <rect x="10" y="4.5" width="8" height="10" fill="currentColor" />
    <rect x="22" y="4.5" width="8" height="10" fill="currentColor" />
  </svg>
);

export default WatermarkLogo;

interface HandovaLogoProps {
  size?: number;
  className?: string;
  animateKey?: boolean;
}

/**
 * Compact H + key mark for headers/navbars. Uses currentColor like
 * WatermarkLogo above, so color comes from the parent's text color
 * (defaults to text-gold here since that's how it's used everywhere).
 * Pass animateKey to slide the key element into place on mount, once
 * per app load, since Navbar stays mounted across route changes.
 */
export const HandovaLogo: React.FC<HandovaLogoProps> = ({ size = 32, className = 'text-gold', animateKey = false }) => (
  <svg width={size} height={size} viewBox="-60 -85 120 170" fill="none" className={className}>
    <path d="M-50 -70 L-20 -55 L-20 55 L-50 70 Z" fill="currentColor" />
    <path d="M50 -70 L20 -55 L20 55 L50 70 Z" fill="currentColor" />
    {animateKey ? (
      <KeySlide />
    ) : (
      <>
        <circle cx="-32" cy="0" r="17" fill="none" stroke="currentColor" strokeWidth="9" />
        <rect x="-15" y="-4.5" width="35" height="9" fill="currentColor" />
        <rect x="10" y="4.5" width="8" height="10" fill="currentColor" />
        <rect x="22" y="4.5" width="8" height="10" fill="currentColor" />
      </>
    )}
  </svg>
);

function KeySlide() {
  return (
    <motion.g
      initial={{ x: -90, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.15 }}
    >
      <circle cx="-32" cy="0" r="17" fill="none" stroke="currentColor" strokeWidth="9" />
      <rect x="-15" y="-4.5" width="35" height="9" fill="currentColor" />
      <rect x="10" y="4.5" width="8" height="10" fill="currentColor" />
      <rect x="22" y="4.5" width="8" height="10" fill="currentColor" />
    </motion.g>
  );
}
