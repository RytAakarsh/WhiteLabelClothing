import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';
import { getAppUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next') || '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Determine canonical base URL
  const isLocalhostRequest =
    requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  const baseUrl = isLocalhostRequest ? requestUrl.origin : getAppUrl();

  // Sanitize next destination
  let safeNext = nextParam;
  if (safeNext.startsWith('http://localhost') || safeNext.startsWith('https://localhost')) {
    try {
      const parsed = new URL(safeNext);
      safeNext = parsed.pathname + parsed.search + parsed.hash;
    } catch {
      safeNext = '/';
    }
  }
  if (!safeNext.startsWith('/')) {
    safeNext = '/';
  }

  // Handle provider-level error (e.g. user cancelled Google consent)
  if (error || errorDescription) {
    console.warn(`[OAuth Callback] Provider returned error: ${error || 'unknown'} - ${errorDescription || 'no description'}`);
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('auth_error', 'google_access_denied');
    if (safeNext && safeNext !== '/') {
      loginUrl.searchParams.set('redirect', safeNext);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const redirectUrl = new URL(safeNext, baseUrl);
    const response = NextResponse.redirect(redirectUrl);
    const { url, key } = getPublicSupabaseConfig();

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            });
          });
        },
      },
    });

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data?.session) {
      console.info(`[OAuth Callback] Code exchange successful for user: ${data.user?.id || 'unknown'} -> redirecting to ${safeNext}`);
      return response;
    }

    console.error(`[OAuth Callback] Code exchange failed safely: ${exchangeError?.message || 'No session returned'}`);
  }

  // Return the user to login with a sanitized, friendly error code while preserving intended destination
  const errorLoginUrl = new URL('/login', baseUrl);
  errorLoginUrl.searchParams.set('auth_error', 'google_signin_failed');
  if (safeNext && safeNext !== '/') {
    errorLoginUrl.searchParams.set('redirect', safeNext);
  }
  return NextResponse.redirect(errorLoginUrl);
}
