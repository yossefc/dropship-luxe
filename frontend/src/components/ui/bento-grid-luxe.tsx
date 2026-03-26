'use client';

// ============================================================================
// BENTO GRID LUXE - Composants Premium
// ============================================================================
// Design asymétrique moderne avec animations fluides
// Optimisé pour boutique cosmétique haut de gamme
// ============================================================================

import { ReactNode, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type BentoSpan = 'default' | 'wide' | 'tall' | 'featured' | 'small';
type BentoVariant = 'image' | 'text' | 'dark' | 'gold' | 'gradient';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
}

interface BentoCellProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  span?: BentoSpan;
  variant?: BentoVariant;
  href?: string;
}

interface BentoImageCellProps {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  href?: string;
  span?: BentoSpan;
  overlay?: 'none' | 'light' | 'dark' | 'gradient';
  priority?: boolean;
  className?: string;
}

interface BentoTextCellProps {
  title: string;
  description?: string;
  overline?: string;
  cta?: { label: string; href: string };
  variant?: 'light' | 'dark' | 'gold' | 'rose';
  align?: 'left' | 'center' | 'right';
  className?: string;
  span?: BentoSpan;
}

interface BentoProductCellProps {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  image: string;
  badge?: 'new' | 'bestseller' | 'sale' | 'limited';
  rating?: number;
  span?: BentoSpan;
  className?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const spanConfig: Record<BentoSpan, string> = {
  default: 'col-span-1 row-span-1',
  wide: 'col-span-2 row-span-1',
  tall: 'col-span-1 row-span-2',
  featured: 'col-span-2 row-span-2',
  small: 'col-span-1 row-span-1',
};

const variantConfig: Record<BentoVariant, string> = {
  image: 'bg-neutral-100 overflow-hidden',
  text: 'bg-white',
  dark: 'bg-[#1A1A1A] text-white',
  gold: 'bg-gradient-to-br from-[#C9A962] to-[#E8D5A3] text-[#1A1A1A]',
  gradient: 'bg-gradient-to-br from-[#B76E79] via-[#D4A5AD] to-[#E8D5A3] text-white',
};

const gapConfig = {
  sm: 'gap-3',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
};

// ============================================================================
// BENTO GRID CONTAINER
// ============================================================================

export function BentoGrid({
  children,
  className,
  columns = 4,
  gap = 'md',
}: BentoGridProps) {
  const columnClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-4 md:grid-cols-6 lg:grid-cols-12',
  };

