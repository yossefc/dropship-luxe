'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice } from '@/lib/utils';
import { useLocale } from 'next-intl';

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  hoverImage?: string;
  badge?: 'new' | 'sale' | 'bestseller' | 'limited';
  rating?: number;
}

interface ProductCardProps {
  product: ProductCardData;
  index?: number;
  onQuickView?: (product: ProductCardData) => void;
  onAddToCart?: (product: ProductCardData) => void;
}

export function ProductCard({
  product,
  index = 0,
  onQuickView,
  onAddToCart,
}: ProductCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const locale = useLocale();

  const discount = product.originalPrice != null
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col"
    >
      {/* Image Container */}
      <Link href={`/${locale}/products/${product.slug}`} className="relative block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-neutral-100" style={{ position: 'relative' }}>
          {/* Main Image */}
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={cn(
              'object-cover transition-all duration-700 ease-luxury',
              product.hoverImage != null && isHovered && 'opacity-0'
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Hover Image */}
          {product.hoverImage != null && (
            <Image
              src={product.hoverImage}
              alt={`${product.name} - Vue alternative`}
              fill
              className={cn(
                'object-cover transition-opacity duration-700 ease-luxury',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Badge */}
          {product.badge != null && (
            <Badge variant={product.badge} position="floating">
              {product.badge === 'new' && 'Nouveau'}
              {product.badge === 'sale' && `-${discount}%`}
              {product.badge === 'bestseller' && 'Best-seller'}
              {product.badge === 'limited' && 'Exclusif'}
            </Badge>
          )}

          {/* Quick Actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-3 right-3 flex flex-col gap-2"
              >
                <QuickActionButton
                  icon={Heart}
                  isActive={isWishlisted}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsWishlisted(!isWishlisted);
                  }}
                  label="Favoris"
                />
                {onQuickView != null && (
                  <QuickActionButton
                    icon={Eye}
                    onClick={(e) => {
                      e.preventDefault();
                      onQuickView(product);
                    }}
                    label="Aperçu rapide"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Add Button */}
          <AnimatePresence>
            {isHovered && onAddToCart != null && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-0 left-0 right-0 p-4"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onAddToCart(product);
                  }}
                  className="w-full py-3 px-4 bg-white/95 backdrop-blur-sm rounded-md flex items-center justify-center gap-2 text-sm font-accent font-semibold tracking-wider uppercase text-primary-800 hover:bg-white transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Ajouter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>

      {/* Product Info */}
      <div className="mt-4 flex flex-col gap-1.5">
        <span className="text-xs font-accent font-medium tracking-wider uppercase text-neutral-500">
          {product.brand}
        </span>

        <Link href={`/${locale}/products/${product.slug}`}>
          <h3 className="font-heading text-sm font-medium text-primary-800 leading-snug line-clamp-2 hover:text-accent-gold transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-sm font-light text-primary-800">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.originalPrice != null && (
            <span className="text-sm text-neutral-400 line-through">
              {formatPrice(product.originalPrice, product.currency)}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  isActive?: boolean;
}

function QuickActionButton({
  icon: Icon,
  onClick,
  label,
  isActive = false,
}: QuickActionButtonProps): JSX.Element {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'w-10 h-10 flex items-center justify-center rounded-full',
        'bg-white/95 backdrop-blur-sm shadow-sm',
        'transition-colors duration-200',
        isActive
          ? 'text-accent-rose-gold'
          : 'text-neutral-600 hover:text-primary-800'
      )}
      aria-label={label}
    >
      <Icon className={cn('w-4 h-4', isActive && 'fill-current')} />
    </motion.button>
  );
}
