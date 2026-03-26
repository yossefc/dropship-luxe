'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

export default function WishlistPage() {
  const locale = useLocale();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Header */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#F5EDE8] to-[#FFFBF7]">
        <div className="max-w-[1440px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Heart className="w-8 h-8 text-[#B8927A]" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-[#2D2926] mb-4">
              {locale === 'fr' ? 'Ma Liste de Souhaits' : 'My Wishlist'}
            </h1>
            <p className="text-[#6B5B54] max-w-lg mx-auto">
              {locale === 'fr'
                ? 'Retrouvez ici tous vos produits favoris'
                : 'Find all your favorite products here'
              }
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-[1440px] mx-auto px-6 py-12 md:py-16">
        {wishlistItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#F5EDE8] flex items-center justify-center">
              <Heart className="w-12 h-12 text-[#D4C4B5]" />
            </div>
            <h2 className="font-serif text-2xl text-[#2D2926] mb-4">
              {locale === 'fr' ? 'Votre liste est vide' : 'Your wishlist is empty'}
            </h2>
            <p className="text-[#6B5B54] mb-8 max-w-md mx-auto">
              {locale === 'fr'
                ? 'Parcourez notre collection et ajoutez vos produits favoris en cliquant sur le coeur.'
                : 'Browse our collection and add your favorite products by clicking the heart icon.'
              }
            </p>
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#2D2926] text-white rounded-full font-medium hover:bg-[#B8927A] transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {locale === 'fr' ? 'Voir les collections' : 'Browse collections'}
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Wishlist items would be rendered here */}
          </div>
        )}
      </section>
    </div>
  );
}
