import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale, localeSeoConfig } from '@/i18n/config';
import { ProductPageClient } from './product-page-client';

// ============================================================================
// Types
// ============================================================================

interface ProductPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

interface ProductTranslation {
  name: string;
  slug: string;
  description: string;
  descriptionHtml: string;
  benefits: string[];
  ingredients?: string;
  howToUse?: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

interface ProductData {
  id: string;
  sku: string;
  images: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  rating: number;
  reviewCount: number;
  brand: string;
  category: string;
  shades?: Array<{
    id: string;
    name: string;
    color: string;
    available: boolean;
  }>;
  sizes?: Array<{
    id: string;
    label: string;
    price?: number;
    available: boolean;
  }>;
  translation: ProductTranslation;
}

// ============================================================================
// Data Fetching from API
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function getProductBySlug(locale: string, slug: string): Promise<ProductData | null> {
  try {
    const res = await fetch(`${API_URL}/products/${slug}?locale=${locale}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();

    if (!data.success || !data.data) {
      return null;
    }

    const p = data.data;

    // Map API response to ProductData format
    return {
      id: p.id,
      sku: p.aliexpressId || p.id,
      images: p.images?.length > 0 ? p.images : [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=1000&fit=crop',
      ],
      price: p.sellingPrice,
      originalPrice: Math.round(p.sellingPrice * 1.25), // Prix original ~25% plus élevé
      currency: p.currency || 'EUR',
      stock: p.stock || 0,
      rating: p.rating || 4.5,
      reviewCount: Math.floor(Math.random() * 100) + 20, // Placeholder
      brand: p.supplierName || 'Hayoss',
      category: p.category?.name || 'Cosmétiques',
      shades: undefined, // Les variantes seront gérées différemment
      sizes: p.variants?.map((v: any) => ({
        id: v.id,
        label: v.name,
        price: v.price !== p.sellingPrice ? v.price : undefined,
        available: v.stock > 0,
        image: v.image || null,
      })),
      translation: {
        name: p.name,
        slug: p.slug,
        description: p.description || '',
        descriptionHtml: p.descriptionHtml || `<p>${p.description || ''}</p>`,
        benefits: p.benefits || ['Qualité premium', 'Ingrédients naturels', 'Résultats visibles'],
        ingredients: p.ingredients || undefined,
        howToUse: p.howToUse || undefined,
        metaTitle: p.metaTitle || p.name,
        metaDescription: p.metaDescription || p.description?.substring(0, 155) || '',
        metaKeywords: p.metaKeywords || ['cosmétique', 'beauté', 'soin'],
      },
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Note: Translations are now fetched from the API via getProductBySlug

// ============================================================================
// SEO Metadata Generation
// ============================================================================

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const product = await getProductBySlug(locale, slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const seoConfig = localeSeoConfig[locale as Locale];
  const { translation } = product;

  return {
    title: translation.metaTitle,
    description: translation.metaDescription,
    keywords: translation.metaKeywords,
    openGraph: {
      title: translation.metaTitle,
      description: translation.metaDescription,
      type: 'website',
      locale: seoConfig.hreflang,
      images: product.images.slice(0, 4).map((img, i) => ({
        url: img,
        width: 800,
        height: 1000,
        alt: `${translation.name} - ${i + 1}`,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title: translation.metaTitle,
      description: translation.metaDescription,
      images: [product.images[0]],
    },
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [
          localeSeoConfig[l].hreflang,
          `/${l}/products/${slug}`,
        ])
      ),
    },
    other: {
      'product:price:amount': product.price.toString(),
      'product:price:currency': seoConfig.currency,
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
    },
  };
}

// ============================================================================
// Dynamic Route Config
// ============================================================================

// Products are fetched dynamically from the API
// No static params generation - all routes are dynamically rendered
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

// ============================================================================
// Page Component
// ============================================================================

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Fetch product data
  const product = await getProductBySlug(locale, slug);

  if (!product) {
    notFound();
  }

  return <ProductPageClient product={product} />;
}
