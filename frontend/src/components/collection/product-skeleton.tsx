'use client';

// ============================================================================
// PRODUCT SKELETON - Placeholders Elegants avec Animation Douce
// ============================================================================
// Skeletons luxueux qui clignotent doucement
// Design coherent avec l'esthetique "luxe chaleureux"
// ============================================================================

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// SKELETON SHIMMER EFFECT
// ============================================================================

// Custom shimmer animation for luxury feel
const shimmerVariants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 2,
      ease: 'linear',
    },
  },
};

// ============================================================================
// SINGLE PRODUCT SKELETON
// ============================================================================

interface ProductSkeletonProps {
  className?: string;
  featured?: boolean;
}

export function ProductSkeleton({ className, featured = false }: ProductSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('space-y-4', className)}
    >
      {/* Image Skeleton */}
      <motion.div
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        className={cn(
          'rounded-2xl overflow-hidden',
          featured ? 'aspect-square' : 'aspect-[3/4]'
        )}
        style={{
          background: 'linear-gradient(90deg, #F5EDE8 0%, #FDF8F5 50%, #F5EDE8 100%)',
          backgroundSize: '200% 100%',
        }}
      >
        {/* Inner subtle pattern */}
        <div className="w-full h-full bg-gradient-to-br from-transparent via-white/30 to-transparent" />
      </motion.div>

      {/* Text Skeleton - Brand */}
      <motion.div
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        className="h-3 w-20 rounded-full"
        style={{
          background: 'linear-gradient(90deg, #EDE4DC 0%, #F5EDE8 50%, #EDE4DC 100%)',
          backgroundSize: '200% 100%',
        }}
      />

      {/* Text Skeleton - Product Name */}
      <div className="space-y-2">
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-4 w-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #E8E4DF 0%, #F0EBE6 50%, #E8E4DF 100%)',
            backgroundSize: '200% 100%',
          }}
        />
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-4 w-3/4 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #E8E4DF 0%, #F0EBE6 50%, #E8E4DF 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      {/* Text Skeleton - Price */}
      <motion.div
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        className="h-5 w-16 rounded-full"
        style={{
          background: 'linear-gradient(90deg, #E0D6C8 0%, #EDE4DC 50%, #E0D6C8 100%)',
          backgroundSize: '200% 100%',
        }}
      />

      {/* Rating Skeleton */}
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="w-3 h-3 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #EDE4DC 0%, #F5EDE8 50%, #EDE4DC 100%)',
              backgroundSize: '200% 100%',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// PRODUCT SKELETON GRID
// ============================================================================

interface ProductSkeletonGridProps {
  count?: number;
  columns?: 2 | 3 | 4;
}

export function ProductSkeletonGrid({ count = 8, columns = 4 }: ProductSkeletonGridProps) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  // Stagger animation for skeleton items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-14',
        gridClasses[columns]
      )}
    >
      {[...Array(count)].map((_, index) => (
        <motion.div key={index} variants={itemVariants}>
          <ProductSkeleton featured={index === 0} />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// COLLECTION HERO SKELETON
// ============================================================================

export function CollectionHeroSkeleton() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-gradient-to-b from-[#FDF8F5] via-[#F5EDE8] to-[#FFFBF7]">
      <div className="text-center px-6 py-16 max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center justify-center gap-2">
          {[40, 60, 80].map((width, i) => (
            <motion.div
              key={i}
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              className="h-3 rounded-full"
              style={{
                width: `${width}px`,
                background: 'linear-gradient(90deg, #EDE4DC 0%, #F5EDE8 50%, #EDE4DC 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          ))}
        </div>

        {/* Icon Skeleton */}
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="w-20 h-20 mx-auto rounded-full"
          style={{
            background: 'linear-gradient(90deg, #E8E4DF 0%, #F0EBE6 50%, #E8E4DF 100%)',
            backgroundSize: '200% 100%',
          }}
        />

        {/* Title Skeleton */}
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-12 w-64 mx-auto rounded-full"
          style={{
            background: 'linear-gradient(90deg, #E0D6C8 0%, #EDE4DC 50%, #E0D6C8 100%)',
            backgroundSize: '200% 100%',
          }}
        />

        {/* Description Skeleton */}
        <div className="space-y-2 max-w-lg mx-auto">
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="h-4 w-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #EDE4DC 0%, #F5EDE8 50%, #EDE4DC 100%)',
              backgroundSize: '200% 100%',
            }}
          />
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="h-4 w-3/4 mx-auto rounded-full"
            style={{
              background: 'linear-gradient(90deg, #EDE4DC 0%, #F5EDE8 50%, #EDE4DC 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>

        {/* Badge Skeleton */}
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="h-8 w-32 mx-auto rounded-full"
          style={{
            background: 'linear-gradient(90deg, #E8E4DF 0%, #F0EBE6 50%, #E8E4DF 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// FILTERS SKELETON
// ============================================================================

export function FiltersSkeleton() {
  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E4DF]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="flex items-center justify-between gap-4 py-4">
          {/* Left - Category pills */}
          <div className="flex items-center gap-3 overflow-hidden">
            {[60, 80, 70, 90, 75].map((width, i) => (
              <motion.div
                key={i}
                variants={shimmerVariants}
                initial="initial"
                animate="animate"
                className="h-10 rounded-full flex-shrink-0"
                style={{
                  width: `${width}px`,
                  background: 'linear-gradient(90deg, #F5EDE8 0%, #FDF8F5 50%, #F5EDE8 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            ))}
          </div>

          {/* Right - Sort & count */}
          <div className="flex items-center gap-3">
            <motion.div
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              className="h-10 w-24 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #F5EDE8 0%, #FDF8F5 50%, #F5EDE8 100%)',
                backgroundSize: '200% 100%',
              }}
            />
            <motion.div
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              className="h-10 w-32 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #F5EDE8 0%, #FDF8F5 50%, #F5EDE8 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
