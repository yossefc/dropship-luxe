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
  name: string;
  supplierName: string;
  sellingPrice: number;
  basePrice: number;
  currency: string;
  images: string[];
  rating: number;
  importScore: number;
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
          const mappedProducts: ProductCardData[] = data.data.slice(0, 8).map((p: ApiProduct) => {
            // Calculer le prix original "barré" (environ 25% de plus que le prix de vente)
            const originalPriceValue = Math.round(p.sellingPrice * 1.25);

            return {
              id: p.id,
              slug: p.slug || p.aliexpressId,
              name: p.name,
              brand: p.supplierName || 'Hayoss',
              price: p.sellingPrice,
              // Afficher le prix original barré seulement pour certains produits (top scorers)
              originalPrice: p.importScore >= 75 ? originalPriceValue : undefined,
              currency: p.currency || 'EUR',
              image: p.images?.[0] || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
              hoverImage: p.images?.[1],
              badge: p.importScore >= 90 ? 'bestseller' : p.importScore >= 80 ? 'new' : undefined,
              rating: p.rating || 4.5,
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

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation - Luxe Mega Menu */}
      <LuxeNavbar />

      {/* Hero Section with Video */}
      <HeroSection
        title={t('home.hero.title')}
        subtitle={t('home.hero.overline')}
        ctaText={t('common.cta.shopNow')}
        ctaHref="/collections"
        secondaryCtaText={t('common.cta.learnMore')}
        secondaryCtaHref="/about"
      />

      {/* Logo Carousel - Press & Certifications */}
      <LogoCarousel title="As Featured In" />

      {/* Featured Products with Tabs */}
      {loading ? (
        <section className="py-20">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
          </div>
        </section>
      ) : (
        <FeaturedProductsTabs
          title={t('home.featured.title')}
          subtitle={t('home.featured.overline')}
          products={products.map((p, i) => ({
            ...p,
            category: i % 2 === 0 ? 'skincare' : 'makeup',
          }))}
        />
      )}

      {/* Categories Bento */}
      <section className="py-section bg-neutral-100">
        <BentoContainer layout="featured">
          <BentoImageCell
            src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=1200&fit=crop"
            alt={t('home.categories.skincare.title')}
            title={t('home.categories.skincare.title')}
            subtitle={t('home.categories.skincare.subtitle')}
            href="/collections/skincare"
            span="featured"
          />
          <BentoImageCell
            src="https://images.unsplash.com/photo-1571875257727-256c39da42af?w=600&h=400&fit=crop"
            alt={t('home.categories.makeup.title')}
            title={t('home.categories.makeup.title')}
            href="/collections/makeup"
          />
          <BentoTextCell
            title={t('home.shipping.title')}
            description={t('home.shipping.description')}
            variant="gold"
            align="center"
          />
          <BentoImageCell
            src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=400&fit=crop"
            alt={t('home.categories.fragrances.title')}
            title={t('home.categories.fragrances.title')}
            href="/collections/body-care"
          />
        </BentoContainer>
      </section>

      {/* Newsletter */}
      <section className="py-section bg-secondary-navy text-neutral-100">
        <div className="max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-light mb-4">
              {t('home.newsletter.title')}
            </h2>
            <p className="text-neutral-400 mb-8">
              {t('home.newsletter.description')}
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder={t('home.newsletter.placeholder')}
                className="flex-1 px-5 py-4 bg-white/10 border border-white/20 rounded-md text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-accent-gold"
              />
              <Button variant="gold" size="lg">
                {t('common.cta.subscribe')}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-200">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="font-display text-xl">
              {t('common.brand.name')}
            </Link>
            <p className="text-sm text-neutral-500">
              © 2024 {t('common.brand.name')}. {t('common.footer.rights')}.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
