// ============================================================================
// i18n Routing Configuration - Dropship Luxe
// ============================================================================
// Defines routing behavior for internationalized pages
// ============================================================================

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Only add prefix for non-default locale
});

// Export navigation utilities with locale awareness
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
