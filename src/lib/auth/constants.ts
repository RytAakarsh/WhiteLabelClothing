/**
 * Shared Administrator Constants and Allowlist Utilities
 * 
 * Pure JavaScript/TypeScript module safe for both Client and Server environments.
 * Contains no Next.js server-only imports (e.g. next/headers).
 */

export const ADMIN_EMAIL = 'info.whitelabelclothing@gmail.com';

export const APPROVED_ADMIN_EMAILS: string[] = [
  'info.whitelabelclothing@gmail.com',
  'aakarsh03mishra@gmail.com',
  'aakarshmishra93@gmail.com',
  'aakarshmishra03@gmail.com',
  'mishraakarsh0303@gmail.com',
];

/**
 * Validates an email address against official and configured administrator allowlists.
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();

  // 1. Static approved list
  if (APPROVED_ADMIN_EMAILS.some((e) => e.toLowerCase() === cleanEmail)) {
    return true;
  }

  // 2. Configured environment variables (ADMIN_EMAIL, ADMIN_EMAILS)
  const envAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (envAdmin && cleanEmail === envAdmin) {
    return true;
  }

  const envAdmins = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    : [];
  if (envAdmins.includes(cleanEmail)) {
    return true;
  }

  return false;
}
