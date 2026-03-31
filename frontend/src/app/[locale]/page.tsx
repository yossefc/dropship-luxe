'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BentoContainer, BentoImageCell, BentoTextCell } from '@/components/home/bento-grid';
import { ProductCard, type ProductCardData } from '@/components/home/product-card';
import { HeroSection } from '@/components/home/hero-section';
import { LogoCarousel } from '@/components/home/logo-carousel';
import { FeaturedProductsTabs } from '@/components/home/featured-products-tabs';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart-store';
import { Link } from '@/i18n/routing';
import { LuxeNavbar } from '@/components/navigation';
import { getFeaturedProducts } from '@/data/fallback-products';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Get featured products from comprehensive fallback data (105 products)
const fallbackProducts: ProductCardData[] = getFeaturedProducts(12).map(p => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  price: p.price,
  originalPrice: p.originalPrice,
  currency: p.currency,
  image: p.image,
  hoverImage: p.hoverImage,
  badge: p.badge,
  rating: p.rating,
}));

interface ApiProduct {
  id: string;
  aliexpressId: string;
  slug: string;
  name: string;
  supplierName: string;
  sellingPrice: number;
  basePrice: number;
  currency: string;
  images: string[];
  rating: number;
  importScore: number;
  isFeatured: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
    parent?: { slug: string };
  };
  translations?: Array<{
    locale: string;
    name: string;
    slug: string;
  }>;
}

export default function HomePage(): JSX.Element {
  const t = useTranslations();
  const [products, setProducts] = useState<ProductCardData[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) throw new Error('API error');

        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const mappedProducts: ProductCardData[] = data.data.slice(0, 12).map((p: ApiProduct) => {
            const originalPriceValue = Math.round(p.sellingPrice * 1.25);
            // Determine category from parent slug or direct slug
            const parentSlug = p.category?.parent?.slug ?? p.category?.slug ?? 'soins';
            const categoryMap: Record<string, string> = {
              'soins': 'soins',
              'maquillage': 'maquillage',
              'parfums': 'parfums',
              // Subcategories map to parent
              'hydratants-serums': 'soins',
              'soins-yeux': 'soins',
              'solaires-autobronzants': 'soins',
              'demaquillants': 'soins',
              'masques-visage': 'soins',
              'mains-corps': 'soins',
              'maquillage-visage': 'maquillage',
              'maquillage-yeux': 'maquillage',
              'maquillage-levres': 'maquillage',
            };

            return {
              id: p.id,
              slug: p.slug || p.aliexpressId,
              name: p.name,
              brand: 'Hayoss',
              price: p.sellingPrice,
              originalPrice: p.isFeatured ? originalPriceValue : undefined,
              currency: p.currency || 'EUR',
              image: p.images?.[0] || '/products/placeholder-luxe.png',
              hoverImage: p.images?.[1],
              badge: p.isFeatured ? 'bestseller' : undefined,
              rating: p.rating || 4.5,
              category: (categoryMap[p.category?.slug ?? ''] ?? 'soins') as 'soins' | 'maquillage' | 'parfums',
            };
          });
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.log('Using fallback products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Group products by parent category
  const soinsProducts = products.filter(p => p.category === 'soins').slice(0, 4);
  const maquillageProducts = products.filter(p => p.category === 'maquillage').slice(0, 4);
  const parfumsProducts = products.filter(p => p.category === 'parfums').slice(0, 4);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero — compact like Clinique */}
      <section className="relative h-[30vh] min-h-[220px] max-h-[320px] overflow-hidden bg-[#F5F0EB]">
        <img
          src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1400&h=500&fit=crop"
          alt="Hayoss"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        <div className="relative h-full max-w-[1200px] mx-auto px-4 md:px-8 flex items-center">
          <div>
            <p className="text-xs text-white/80 tracking-[0.2em] uppercase mb-2">Nouveautés</p>
            <h1 className="font-serif text-2xl md:text-3xl text-white font-light leading-tight mb-3">
              La beauté sublimée
            </h1>
            <Link
              href="/collections"
              className="inline-flex items-center px-5 py-2 bg-white text-[#1A1A1A] text-xs font-medium tracking-wider uppercase rounded-full hover:bg-[#B76E79] hover:text-white transition-all"
            >
              Découvrir
            </Link>
          </div>
        </div>
      </section>

      {/* Categories — 3 cards like Clinique */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Soins', href: '/collections/soins', img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=300&fit=crop', desc: 'Sérums, crèmes & rituels' },
            { name: 'Maquillage', href: '/collections/maquillage', img: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=300&fit=crop', desc: 'Visage, yeux & lèvres' },
            { name: 'Parfums', href: '/collections/parfums', img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=300&fit=crop', desc: 'Eaux de parfum & brumes' },
          ].map(cat => (
            <Link key={cat.name} href={cat.href} className="group relative aspect-[4/3] rounded-lg overflow-hidden">
              <img src={cat.img} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-serif text-lg text-white">{cat.name}</h3>
                <p className="text-xs text-white/70">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Soins Section */}
      {soinsProducts.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-[#1A1A1A]">Soins</h2>
            <Link href="/collections/soins" className="text-xs text-[#B76E79] hover:underline tracking-wide uppercase">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {soinsProducts.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`} className="group">
                <div className="aspect-square bg-neutral-50 rounded-lg overflow-hidden mb-2">
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                </div>
                <p className="text-xs text-[#B76E79] tracking-wide">{p.brand}</p>
                <h3 className="text-sm text-[#1A1A1A] leading-tight line-clamp-2">{p.name}</h3>
                <p className="text-sm font-light text-[#1A1A1A] mt-1">{p.price.toFixed(2)} €</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Maquillage Section */}
      {maquillageProducts.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 bg-[#FAFAF8]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-[#1A1A1A]">Maquillage</h2>
            <Link href="/collections/maquillage" className="text-xs text-[#B76E79] hover:underline tracking-wide uppercase">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {maquillageProducts.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`} className="group">
                <div className="aspect-square bg-white rounded-lg overflow-hidden mb-2">
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                </div>
                <p className="text-xs text-[#B76E79] tracking-wide">{p.brand}</p>
                <h3 className="text-sm text-[#1A1A1A] leading-tight line-clamp-2">{p.name}</h3>
                <p className="text-sm font-light text-[#1A1A1A] mt-1">{p.price.toFixed(2)} €</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Parfums Section */}
      {parfumsProducts.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-[#1A1A1A]">Parfums</h2>
            <Link href="/collections/parfums" className="text-xs text-[#B76E79] hover:underline tracking-wide uppercase">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {parfumsProducts.map(p => (
              <Link key={p.id} href={`/products/${p.slug}`} className="group">
                <div className="aspect-square bg-neutral-50 rounded-lg overflow-hidden mb-2">
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                </div>
                <p className="text-xs text-[#B76E79] tracking-wide">{p.brand}</p>
                <h3 className="text-sm text-[#1A1A1A] leading-tight line-clamp-2">{p.name}</h3>
                <p className="text-sm font-light text-[#1A1A1A] mt-1">{p.price.toFixed(2)} €</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-neutral-200 mt-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link href="/" className="font-serif text-lg">Hayoss</Link>
            <p className="text-xs text-neutral-400">© 2024 Hayoss. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
