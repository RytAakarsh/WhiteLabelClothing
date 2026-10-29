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

export function getAdminSupabaseConfig(): { url: string; serviceRoleKey: string; isFallback: boolean } {
  const { url, key } = getPublicSupabaseConfig();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!serviceRoleKey) {
    console.warn(
      `[Supabase Configuration Warning]: Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).\n` +
      `Falling back to public anonymous key for server queries. Some admin metrics may be restricted by RLS.\n` +
      `To enable full admin bypass, set SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages dashboard (Settings > Environment variables).`
    );
    return { url, serviceRoleKey: key, isFallback: true };
  }

  return { url, serviceRoleKey, isFallback: false };
}
