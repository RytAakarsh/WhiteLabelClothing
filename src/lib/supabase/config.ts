/**
 * Supabase Configuration Resolver for White Label Clothing
 *
 * Standardizes environment variables across browser, server, and administrative contexts.
 * Supports modern NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY while retaining backward
 * compatibility with NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

export function getPublicSupabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Standardize on NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!key) {
      missing.push(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
      );
    }

    throw new Error(
      `[Supabase Configuration Error]: Missing required environment variable(s): ${missing.join(', ')}.\n` +
      `Please configure these in your Cloudflare Pages dashboard (Settings > Environment variables) for both Production and Preview environments, or in your .env.local file.\n` +
      `Target Supabase project URL: https://qtvzxezxyzsvgbauyytt.supabase.co`
    );
  }

  return { url, key };
}

export function getAdminSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const { url } = getPublicSupabaseConfig();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      `[Supabase Configuration Error]: Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).\n` +
      `This privileged key is required for server-side admin operations and must NOT be exposed to the browser.\n` +
      `Please configure SUPABASE_SERVICE_ROLE_KEY in your Cloudflare Pages environment variables (or .env.local for local testing).`
    );
  }

  return { url, serviceRoleKey };
}
