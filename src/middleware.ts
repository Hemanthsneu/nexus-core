import { type NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabase } from '@/lib/supabase/middleware';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const PUBLIC_PATHS = ['/login', '/api/'];
const STATIC_PREFIXES = ['/_next/', '/favicon.ico'];

function isPublic(pathname: string): boolean {
  return (
    STATIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  );
}

export async function middleware(request: NextRequest) {
  // Static assets and API routes: skip auth check, just add headers
  if (STATIC_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))) {
    const res = NextResponse.next();
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      res.headers.set(key, value);
    }
    return res;
  }

  // Refresh the Supabase session (keeps cookies alive)
  const { user, response } = await createMiddlewareSupabase(request);

  // Add security headers to every response
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Public paths: allow through
  if (isPublic(request.nextUrl.pathname)) {
    // If user is already logged in and visits /login, redirect to dashboard
    if (request.nextUrl.pathname === '/login' && user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // Protected paths: require auth
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
