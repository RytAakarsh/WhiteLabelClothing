import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from './config';

export { getPublicSupabaseConfig };

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const { url, key } = getPublicSupabaseConfig();

  // In the browser, reuse the client singleton across re-renders
  if (typeof window !== 'undefined') {
    if (!browserClient) {
      browserClient = createBrowserClient(url, key);
    }
    return browserClient;
  }

  return createBrowserClient(url, key);
}
