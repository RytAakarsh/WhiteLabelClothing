import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/utils';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next') || '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Determine canonical base URL
  const isLocalhostRequest =
    requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  const baseUrl = isLocalhostRequest ? requestUrl.origin : getAppUrl();

  // Sanitize next destination: strip any localhost scheme if not in dev
  let safeNext = nextParam;
  if (safeNext.startsWith('http://localhost') || safeNext.startsWith('https://localhost')) {
    try {
      const parsed = new URL(safeNext);
      safeNext = parsed.pathname + parsed.search + parsed.hash;
    } catch {
      safeNext = '/';
    }
  }
  // Ensure relative path starting with /
  if (!safeNext.startsWith('/')) {
    safeNext = '/';
  }

  if (error || errorDescription) {
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('error', error || 'oauth_error');
    if (errorDescription) loginUrl.searchParams.set('error_description', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(new URL(safeNext, baseUrl));
    }
    console.error('[OAuth Callback] Code exchange error:', exchangeError.message);
  }

  // Return the user to login with an error
  return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', baseUrl));
}
