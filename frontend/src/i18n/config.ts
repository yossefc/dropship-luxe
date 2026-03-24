// ============================================================================
// i18n Configuration - Dropship Luxe
// ============================================================================
// Supported locales and default settings for internationalization
// ============================================================================

export const locales = ['fr', 'en', 'es', 'it', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  de: 'Deutsch',
};

export const localeFlags: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  it: '🇮🇹',
  de: '🇩🇪',
};

// SEO: Language-specific meta configurations
export const localeSeoConfig: Record<Locale, {
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  hreflang: string;
}> = {
  fr: {
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd/MM/yyyy',
    hreflang: 'fr-FR',
  },
  en: {
    currency: 'GBP',
    currencySymbol: '£',
    dateFormat: 'MM/dd/yyyy',
    hreflang: 'en-GB',
  },
  es: {
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd/MM/yyyy',
    hreflang: 'es-ES',
  },
  it: {
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd/MM/yyyy',
    hreflang: 'it-IT',
  },
  de: {
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'dd.MM.yyyy',
    hreflang: 'de-DE',
  },
};
