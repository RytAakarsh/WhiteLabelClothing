import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Enforce canonical www domain in production to prevent PKCE cookie isolation between apex and www
  if (host === 'whitelabelclothing.in') {
    const url = request.nextUrl.clone();
    url.host = 'www.whitelabelclothing.in';
    url.port = '';
    url.protocol = 'https:';
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|images/).*)',
  ],
};
