import { createClient } from '@supabase/supabase-js';
import { getAdminSupabaseConfig } from './config';

export function createAdminClient() {
  const { url, serviceRoleKey } = getAdminSupabaseConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
