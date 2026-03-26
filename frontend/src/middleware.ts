// ============================================================================
// MIDDLEWARE - i18n + Authentication
// ============================================================================
// Handles locale detection, URL rewriting, and protected routes
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// ============================================================================
// i18n Middleware Instance
// ============================================================================

const intlMiddleware = createMiddleware(routing);

// ============================================================================
// Protected Routes Configuration
// ============================================================================

const protectedPaths = ['/account', '/account/orders', '/account/addresses', '/account/settings'];
const authPaths = ['/account/login', '/account/register'];

// ============================================================================
// Middleware Function
// ============================================================================

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for admin routes (not localized)
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Extract potential locale from path
  const localeMatch = pathname.match(/^\/(fr|en|es|it|de)/);
  const locale = localeMatch ? localeMatch[1] : 'fr';
  const pathWithoutLocale = localeMatch
    ? pathname.replace(/^\/(fr|en|es|it|de)/, '') || '/'
    : pathname;

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(
    (path) => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
  );

  // Check if the path is an auth path
  const isAuthPath = authPaths.some(
    (path) => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
  );

  // Get session token from cookies
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value;

  const isAuthenticated = !!sessionToken;

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL(`/${locale}/account/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/account`, request.url));
  }

  // Apply i18n middleware for all other routes
  return intlMiddleware(request);
}

// ============================================================================
// Middleware Configuration
// ============================================================================

export const config = {
  // Match all pathnames except for:
  // - API routes
  // - Static files (images, fonts, etc.)
  // - Next.js internals
  matcher: [
    '/',
    '/(fr|en|es|it|de)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
