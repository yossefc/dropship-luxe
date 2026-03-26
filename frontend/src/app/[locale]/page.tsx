'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BentoContainer, BentoImageCell, BentoTextCell } from '@/components/home/bento-grid';
import { ProductCard, type ProductCardData } from '@/components/home/product-card';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart-store';
import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Fallback products si l'API n'est pas disponible
const fallbackProducts: ProductCardData[] = [
  {
    id: '1',
    slug: 'serum-eclat-vitamine-c',
    name: 'Sérum Éclat Vitamine C',
    brand: 'Hayoss',
    price: 89,
    originalPrice: 119,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
    hoverImage: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&h=800&fit=crop',
    badge: 'bestseller',
    rating: 4.8,
  },
  {
    id: '2',
    slug: 'creme-nuit-regenerante',
    name: 'Crème Nuit Régénérante',
    brand: 'Hayoss',
    price: 125,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
    badge: 'new',
    rating: 4.9,
  },
  {
    id: '3',
    slug: 'huile-visage-rose-musquee',
    name: 'Huile Visage Rose Musquée',
    brand: 'Hayoss',
    price: 75,
    originalPrice: 95,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=800&fit=crop',
    hoverImage: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=800&fit=crop',
    rating: 4.7,
  },
  {
    id: '4',
    slug: 'masque-hydratant-aloe',
    name: 'Masque Hydratant Aloe Vera',
    brand: 'Hayoss',
    price: 45,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop',
    badge: 'new',
    rating: 4.6,
  },
  {
    id: '5',
    slug: 'lotion-tonique-purifiante',
    name: 'Lotion Tonique Purifiante',
    brand: 'Hayoss',
    price: 55,
    originalPrice: 70,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=800&fit=crop',
    rating: 4.5,
  },
  {
    id: '6',
    slug: 'creme-contour-yeux',
    name: 'Crème Contour des Yeux',
    brand: 'Hayoss',
    price: 98,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&h=800&fit=crop',
    badge: 'bestseller',
    rating: 4.9,
  },
  {
    id: '7',
    slug: 'gommage-doux-visage',
    name: 'Gommage Doux Visage',
    brand: 'Hayoss',
    price: 42,
    originalPrice: 55,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1598452963314-b09f397a5c48?w=600&h=800&fit=crop',
    rating: 4.4,
  },
  {
    id: '8',
    slug: 'baume-levres-nourrissant',
    name: 'Baume Lèvres Nourrissant',
    brand: 'Hayoss',
    price: 28,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=800&fit=crop',
    badge: 'new',
    rating: 4.8,
  },
];

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
  const { openCart } = useCartStore();
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
          const mappedProducts: ProductCardData[] = data.data.slice(0, 8).map((p: ApiProduct) => ({
            id: p.id,
            slug: p.translations?.[0]?.slug || p.aliexpressId,
            name: p.translations?.[0]?.name || p.name,
            brand: p.supplierName || 'Dropship Luxe',
            price: p.sellingPrice,
            originalPrice: p.basePrice > p.sellingPrice ? p.basePrice * 2.5 : undefined,
            currency: p.currency || 'EUR',
            image: p.images?.[0] || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
            hoverImage: p.images?.[1],
            badge: p.importScore >= 90 ? 'bestseller' : p.importScore >= 80 ? 'new' : undefined,
            rating: p.rating || 4.5,
          }));
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
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-wide">
            {t('common.brand.name')}
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/collections" className="text-sm font-accent font-medium tracking-wide hover:text-accent-gold transition-colors">
              {t('common.nav.collections')}
            </Link>
            <Link href="/collections/skincare" className="text-sm font-accent font-medium tracking-wide hover:text-accent-gold transition-colors">
              {t('common.nav.skincare')}
            </Link>
            <Link href="/collections/makeup" className="text-sm font-accent font-medium tracking-wide hover:text-accent-gold transition-colors">
              {t('common.nav.makeup')}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={openCart}
              className="relative w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
              aria-label={t('common.accessibility.openCart')}
            >
              <ShoppingBag className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <BentoContainer layout="hero" className="min-h-[70vh]">
          <BentoImageCell
            src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=1600&fit=crop"
            alt={t('home.hero.title')}
            title={t('home.hero.title')}
            subtitle={t('home.hero.overline')}
            href="/collections/spring"
            span="featured"
            priority
          />
          <BentoImageCell
            src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=800&fit=crop"
            alt={t('common.nav.skincare')}
            title={t('common.nav.skincare')}
            href="/collections/skincare"
          />
          <BentoTextCell
            title={t('home.philosophy.title')}
            description={t('home.philosophy.description')}
            overline={t('home.philosophy.overline')}
            cta={{ label: t('common.cta.learnMore'), href: '/about' }}
            variant="dark"
          />
        </BentoContainer>
      </section>

      {/* Featured Products */}
      <section className="py-section">
        <div className="max-w-[1440px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-overline">{t('home.featured.overline')}</span>
            <h2 className="font-display text-4xl md:text-5xl font-light mt-3">
              {t('home.featured.title')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
              </div>
            ) : (
              products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onAddToCart={(p) => {
                    useCartStore.getState().addItem({
                      productId: p.id,
                      name: p.name,
                      brand: p.brand,
                      image: p.image,
                      price: p.price,
                    });
                  }}
                />
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Button variant="secondary" size="lg" asChild>
              <Link href="/collections">
                {t('common.cta.viewCollection')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

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
