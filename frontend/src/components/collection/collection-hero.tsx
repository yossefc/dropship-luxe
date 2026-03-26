'use client';

// ============================================================================
// COLLECTION HERO - En-tete Elegant avec Design Luxe Chaleureux
// ============================================================================
// Palette Rose Gold Romance : tons creme, beige, accents or rose
// Typographie Serif elegante pour le prestige
// ============================================================================

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';
import { type Category } from '@/config/catalog-structure';

interface CollectionHeroProps {
  category: Category;
  productCount: number;
}

export function CollectionHero({ category, productCount }: CollectionHeroProps) {
  const locale = useLocale();
  const categoryName = locale === 'fr' ? category.nameFR : category.nameEN;

  // Category-specific accent colors (Rose Gold Romance palette)
  const accentColors: Record<string, { primary: string; secondary: string; gradient: string }> = {
    skincare: {
      primary: '#B8927A',      // Warm rose gold
      secondary: '#E8D5C4',    // Soft cream
      gradient: 'from-[#FDF8F5] via-[#F5EDE8] to-[#EDE4DC]',
    },
    makeup: {
      primary: '#C4908B',      // Dusty rose
      secondary: '#F5E1DD',    // Blush pink
      gradient: 'from-[#FDF5F5] via-[#F9EDED] to-[#F3E5E3]',
    },
    'body-care': {
      primary: '#A89F8A',      // Warm taupe
      secondary: '#E5DFD4',    // Sand beige
      gradient: 'from-[#FAF8F5] via-[#F5F2ED] to-[#EDE9E3]',
    },
    'beauty-tools': {
      primary: '#9B8B7A',      // Bronze
      secondary: '#E0D6C8',    // Champagne
      gradient: 'from-[#F9F7F4] via-[#F3EFE9] to-[#EBE5DC]',
    },
  };

  const colors = accentColors[category.id] || accentColors.skincare;

  // Category descriptions (warm and inviting)
  const descriptions: Record<string, { fr: string; en: string }> = {
    skincare: {
      fr: 'Reveillez l\'eclat naturel de votre peau avec nos soins d\'exception, formules pour sublimer votre beaute au quotidien.',
      en: 'Awaken your skin\'s natural radiance with our exceptional skincare, formulated to enhance your daily beauty ritual.',
    },
    makeup: {
      fr: 'Exprimez votre beaute unique avec notre collection de maquillage raffine, cree pour sublimer chaque instant.',
      en: 'Express your unique beauty with our refined makeup collection, created to elevate every moment.',
    },
    'body-care': {
      fr: 'Offrez a votre corps le luxe qu\'il merite avec nos soins enveloppants aux textures precieuses.',
      en: 'Give your body the luxury it deserves with our enveloping treatments and precious textures.',
    },
    'beauty-tools': {
      fr: 'Decouvrez nos accessoires beaute d\'exception, selectionnes pour transformer votre rituel en moment precieux.',
      en: 'Discover our exceptional beauty tools, selected to transform your ritual into a precious moment.',
    },
  };

  const description = descriptions[category.id] || descriptions.skincare;

  return (
    <section className={`relative min-h-[50vh] md:min-h-[55vh] flex items-center justify-center overflow-hidden bg-gradient-to-b ${colors.gradient}`}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient orbs */}
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: colors.primary }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: colors.secondary }}
        />

        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${colors.primary} 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-16 md:py-20 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 text-sm mb-8"
        >
          <Link
            href="/"
            className="text-[#6B5B54] hover:text-[#2D2926] transition-colors"
          >
            Accueil
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#B8A99A]" />
          <Link
            href="/collections"
            className="text-[#6B5B54] hover:text-[#2D2926] transition-colors"
          >
            Collections
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#B8A99A]" />
          <span className="text-[#2D2926] font-medium">{categoryName}</span>
        </motion.nav>

        {/* Category Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mb-6 rounded-full shadow-lg"
          style={{
            backgroundColor: 'white',
            boxShadow: `0 8px 32px ${colors.primary}20`,
          }}
        >
          <Sparkles
            className="w-7 h-7 md:w-8 md:h-8"
            style={{ color: colors.primary }}
          />
        </motion.div>

        {/* Category Title - Elegant Serif */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-[#2D2926] font-light tracking-tight mb-6"
        >
          {categoryName}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-base md:text-lg lg:text-xl text-[#6B5B54] font-light max-w-2xl mx-auto leading-relaxed mb-8"
        >
          {locale === 'fr' ? description.fr : description.en}
        </motion.p>

        {/* Product Count Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <span
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium shadow-sm"
            style={{
              backgroundColor: 'white',
              color: colors.primary,
              boxShadow: `0 4px 20px ${colors.primary}15`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: colors.primary }}
            />
            {productCount} {productCount > 1 ? 'produits' : 'produit'} {locale === 'fr' ? 'disponibles' : 'available'}
          </span>
        </motion.div>
      </div>

      {/* Bottom fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFFBF7] to-transparent" />
    </section>
  );
}
