// ============================================================================
// Root Page Redirect
// ============================================================================
// This page redirects to the locale-prefixed version via middleware.
// The actual home page content is in /[locale]/page.tsx
// ============================================================================

import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to French locale by default
  // The middleware will handle locale detection for proper routing
  redirect('/fr');
}
