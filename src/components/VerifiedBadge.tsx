import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  status?: string;
  size?: number;
  variant?: 'business' | 'identity';
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  status,
  size = 14,
  variant,
  className = '',
}) => {
  if (status !== 'verified') return null;

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      title={variant === 'identity' ? 'Identity verified' : variant === 'business' ? 'Business verified' : 'Verified account'}
    >
      <BadgeCheck
        className={variant === 'identity' ? 'text-white/40 fill-white/40' : 'text-gold fill-gold'}
        size={size}
        strokeWidth={2.5}
        style={{ color: '#0B0D10' }}
      />
    </span>
  );
};