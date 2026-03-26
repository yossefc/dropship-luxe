'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ShoppingBag, Heart, Star } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useCartStore } from '@/lib/store/cart-store';
import { cn, formatPrice } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  hoverImage?: string;
  category: 'skincare' | 'makeup' | 'all';
  badge?: 'new' | 'bestseller' | 'sale' | 'limited';
  rating?: number;
}

interface FeaturedProductsTabsProps {
  title?: string;
  subtitle?: string;
  products?: Product[];
}

// ============================================================================
// Fallback Products
// ============================================================================

const fallbackProducts: Product[] = [
  {
    id: '1',
    slug: 'vitamin-c-serum',
    name: 'Vitamin C Glow Serum',
    brand: 'Hayoss',
    price: 89,
    originalPrice: 119,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
    hoverImage: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&h=800&fit=crop',
    category: 'skincare',
    badge: 'bestseller',
    rating: 4.9,
  },
  {
    id: '2',
    slug: 'hydrating-moisturizer',
    name: 'Deep Hydrating Cream',
    brand: 'Hayoss',
    price: 75,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
    category: 'skincare',
    badge: 'new',
    rating: 4.8,
  },
  {
    id: '3',
    slug: 'silk-foundation',
    name: 'Silk Skin Foundation',
    brand: 'Hayoss',
    price: 65,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=800&fit=crop',
    category: 'makeup',
    rating: 4.7,
  },
  {
    id: '4',
    slug: 'rose-lip-oil',
    name: 'Rose Petal Lip Oil',
    brand: 'Hayoss',
    price: 32,
    originalPrice: 42,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=800&fit=crop',
    category: 'makeup',
    badge: 'sale',
    rating: 4.9,
  },
  {
    id: '5',
    slug: 'retinol-night-cream',
    name: 'Retinol Night Repair',
    brand: 'Hayoss',
    price: 95,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=800&fit=crop',
    category: 'skincare',
    rating: 4.6,
  },
  {
    id: '6',
    slug: 'bronzing-powder',
    name: 'Sun-Kissed Bronzer',
    brand: 'Hayoss',
    price: 48,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&h=800&fit=crop',
    category: 'makeup',
    badge: 'new',
    rating: 4.8,
  },
];

// ============================================================================
// Component
// ============================================================================

type TabType = 'all' | 'skincare' | 'makeup';

const tabs: { id: TabType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'skincare', label: 'Skincare' },
  { id: 'makeup', label: 'Makeup' },
];

export function FeaturedProductsTabs({
  title = 'Shop Our Favorites',
  subtitle = 'Curated Selection',
  products = fallbackProducts,
}: FeaturedProductsTabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const locale = useLocale();
  const { addItem } = useCartStore();

  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter((p) => p.category === activeTab));
    }
  }, [activeTab, products]);

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: product.price,
    });
  };

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-[1440px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-accent font-semibold tracking-[0.2em] uppercase text-accent-gold">
            {subtitle}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-light text-primary-800 mt-3">
            {title}
          </h2>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-2 mb-12"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-6 py-3 text-sm font-accent font-medium tracking-wider uppercase rounded-full transition-all duration-300',
                activeTab === tab.id
                  ? 'bg-primary-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Products Grid - Bento Style */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {filteredProducts.slice(0, 8).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                locale={locale}
                onAddToCart={handleAddToCart}
                // Make first item larger on desktop
                className={index === 0 ? 'md:col-span-2 md:row-span-2' : ''}
                isLarge={index === 0}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link
            href="/collections"
            className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-primary-800 font-accent font-semibold text-sm tracking-wider uppercase rounded-full border-2 border-primary-800 hover:bg-primary-800 hover:text-white transition-all duration-300"
          >
            View All Products
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// Product Card Component
// ============================================================================

interface ProductCardProps {
  product: Product;
  index: number;
  locale: string;
  onAddToCart: (product: Product) => void;
  className?: string;
  isLarge?: boolean;
}

function ProductCard({ product, index, locale, onAddToCart, className, isLarge }: ProductCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('group relative', className)}
    >
      <Link href={`/${locale}/products/${product.slug}`} className="block">
        <div className={cn(
          'relative overflow-hidden rounded-2xl bg-neutral-100',
          isLarge ? 'aspect-[3/4] md:aspect-square' : 'aspect-[3/4]'
        )}>
          {/* Main Image */}
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={cn(
              'object-cover transition-all duration-700',
              isHovered && product.hoverImage ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            )}
            sizes={isLarge ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
          />

          {/* Hover Image */}
          {product.hoverImage && (
            <Image
              src={product.hoverImage}
              alt={`${product.name} - alternate view`}
              fill
              className={cn(
                'object-cover transition-all duration-700 absolute inset-0',
                isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              )}
              sizes={isLarge ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            />
          )}

          {/* Badge */}
          {product.badge && (
            <span className={cn(
              'absolute top-4 left-4 px-3 py-1 text-xs font-accent font-semibold tracking-wider uppercase rounded-full',
              product.badge === 'bestseller' && 'bg-accent-gold text-primary-800',
              product.badge === 'new' && 'bg-primary-800 text-white',
              product.badge === 'sale' && 'bg-red-500 text-white',
              product.badge === 'limited' && 'bg-purple-600 text-white'
            )}>
              {product.badge === 'sale' ? `-${discount}%` : product.badge === 'limited' ? 'Limited' : product.badge}
            </span>
          )}

          {/* Wishlist Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
          >
            <Heart className={cn('w-5 h-5', isWishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-600')} />
          </motion.button>

          {/* Quick Add */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            className="absolute bottom-4 left-4 right-4"
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToCart(product);
              }}
              className="w-full py-3 px-4 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center gap-2 text-sm font-accent font-semibold text-primary-800 hover:bg-accent-gold transition-colors shadow-lg"
            >
              <ShoppingBag className="w-4 h-4" />
              Add to Bag
            </button>
          </motion.div>
        </div>
      </Link>

      {/* Product Info */}
      <div className="mt-4 space-y-1">
        <span className="text-xs font-accent font-medium tracking-wider uppercase text-neutral-500">
          {product.brand}
        </span>
        <Link href={`/${locale}/products/${product.slug}`}>
          <h3 className={cn(
            'font-heading font-medium text-primary-800 leading-snug hover:text-accent-gold transition-colors',
            isLarge ? 'text-lg md:text-xl' : 'text-base'
          )}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-accent-gold text-accent-gold" />
            <span className="text-xs text-neutral-600">{product.rating}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className={cn('font-medium text-primary-800', isLarge ? 'text-lg' : 'text-base')}>
            {formatPrice(product.price, product.currency)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-neutral-400 line-through">
              {formatPrice(product.originalPrice, product.currency)}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
