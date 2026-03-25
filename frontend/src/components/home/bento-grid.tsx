'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

/* =============================================================================
   BENTO CONTAINER
   ============================================================================= */

interface BentoContainerProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'hero' | 'featured' | 'products' | 'magazine';
}

export function BentoContainer({
  children,
  className,
  layout = 'featured',
}: BentoContainerProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const layoutClasses: Record<string, string> = {
    hero: 'grid-cols-1 md:grid-cols-[2fr_1fr] md:grid-rows-2',
    featured: 'grid-cols-1 md:grid-cols-3 md:grid-rows-2',
    products: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    magazine: 'grid-cols-1 md:grid-cols-4 md:grid-rows-3',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'grid gap-3 md:gap-4 lg:gap-6',
        'px-4 md:px-6 lg:px-8',
        'max-w-[1440px] mx-auto',
        layoutClasses[layout],
        className
      )}
    >
      {children}
    </motion.div>
  );
}


/* =============================================================================
   BENTO CELL - Base component
   ============================================================================= */

interface BentoCellProps {
  children: React.ReactNode;
  className?: string;
  span?: 'default' | 'wide' | 'tall' | 'featured';
  variant?: 'default' | 'dark' | 'accent';
  href?: string;
}

export function BentoCell({
  children,
  className,
  span = 'default',
  variant = 'default',
  href,
}: BentoCellProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const spanClasses: Record<string, string> = {
    default: '',
    wide: 'md:col-span-2',
    tall: 'md:row-span-2',
    featured: 'md:col-span-2 md:row-span-2',
  };

  const variantClasses: Record<string, string> = {
    default: 'bg-neutral-50',
    dark: 'bg-primary-800 text-neutral-100',
    accent: 'bg-secondary-navy text-neutral-100',
  };

  const content = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className={cn(
        'relative overflow-hidden rounded-lg',
        'transition-shadow duration-500 ease-luxury',
        'hover:shadow-luxury',
        spanClasses[span],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </motion.div>
  );

  if (href != null) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}


/* =============================================================================
   BENTO IMAGE CELL - Cell with background image
   ============================================================================= */

interface BentoImageCellProps {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  href?: string;
  span?: 'default' | 'wide' | 'tall' | 'featured';
  overlay?: 'none' | 'subtle' | 'gradient';
  className?: string;
  priority?: boolean;
}

export function BentoImageCell({
  src,
  alt,
  title,
  subtitle,
  href,
  span = 'default',
  overlay = 'gradient',
  className,
  priority = false,
}: BentoImageCellProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const spanClasses: Record<string, string> = {
    default: 'aspect-square md:aspect-auto',
    wide: 'md:col-span-2 aspect-video md:aspect-auto',
    tall: 'md:row-span-2 aspect-[3/4] md:aspect-auto',
    featured: 'md:col-span-2 md:row-span-2 aspect-square md:aspect-auto',
  };

  const overlayClasses: Record<string, string> = {
    none: '',
    subtle: 'bg-gradient-to-t from-black/50 to-transparent',
    gradient: 'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
  };

  const content = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-lg min-h-[200px] md:min-h-[250px]',
        'transition-shadow duration-500 ease-luxury',
        'hover:shadow-luxury',
        spanClasses[span],
        className
      )}
    >
      {/* Image */}
      <div className="absolute inset-0" style={{ position: 'absolute' }}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-700 ease-luxury group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
        />
      </div>

      {/* Overlay */}
      {overlay !== 'none' && (
        <div className={cn('absolute inset-0 pointer-events-none', overlayClasses[overlay])} />
      )}

      {/* Content */}
      {(title != null || subtitle != null) && (
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
          {subtitle != null && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-overline text-accent-gold-light mb-2 block"
            >
              {subtitle}
            </motion.span>
          )}
          {title != null && (
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="font-heading text-2xl md:text-3xl font-normal"
            >
              {title}
            </motion.h3>
          )}
          {href != null && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-4 flex items-center gap-2 text-sm font-accent font-medium tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              Découvrir
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );

  if (href != null) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}


/* =============================================================================
   BENTO TEXT CELL - Cell with text content
   ============================================================================= */

interface BentoTextCellProps {
  title: string;
  description?: string;
  overline?: string;
  cta?: { label: string; href: string };
  variant?: 'default' | 'dark' | 'accent' | 'gold';
  align?: 'left' | 'center';
  className?: string;
}

export function BentoTextCell({
  title,
  description,
  overline,
  cta,
  variant = 'default',
  align = 'left',
  className,
}: BentoTextCellProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const variantClasses: Record<string, string> = {
    default: 'bg-neutral-100 text-primary-800',
    dark: 'bg-primary-800 text-neutral-100',
    accent: 'bg-secondary-navy text-neutral-100',
    gold: 'bg-accent-gold text-primary-800',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative flex flex-col justify-center p-8 md:p-10 rounded-lg min-h-[250px]',
        variantClasses[variant],
        align === 'center' && 'items-center text-center',
        className
      )}
    >
      {overline != null && (
        <span className={cn(
          'text-overline mb-3',
          variant === 'gold' ? 'text-primary-800/70' : ''
        )}>
          {overline}
        </span>
      )}

      <h3 className="font-heading text-2xl md:text-3xl font-normal leading-tight">
        {title}
      </h3>

      {description != null && (
        <p className={cn(
          'mt-4 text-base leading-relaxed',
          variant === 'default' ? 'text-neutral-600' : 'opacity-80'
        )}>
          {description}
        </p>
      )}

      {cta != null && (
        <Link
          href={cta.href}
          className={cn(
            'mt-6 inline-flex items-center gap-2',
            'font-accent text-sm font-semibold tracking-wider uppercase',
            'link-luxury'
          )}
        >
          {cta.label}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </motion.div>
  );
}