  return (
    <div
      className={cn(
        'grid w-full',
        columnClass[columns],
        gapConfig[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// BENTO CELL - Base Component
// ============================================================================

export const BentoCell = forwardRef<HTMLDivElement, BentoCellProps>(
  ({ children, className, span = 'default', variant = 'image', href, ...props }, ref) => {
    const content = (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'relative rounded-lg',
          spanConfig[span],
          variantConfig[variant],
          href && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );

    if (href) {
      return <Link href={href}>{content}</Link>;
    }

    return content;
  }
);
BentoCell.displayName = 'BentoCell';

// ============================================================================
// BENTO IMAGE CELL
// ============================================================================

export function BentoImageCell({
  src,
  alt,
  title,
  subtitle,
  badge,
  href,
  span = 'default',
  overlay = 'gradient',
  priority = false,
  className,
}: BentoImageCellProps) {
  const overlayClass = {
    none: '',
    light: 'bg-white/20',
    dark: 'bg-black/40',
    gradient: 'bg-gradient-to-t from-black/60 via-black/20 to-transparent',
  };

  const heightClass = {
    default: 'aspect-square md:aspect-[4/5]',
    wide: 'aspect-[16/9] md:aspect-[21/9]',
    tall: 'aspect-[3/4] md:aspect-[2/3]',
    featured: 'aspect-[4/5] md:aspect-[3/4]',
    small: 'aspect-square',
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ scale: href ? 1.02 : 1 }}
      className={cn(
        'relative overflow-hidden rounded-lg group',
        spanConfig[span],
        heightClass[span],
        className
      )}
    >
      {/* Image */}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />

      {/* Overlay */}
      <div className={cn('absolute inset-0 transition-opacity duration-300', overlayClass[overlay])} />

      {/* Badge */}
      {badge && (
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-block px-3 py-1.5 text-xs font-medium tracking-wider uppercase bg-white/90 backdrop-blur-sm text-[#1A1A1A] rounded-full">
            {badge}
          </span>
        </div>
      )}

      {/* Content */}
      {(title || subtitle) && (
        <div className="absolute inset-x-0 bottom-0 p-6 z-10">
          {subtitle && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="block text-xs font-medium tracking-[0.2em] uppercase text-white/80 mb-2"
            >
              {subtitle}
            </motion.span>
          )}
          {title && (
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-serif text-xl md:text-2xl lg:text-3xl font-light text-white"
            >
              {title}
            </motion.h3>
          )}

          {/* Hover indicator */}
          {href && (
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '3rem' }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="h-px bg-white/60 mt-4 group-hover:w-20 transition-all duration-300"
            />
          )}
        </div>
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

// ============================================================================
// BENTO TEXT CELL
// ============================================================================

export function BentoTextCell({
  title,
  description,
  overline,
  cta,
  variant = 'light',
  align = 'left',
  className,
  span = 'default',
}: BentoTextCellProps) {
  const variantStyles = {
    light: 'bg-[#F8F6F3] text-[#1A1A1A]',
    dark: 'bg-[#1A1A1A] text-white',
    gold: 'bg-gradient-to-br from-[#C9A962] to-[#E8D5A3] text-[#1A1A1A]',
    rose: 'bg-gradient-to-br from-[#B76E79] to-[#D4A5AD] text-white',
  };

  const alignStyles = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative rounded-lg p-8 md:p-10 flex flex-col justify-center',
        spanConfig[span],
        variantStyles[variant],
        alignStyles[align],
        className
      )}
    >
      {overline && (
        <span className={cn(
          'text-xs font-medium tracking-[0.2em] uppercase mb-4',
          variant === 'light' ? 'text-[#B76E79]' : 'text-current opacity-70'
        )}>
          {overline}
        </span>
      )}

      <h3 className="font-serif text-2xl md:text-3xl font-light leading-tight mb-4">
        {title}
      </h3>

      {description && (
        <p className={cn(
          'text-sm md:text-base leading-relaxed max-w-md',
          variant === 'light' ? 'text-neutral-600' : 'text-current opacity-80'
        )}>
          {description}
        </p>
      )}

      {cta && (
        <Link
          href={cta.href}
          className={cn(
            'inline-flex items-center gap-2 mt-6 text-sm font-medium tracking-wide uppercase transition-all group',
            variant === 'light' ? 'text-[#1A1A1A]' : 'text-current'
          )}
        >
          {cta.label}
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      )}
    </motion.div>
  );
}

// ============================================================================
// BENTO PRODUCT CELL
// ============================================================================

export function BentoProductCell({
  id,
  slug,
  name,
  brand,
  price,
  originalPrice,
  currency = 'EUR',
  image,
  badge,
  rating,
  span = 'default',
  className,
}: BentoProductCellProps) {
  const badgeStyles = {
    new: 'bg-[#1A1A1A] text-white',
    bestseller: 'bg-[#C9A962] text-[#1A1A1A]',
    sale: 'bg-[#A65252] text-white',
    limited: 'bg-[#B76E79] text-white',
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className={cn(
        'group relative',
        spanConfig[span],
        className
      )}
    >
      <Link href={`/products/${slug}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#F5F4F2] mb-4">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />

          {/* Badge */}
          {badge && (
            <div className="absolute top-3 left-3 z-10">
              <span className={cn(
                'inline-block px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase rounded-full',
                badgeStyles[badge]
              )}>
                {badge === 'sale' ? `-${discount}%` : badge}
              </span>
            </div>
          )}

          {/* Quick Add Button */}
          <div className="absolute inset-x-4 bottom-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <button className="w-full py-3 bg-white/95 backdrop-blur-sm text-[#1A1A1A] text-xs font-semibold tracking-wider uppercase rounded-md hover:bg-white transition-colors">
              Ajouter au panier
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-1">
          <p className="text-xs text-neutral-500 tracking-wide uppercase">
            {brand}
          </p>
          <h3 className="font-medium text-[#1A1A1A] line-clamp-2 group-hover:text-[#B76E79] transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2 pt-1">
            <span className="font-serif text-lg text-[#1A1A1A]">
              {formatPrice(price)}
            </span>
            {originalPrice && (
              <span className="text-sm text-neutral-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-1 pt-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={cn(
                    'w-3 h-3',
                    i < Math.floor(rating) ? 'text-[#C9A962]' : 'text-neutral-300'
                  )}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-xs text-neutral-500 ml-1">{rating}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ============================================================================
// BENTO CATEGORY CELL
// ============================================================================

interface BentoCategoryCellProps {
  name: string;
  description?: string;
  image: string;
  href: string;
  productCount?: number;
  span?: BentoSpan;
  className?: string;
}

export function BentoCategoryCell({
  name,
  description,
  image,
  href,
  productCount,
  span = 'default',
  className,
}: BentoCategoryCellProps) {
  return (
    <Link href={href} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.4 }}
        className={cn(
          'group relative overflow-hidden rounded-lg',
          spanConfig[span],
          span === 'featured' ? 'aspect-square md:aspect-[4/3]' : 'aspect-[4/5]',
          className
        )}
      >
        {/* Background Image */}
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
          <div className="space-y-2">
            {productCount !== undefined && (
              <span className="text-xs text-white/70 tracking-wider uppercase">
                {productCount} produits
              </span>
            )}
            <h3 className="font-serif text-2xl md:text-3xl text-white font-light">
              {name}
            </h3>
            {description && (
              <p className="text-sm text-white/80 max-w-xs">
                {description}
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="mt-4 flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
            <span className="text-xs font-medium tracking-wider uppercase">Découvrir</span>
            <svg
              className="w-4 h-4 transform transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
