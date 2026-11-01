import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminSupabaseConfig } from '@/lib/supabase/config';
import { User } from '@supabase/supabase-js';
import { ADMIN_EMAIL, APPROVED_ADMIN_EMAILS, isAllowedAdminEmail } from './constants';

export { ADMIN_EMAIL, APPROVED_ADMIN_EMAILS, isAllowedAdminEmail };

export interface AdminAuthSuccess {
  authorized: true;
  user: User;
  client: any;
  isServiceRole: boolean;
}

export interface AdminAuthFailure {
  authorized: false;
  status: 401 | 403;
  error: string;
  user: User | null;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/**
 * Standardized server-side verification of administrator privileges.
 * 
 * Returns explicit status codes:
 * - 401 if user is unauthenticated
 * - 403 if user is authenticated but not an authorized administrator
 * - 200 (authorized: true) with appropriate database client if authorized
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Authenticated session required.',
        user: null,
      };
    }

    const isEmailAdmin = isAllowedAdminEmail(user.email);
    let hasAdminRole = false;

    // Check user_roles using the authenticated SSR client (auth.uid() satisfies RLS)
    try {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userRole && userRole.role === 'admin') {
        hasAdminRole = true;
      }
    } catch (err) {
      console.warn('[verifyAdmin] Authenticated user_roles check warning:', err);
    }

    // Also inspect via admin client if service role key is available
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
    } catch {
      // Fallback mode: ignore
    }

    // Deny access if neither email nor role qualifies
    if (!isEmailAdmin && !hasAdminRole) {
      console.warn(
        `[Admin Auth] Access denied for user: ${user.id} (${user.email || 'no-email'}) - Lacks administrator privileges.`
      );
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden. Admin privileges required.',
        user,
      };
    }

    // Select the best client for administrative operations:
    // If service role key is available, use adminClient (bypasses RLS).
    // Otherwise, use authenticated SSR client where auth.uid() satisfies is_admin() RLS!
    const effectiveClient = isServiceRole && adminClient ? adminClient : supabase;

    return {
      authorized: true,
      user,
      client: effectiveClient,
      isServiceRole,
    };
  } catch (err: any) {
    console.error('[verifyAdmin] Exception during authorization check:', err);
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden. Admin verification error.',
      user: null,
    };
  }
}

export interface AdminVerificationResult {
  user: User;
  client: any;
  isServiceRole: boolean;
}

/**
 * Backward-compatible helper for existing admin route handlers.
 * Returns null if unauthorized, or { user, client, isServiceRole } if authorized.
 */
export async function verifyAdminSession(): Promise<AdminVerificationResult | null> {
  const result = await verifyAdmin();
  if (!result.authorized) {
    return null;
  }
  return {
    user: result.user,
    client: result.client,
    isServiceRole: result.isServiceRole,
  };
}
