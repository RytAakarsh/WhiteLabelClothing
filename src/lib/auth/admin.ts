import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminSupabaseConfig } from '@/lib/supabase/config';
import { User } from '@supabase/supabase-js';

export const ADMIN_EMAIL = 'info.whitelabelclothing@gmail.com';

export interface AdminVerificationResult {
  user: User;
  client: any; // Supabase client authorized for admin operations
  isServiceRole: boolean;
}

/**
 * Robust server-side verification of administrator privileges.
 * Verifies authenticated session from cookies and checks admin role
 * via database user_roles, official admin email, and RLS policies.
 */
export async function verifyAdminSession(): Promise<AdminVerificationResult | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const isOfficialAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Check user_roles using authenticated client
    let hasAdminRole = false;

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userRole && userRole.role === 'admin') {
      hasAdminRole = true;
    }

    // Also check via admin client if available
    let adminClient: any = null;
    let isServiceRole = false;
    try {
      const config = getAdminSupabaseConfig();
      isServiceRole = !config.isFallback;
      adminClient = createAdminClient();

      if (isServiceRole && !hasAdminRole) {
        const { data: serviceRoleData } = await adminClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (serviceRoleData && serviceRoleData.role === 'admin') {
          hasAdminRole = true;
        }
      }
    } catch (err) {
      // Ignore admin client creation issues if fallback
    }

    // Grant access if official admin email or has admin role in database
    if (!isOfficialAdminEmail && !hasAdminRole) {
      return null;
    }

    // Select the best client for administrative mutations:
    // If service role key is active, use adminClient (full bypass).
    // Otherwise, use authenticated supabase client where auth.uid() satisfies is_admin() RLS!
    const effectiveClient = isServiceRole && adminClient ? adminClient : supabase;

    return {
      user,
      client: effectiveClient,
      isServiceRole,
    };
  } catch (err) {
    console.error('[verifyAdminSession] Exception during authorization check:', err);
    return null;
  }
}
