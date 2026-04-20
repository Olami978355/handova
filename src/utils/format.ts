export const formatNaira = (n: number) => 
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);

export const abbreviatePrice = (n: number) => {
  if (n >= 1000000) {
    return `₦${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (n >= 1000) {
    return `₦${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `₦${n}`;
};

export const AGENT_FEE_PERCENTAGE = 0.10;

export const calculateAgentFee = (price: number) => price * AGENT_FEE_PERCENTAGE;
export const calculateTotalWithFee = (price: number) => price + calculateAgentFee(price);

export const formatRelativeTime = (date: string | number | Date) => {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return then.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};
