'use client';

// ============================================================================
// PRODUCT CARD LUXE - Carte Produit Premium avec Micro-Interactions
// ============================================================================
// Design luxe chaleureux avec :
// - Photo sur fond clair tres propre
// - Hover : changement d'image (lifestyle/texture)
// - Bouton Quick Add apparait en douceur au survol
// - Pastilles de couleur (swatches) pour les variantes
// - Etoiles discretes pour les avis
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingBag, Heart, Eye } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ColorSwatch {
  name: string;
  hex: string;
}

interface ProductCardLuxeProps {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  image: string;
  hoverImage?: string;
  badge?: 'new' | 'bestseller' | 'sale' | 'limited';
  rating?: number;
  reviewCount?: number;
  colorSwatches?: ColorSwatch[];
  className?: string;
}

// ============================================================================
// BADGE STYLES
// ============================================================================

const badgeStyles: Record<string, { bg: string; text: string; label: string }> = {
  new: {
    bg: 'bg-[#2D2926]',
    text: 'text-white',
    label: 'Nouveau',
  },
  bestseller: {
    bg: 'bg-gradient-to-r from-[#C9A962] to-[#B8927A]',
    text: 'text-white',
    label: 'Best-seller',
  },
  sale: {
    bg: 'bg-[#A65252]',
    text: 'text-white',
    label: 'Promo',
  },
  limited: {
    bg: 'bg-[#B8927A]',
    text: 'text-white',
    label: 'Edition Limitee',
  },
};

// ============================================================================
// PRODUCT CARD LUXE COMPONENT
// ============================================================================

export function ProductCardLuxe({
  id,
  slug,
  name,
  brand = 'Dropship Luxe',
  price,
  originalPrice,
  currency = 'EUR',
  image,
  hoverImage,
  badge,
  rating,
  reviewCount,
  colorSwatches,
  className,
}: ProductCardLuxeProps) {
  const locale = useLocale();
  const [isHovered, setIsHovered] = useState(false);
  const [selectedSwatch, setSelectedSwatch] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Format price
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate discount percentage
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className={cn('group relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/products/${slug}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#F9F7F5] mb-4">
          {/* Main Image */}
          <Image
            src={image}
            alt={name}
            fill
            className={cn(
              'object-cover transition-all duration-700 ease-out',
              isHovered && hoverImage ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Hover Image (Lifestyle/Texture) */}
          {hoverImage && (
            <Image
              src={hoverImage}
              alt={`${name} - lifestyle`}
              fill
              className={cn(
                'object-cover transition-all duration-700 ease-out absolute inset-0',
                isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Subtle Gradient Overlay on Hover */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent transition-opacity duration-300',
            isHovered ? 'opacity-100' : 'opacity-0'
          )} />

          {/* Badge */}
          {badge && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-3 left-3 z-10"
            >
              <span className={cn(
                'inline-block px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase rounded-full shadow-sm',
                badgeStyles[badge].bg,
                badgeStyles[badge].text
              )}>
                {badge === 'sale' && discountPercent > 0
                  ? `-${discountPercent}%`
                  : badgeStyles[badge].label
                }
              </span>
            </motion.div>
          )}

          {/* Wishlist Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            className={cn(
              'absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
              isWishlisted
                ? 'bg-[#B8927A] text-white'
                : 'bg-white/90 backdrop-blur-sm text-[#6B5B54] hover:bg-white hover:text-[#B8927A]'
            )}
            aria-label={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={cn('w-4 h-4', isWishlisted && 'fill-current')} />
          </motion.button>

          {/* Quick Actions - Appear on Hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute inset-x-4 bottom-4 z-10 flex gap-2"
              >
                {/* Quick Add Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Add to cart logic
                    console.log('Quick add:', id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/95 backdrop-blur-sm text-[#2D2926] text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-white transition-colors shadow-lg"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>

                {/* Quick View Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Quick view modal logic
                    console.log('Quick view:', id);
                  }}
                  className="w-12 flex items-center justify-center py-3 bg-white/95 backdrop-blur-sm text-[#2D2926] rounded-lg hover:bg-white transition-colors shadow-lg"
                  aria-label="Apercu rapide"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          {/* Brand */}
          <p className="text-xs text-[#B8A99A] tracking-wide uppercase">
            {brand}
          </p>

          {/* Product Name */}
          <h3 className="font-medium text-[#2D2926] line-clamp-2 group-hover:text-[#B8927A] transition-colors duration-200">
            {name}
          </h3>

          {/* Color Swatches */}
          {colorSwatches && colorSwatches.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              {colorSwatches.map((swatch, index) => (
                <button
                  key={swatch.name}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedSwatch(index);
                  }}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 transition-all duration-200',
                    selectedSwatch === index
                      ? 'border-[#2D2926] scale-110'
                      : 'border-transparent hover:border-[#E8E4DF]'
                  )}
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                  aria-label={`Teinte ${swatch.name}`}
                />
              ))}
              {colorSwatches.length > 4 && (
                <span className="text-xs text-[#B8A99A] ml-1">
                  +{colorSwatches.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-serif text-lg text-[#2D2926]">
              {formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-sm text-[#B8A99A] line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Rating */}
          {rating && rating > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-3 h-3',
                      star <= Math.floor(rating)
                        ? 'text-[#C9A962] fill-[#C9A962]'
                        : star <= rating
                          ? 'text-[#C9A962] fill-[#C9A962]/50'
                          : 'text-[#E8E4DF]'
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-[#B8A99A]">
                {rating.toFixed(1)}
                {reviewCount && ` (${reviewCount})`}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
