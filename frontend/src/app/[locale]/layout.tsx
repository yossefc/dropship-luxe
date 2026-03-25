import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { locales, type Locale, localeSeoConfig } from '@/i18n/config';
import { CartProvider } from '@/components/cart/cart-provider';

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Dynamic metadata based on locale
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<Locale, string> = {
    fr: 'Dropship Luxe | Beauté Haut de Gamme',
    en: 'Dropship Luxe | Premium Beauty',
    es: 'Dropship Luxe | Belleza de Alta Gama',
    it: 'Dropship Luxe | Bellezza di Alta Gamma',
    de: 'Dropship Luxe | Premium Schönheit',
  };

  const descriptions: Record<Locale, string> = {
    fr: 'Découvrez notre sélection exclusive de produits de beauté haut de gamme. Livraison offerte dès 50€.',
    en: 'Discover our exclusive selection of premium beauty products. Free delivery on orders over £50.',
    es: 'Descubre nuestra selección exclusiva de productos de belleza de alta gama. Envío gratuito a partir de 50€.',
    it: 'Scopri la nostra selezione esclusiva di prodotti di bellezza di alta gamma. Spedizione gratuita da 50€.',
    de: 'Entdecken Sie unsere exklusive Auswahl an Premium-Schönheitsprodukten. Kostenloser Versand ab 50€.',
  };

  const keywords: Record<Locale, string[]> = {
    fr: ['beauté', 'luxe', 'cosmétiques', 'skincare', 'maquillage', 'soins visage'],
    en: ['beauty', 'luxury', 'cosmetics', 'skincare', 'makeup', 'facial care'],
    es: ['belleza', 'lujo', 'cosmética', 'skincare', 'maquillaje', 'cuidado facial'],
    it: ['bellezza', 'lusso', 'cosmetici', 'skincare', 'trucco', 'cura del viso'],
    de: ['Schönheit', 'Luxus', 'Kosmetik', 'Hautpflege', 'Make-up', 'Gesichtspflege'],
  };

  const currentLocale = locale as Locale;
  const seoConfig = localeSeoConfig[currentLocale];

  return {
    title: {
      default: titles[currentLocale],
      template: `%s | Dropship Luxe`,
    },
    description: descriptions[currentLocale],
    keywords: keywords[currentLocale],
    openGraph: {
      title: titles[currentLocale],
      description: descriptions[currentLocale],
      locale: seoConfig.hreflang,
      type: 'website',
    },
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [localeSeoConfig[l].hreflang, `/${l}`])
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}): Promise<JSX.Element> {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Load messages for the current locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <CartProvider>
        {children}
      </CartProvider>
    </NextIntlClientProvider>
  );
}
