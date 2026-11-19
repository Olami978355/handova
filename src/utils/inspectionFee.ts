/**
 * Calculates the inspection fee for a property based on its price and type.
 * 
 * BUG FIX 9: Specific calculation logic for sale and rent properties.
 * Rounded to the nearest 100 Naira.
 */
export const calculateInspectionFee = (
  price: number,
  period: string | null,
  listingType: string,
  transactionType: string
): number => {
  let fee = 0;

  if (transactionType === 'sell' || listingType === 'land') {
    // Sale properties and land: flat fee capped at ₦15,000
    fee = Math.min(Math.max(price * 0.001, 2000), 15000);
  } else {
    // Rent: calculate annual equivalent first
    let annual = price;
    if (period === 'monthly') annual = price * 12;
    if (period === 'nightly') annual = price * 365;
    if (period === 'yearly') annual = price;
    
    fee = annual * 0.01;
    fee = Math.min(Math.max(fee, 2000), 15000);
  }

  // Round to nearest 100
  return Math.round(fee / 100) * 100;
};

/**
 * BUG FIX 3: Converts Naira to Kobo for Paystack API.
 * Always use this helper for Paystack amounts.
 */
export const toKobo = (naira: number): number => {
  return Math.round(naira * 100);
};

/**
 * Formats a fee amount as a Naira string.
 */
export const formatFee = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Company listings charge the company's own fee (0 = free inspection).
 * Everyone else keeps the standard formula.
 */
export const getInspectionFee = (property: {
  price: number;
  price_period?: string | null;
  listing_type: string;
  transaction_type: string;
  company_id?: string | null;
  inspection_fee?: number | null;
}): number => {
  if (property.company_id) return Math.max(0, Number(property.inspection_fee) || 0);
  return calculateInspectionFee(
    property.price,
    property.price_period || null,
    property.listing_type,
    property.transaction_type
  );
};
