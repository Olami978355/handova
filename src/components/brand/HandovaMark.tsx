import React from 'react';

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
