import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amounts stored in paise as Indian Rupees (INR)
 * e.g., 299900 paise -> "₹2,999"
 */
export function formatPrice(paise: number): string {
  if (isNaN(paise) || paise === null || paise === undefined) return '₹0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Calculate percentage discount from original price and selling price
 */
export function calculateDiscountPercentage(basePrice: number, compareAtPrice: number | null): number {
  if (!compareAtPrice || compareAtPrice <= basePrice) return 0;
  return Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100);
}
