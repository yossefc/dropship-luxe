// ============================================================================
// New Arrivals Page - Latest High-Score Products
// ============================================================================
// Displays the 12 latest imported products with score > 80
// Bento Grid layout for luxurious aesthetic
// ============================================================================

import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { locales, type Locale, localeSeoConfig } from '@/i18n/config';

// ============================================================================
// Types
// ============================================================================

interface NewArrivalsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

interface NewArrivalProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  images: string[];
  score: number;
  category: string;
  createdAt: string;
}

// ============================================================================
// Data Fetching
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function getNewArrivals(locale: string): Promise<NewArrivalProduct[]> {
  try {
    // Fetch products sorted by createdAt, filtered by score > 80
    const res = await fetch(
      `${API_URL}/products?locale=${locale}&sort=-createdAt&minScore=80&limit=12`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!res.ok) {
      console.error('Failed to fetch new arrivals:', res.status);
      return [];
    }

    const data = await res.json();

    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.sellingPrice,
      originalPrice: p.sellingPrice * 1.25,
      currency: p.currency || 'EUR',
      image: p.images?.[0] || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
      images: p.images || [],
      score: p.importScore || 0,
      category: p.category?.name || 'Beaute',
      createdAt: p.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    return [];
  }
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({ params }: NewArrivalsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'newArrivals' });
  const seoConfig = localeSeoConfig[locale as Locale];

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      locale: seoConfig?.hreflang || locale,
    },
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [
          localeSeoConfig[l].hreflang,
          `/${l}/new-arrivals`,
        ])
      ),
    },
  };
}

// ============================================================================
// Bento Grid Item Component
// ============================================================================

function BentoItem({
  product,
  locale,
  size = 'normal',
}: {
  product: NewArrivalProduct;
  locale: string;
  size?: 'large' | 'normal' | 'wide';
}) {
  const sizeClasses = {
    large: 'col-span-2 row-span-2',
    wide: 'col-span-2 row-span-1',
    normal: 'col-span-1 row-span-1',
  };

  const imageHeight = {
    large: 'h-[500px]',
    wide: 'h-[280px]',
    normal: 'h-[350px]',
  };

  return (
    <Link
      href={`/${locale}/products/${product.slug}`}
      className={`group relative overflow-hidden bg-stone-100 ${sizeClasses[size]}`}
    >
      {/* Product Image */}
      <div className={`relative w-full ${imageHeight[size]}`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes={size === 'large' ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 25vw'}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Score Badge */}
        {product.score >= 80 && (
          <div className="absolute top-4 left-4 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 tracking-wider">
            TOP QUALITY
          </div>
        )}

        {/* New Badge */}
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 tracking-wider">
          NEW
        </div>
      </div>

      {/* Product Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-white/95 backdrop-blur-sm">
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">
          {product.category}
        </p>
        <h3 className="font-light text-lg text-stone-900 mb-3 line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-medium text-stone-900">
            {product.price.toFixed(2)} {product.currency === 'EUR' ? '€' : product.currency}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-stone-400 line-through">
              {product.originalPrice.toFixed(2)} €
            </span>
          )}
        </div>
      </div>

      {/* Static Info (always visible) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 group-hover:opacity-0 transition-opacity duration-300 bg-gradient-to-t from-white via-white/80 to-transparent">
        <h3 className="font-light text-base text-stone-800 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-stone-600 font-medium mt-1">
          {product.price.toFixed(2)} €
        </p>
      </div>
    </Link>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function NewArrivalsPage({ params }: NewArrivalsPageProps) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    return null;
  }

  setRequestLocale(locale);

  const products = await getNewArrivals(locale);

  // Define bento layout pattern
  const getBentoSize = (index: number): 'large' | 'wide' | 'normal' => {
    // Pattern: [large, normal, normal, wide, normal, normal, normal, large, normal, wide, normal, normal]
    const pattern = ['large', 'normal', 'normal', 'wide', 'normal', 'normal', 'normal', 'large', 'normal', 'wide', 'normal', 'normal'];
    return pattern[index % pattern.length] as 'large' | 'wide' | 'normal';
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 px-6 bg-stone-50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-500 mb-6">
            Collection
          </p>
          <h1 className="text-4xl md:text-6xl font-extralight text-stone-900 tracking-tight mb-6">
            New Arrivals
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto font-light leading-relaxed">
            Discover our latest curated selection of premium beauty products,
            handpicked for their exceptional quality and effectiveness.
          </p>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-fr">
              {products.map((product, index) => (
                <BentoItem
                  key={product.id}
                  product={product}
                  locale={locale}
                  size={getBentoSize(index)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-stone-500 text-lg font-light">
                No new arrivals yet. Check back soon for our latest products.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-24 px-6 bg-stone-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extralight mb-6 tracking-tight">
            Be the First to Know
          </h2>
          <p className="text-stone-400 mb-10 font-light leading-relaxed">
            Subscribe to receive exclusive access to new arrivals, special offers,
            and beauty insights curated just for you.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 bg-transparent border border-stone-700 text-white placeholder-stone-500 focus:border-white focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-white text-stone-900 font-medium tracking-wider hover:bg-stone-100 transition-colors"
            >
              SUBSCRIBE
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

// ============================================================================
// Export config
// ============================================================================

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes
