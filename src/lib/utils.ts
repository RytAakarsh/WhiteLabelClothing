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

/**
 * Canonical Application URL Resolver
 * Resolves the absolute base URL based on runtime environment:
 * - Production: https://www.whitelabelclothing.in
 * - Development: http://localhost:3000 (strictly when running on localhost)
 */
export function getAppUrl(): string {
  // 1. In browser environment:
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin;
    }
    if (origin.includes('whitelabelclothing.in')) {
      return 'https://www.whitelabelclothing.in';
    }
    return origin;
  }

  // 2. In server / edge environment:
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return 'https://www.whitelabelclothing.in';
}
