// ============================================================================
// i18n Middleware - Dropship Luxe
// ============================================================================
// Handles locale detection and URL rewriting for internationalization
// ============================================================================

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

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
