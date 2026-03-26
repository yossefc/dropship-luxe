'use client';

// ============================================================================
// PRODUCT GRID LUXE - Grille Bento Asymetrique Premium
// ============================================================================
// Layout modulaire avec wide spacing genereux
// Le vide est un element de design qui souligne le luxe
// ============================================================================

import { motion } from 'framer-motion';
import { ProductCardLuxe } from './product-card-luxe';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  hoverImage?: string;
  badge?: 'new' | 'bestseller' | 'sale' | 'limited';
  rating?: number;
  reviewCount?: number;
  colorSwatches?: Array<{ name: string; hex: string }>;
}

interface ProductGridLuxeProps {
  products: Product[];
  columns?: 2 | 3 | 4;
}

// ============================================================================
// BENTO PATTERN
// ============================================================================

// Defines which products get special sizing in the Bento layout
// This creates visual interest and hierarchy
const getBentoSize = (index: number): 'normal' | 'featured' | 'tall' => {
  // Pattern repeats every 12 items for visual consistency
  const patterns = [
    'featured', // 0 - Large hero product (2x2)
    'normal',   // 1
    'normal',   // 2
    'tall',     // 3 - Tall item (1x2)
    'normal',   // 4
    'normal',   // 5
    'featured', // 6 - Another featured
    'normal',   // 7
    'tall',     // 8
    'normal',   // 9
    'normal',   // 10
    'normal',   // 11
  ];

  return patterns[index % patterns.length] as 'normal' | 'featured' | 'tall';
};

// ============================================================================
// PRODUCT GRID LUXE COMPONENT
// ============================================================================

export function ProductGridLuxe({ products, columns = 4 }: ProductGridLuxeProps) {
  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  // Item animation
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  // Grid column classes based on columns prop
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid ${gridClasses[columns]} gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14 lg:gap-x-10 lg:gap-y-16`}
    >
      {products.map((product, index) => {
        const bentoSize = getBentoSize(index);

        // Determine grid span classes based on Bento size
        // Note: Featured and tall items are only applied on larger screens
        const spanClasses = {
          normal: '',
          featured: 'lg:col-span-2 lg:row-span-2',
          tall: 'lg:row-span-2',
        };

        return (
          <motion.div
            key={product.id}
            variants={itemVariants}
            className={spanClasses[bentoSize]}
          >
            <ProductCardLuxe
              id={product.id}
              slug={product.slug}
              name={product.name}
              brand={product.brand}
              price={product.price}
              originalPrice={product.originalPrice}
              currency={product.currency}
              image={product.image}
              hoverImage={product.hoverImage}
              badge={product.badge}
              rating={product.rating}
              reviewCount={product.reviewCount}
              colorSwatches={product.colorSwatches}
              className={bentoSize === 'featured' ? 'lg:scale-[1.02]' : ''}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ============================================================================
// SIMPLE GRID VARIANT (No Bento pattern)
// ============================================================================

export function ProductGridSimple({ products, columns = 4 }: ProductGridLuxeProps) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`grid ${gridClasses[columns]} gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14`}
    >
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.4 }}
        >
          <ProductCardLuxe
            id={product.id}
            slug={product.slug}
            name={product.name}
            brand={product.brand}
            price={product.price}
            originalPrice={product.originalPrice}
            currency={product.currency}
            image={product.image}
            hoverImage={product.hoverImage}
            badge={product.badge}
            rating={product.rating}
            reviewCount={product.reviewCount}
            colorSwatches={product.colorSwatches}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
