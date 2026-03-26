'use client';

// ============================================================================
// MEGA MENU COMPONENT - Desktop Navigation
// ============================================================================
// Design: Luxe Minimaliste avec wide spacing
// Animation: Fade-in élégant avec framer-motion
// Typography: Serif pour catégories principales, Sans-serif pour sous-catégories
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { navigationCategories, type NavCategory } from './navigation-data';

// ============================================================================
// MEGA MENU PANEL
// ============================================================================

interface MegaMenuPanelProps {
  category: NavCategory;
  isOpen: boolean;
  onClose: () => void;
}

function MegaMenuPanel({ category, isOpen, onClose }: MegaMenuPanelProps) {
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-[72px] bg-black/10 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute top-full left-0 right-0 bg-white shadow-xl z-50 border-t border-[#E8E4DF]"
          >
            <div className="max-w-[1440px] mx-auto px-8 lg:px-16 py-10">
              <div className="grid grid-cols-12 gap-12">
                {/* Left Side - Image */}
                {category.image && (
                  <div className="col-span-4">
                    <Link
                      href={category.href}
                      onClick={onClose}
                      className="block relative overflow-hidden rounded-xl group"
                    >
                      <div className="aspect-[4/5] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={category.image.src}
                          alt={category.image.alt}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        {/* Text overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <p className="text-white/80 text-xs uppercase tracking-[0.2em] font-accent mb-2">
                            Découvrir
                          </p>
                          <h3 className="text-white font-display text-2xl">
                            {category.name}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Right Side - Subcategories */}
                {hasSubcategories && (
                  <div className={cn('col-span-8', !category.image && 'col-span-12')}>
                    <div className="mb-6">
                      <h4 className="font-display text-xl text-[#2D2926] mb-1">
                        {category.name}
                      </h4>
                      <p className="text-sm text-[#6B5B54]">
                        Découvrez notre sélection
                      </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                      {category.subcategories?.map((sub, index) => (
                        <motion.div
                          key={sub.href}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                          <Link
                            href={sub.href}
                            onClick={onClose}
                            className="group block p-4 -mx-4 rounded-lg hover:bg-[#FDF8F5] transition-colors duration-300"
                          >
                            <h5 className="font-accent font-medium text-[#2D2926] group-hover:text-[#B8927A] transition-colors">
                              {sub.name}
                            </h5>
                            {sub.description && (
                              <p className="text-sm text-[#6B5B54] mt-1 line-clamp-1">
                                {sub.description}
                              </p>
                            )}
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    {/* View All Link */}
                    <div className="mt-8 pt-6 border-t border-[#E8E4DF]">
                      <Link
                        href={category.href}
                        onClick={onClose}
                        className="inline-flex items-center gap-2 text-sm font-accent font-medium text-[#B8927A] hover:text-[#A07A64] transition-colors"
                      >
                        Voir toute la collection {category.name}
                        <motion.span
                          initial={{ x: 0 }}
                          whileHover={{ x: 4 }}
                          className="inline-block"
                        >
                          →
                        </motion.span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Simple category without subcategories */}
                {!hasSubcategories && category.image && (
                  <div className="col-span-8 flex items-center">
                    <div>
                      <h4 className="font-display text-3xl text-[#2D2926] mb-4">
                        {category.name}
                      </h4>
                      <p className="text-[#6B5B54] mb-6 max-w-md">
                        Découvrez notre sélection exclusive de {category.name.toLowerCase()},
                        soigneusement choisis pour sublimer votre beauté.
                      </p>
                      <Link
                        href={category.href}
                        onClick={onClose}
                        className="inline-flex items-center gap-3 px-6 py-3 bg-[#2D2926] text-white rounded-full font-accent text-sm hover:bg-[#B8927A] transition-colors duration-300"
                      >
                        Explorer la collection
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MEGA MENU ITEM
// ============================================================================

interface MegaMenuItemProps {
  category: NavCategory;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
}

function MegaMenuItem({
  category,
  isActive,
  onMouseEnter,
  onMouseLeave,
  onClose,
}: MegaMenuItemProps) {
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Main Link */}
      {hasSubcategories ? (
        <button
          className={cn(
            'flex items-center gap-1.5 py-2 font-display text-[15px] tracking-wide transition-colors duration-200',
            isActive ? 'text-[#B8927A]' : 'text-[#2D2926] hover:text-[#B8927A]',
            category.featured && 'font-medium'
          )}
        >
          {category.name}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isActive && 'rotate-180'
            )}
          />
        </button>
      ) : (
        <Link
          href={category.href}
          className={cn(
            'block py-2 font-display text-[15px] tracking-wide transition-colors duration-200',
            'text-[#2D2926] hover:text-[#B8927A]',
            category.featured && 'font-medium'
          )}
        >
          {category.name}
        </Link>
      )}

      {/* Underline indicator */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B8927A]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ originX: 0.5 }}
      />

      {/* Mega Menu Panel */}
      {hasSubcategories && (
        <MegaMenuPanel category={category} isOpen={isActive} onClose={onClose} />
      )}
    </div>
  );
}

// ============================================================================
// MEGA MENU NAVIGATION
// ============================================================================

export function MegaMenu() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Handle mouse enter with delay
  const handleMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveCategory(categoryId);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 150);
  };

  // Close menu
  const handleClose = () => {
    setActiveCategory(null);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <nav ref={navRef} className="hidden lg:flex items-center gap-8">
      {navigationCategories.map((category) => (
        <MegaMenuItem
          key={category.id}
          category={category}
          isActive={activeCategory === category.id}
          onMouseEnter={() => handleMouseEnter(category.id)}
          onMouseLeave={handleMouseLeave}
          onClose={handleClose}
        />
      ))}
    </nav>
  );
}
