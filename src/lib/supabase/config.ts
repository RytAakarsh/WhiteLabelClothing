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

export interface ServiceRoleDiagnostic {
  hasKey: boolean;
  keyName: string | null;
  isValid: boolean;
  mode: 'service_role_privileged' | 'authenticated_admin_rls' | 'restricted';
  message: string;
}

export function getAdminSupabaseConfig(): { url: string; serviceRoleKey: string; isFallback: boolean; keyName: string | null } {
  const { url, key } = getPublicSupabaseConfig();
  
  // Inspect all standard naming conventions for the service role key
  const keyMap: Record<string, string | undefined> = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SERVICE_ROLE_KEY: process.env.SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  };

  let matchedKeyName: string | null = null;
  let serviceRoleKey: string | undefined = undefined;

  for (const [name, val] of Object.entries(keyMap)) {
    if (val && val.trim().length > 0) {
      matchedKeyName = name;
      serviceRoleKey = val.trim();
      break;
    }
  }

  if (!serviceRoleKey) {
    return { url, serviceRoleKey: key, isFallback: true, keyName: null };
  }

  return { url, serviceRoleKey, isFallback: false, keyName: matchedKeyName };
}
