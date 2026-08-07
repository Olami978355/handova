import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  status?: string;
  size?: number;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  status,
  size = 14,
  className = '',
}) => {
  if (status !== 'verified') return null;

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      title="Verified account"
    >
      <BadgeCheck
        className="text-gold fill-gold"
        size={size}
        strokeWidth={2.5}
        style={{ color: '#0B0D10' }}
      />
    </span>
  );
};