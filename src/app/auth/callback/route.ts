import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error || errorDescription) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', error || 'oauth_error');
    if (errorDescription) loginUrl.searchParams.set('error_description', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return the user to login with an error
  return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', requestUrl.origin));
}
