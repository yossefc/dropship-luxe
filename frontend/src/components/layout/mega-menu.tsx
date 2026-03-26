'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, User, Menu, X, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useCartStore } from '@/lib/store/cart-store';
import { LanguageSwitcher } from './language-switcher';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SubCategory {
  name: string;
  href: string;
  description?: string;
}

interface FeaturedProduct {
  name: string;
  image: string;
  price: string;
  href: string;
  badge?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  href: string;
  subcategories: SubCategory[];
  featured?: FeaturedProduct;
}

// ============================================================================
// Menu Data
// ============================================================================

const menuCategories: MenuCategory[] = [
  {
    id: 'skincare',
    name: 'Skincare',
    href: '/collections/skincare',
    subcategories: [
      { name: 'Serums', href: '/collections/skincare?filter=serums', description: 'Concentrated treatments' },
      { name: 'Moisturizers', href: '/collections/skincare?filter=moisturizers', description: 'Daily hydration' },
      { name: 'Cleansers', href: '/collections/skincare?filter=cleansers', description: 'Gentle cleansing' },
      { name: 'Masks', href: '/collections/skincare?filter=masks', description: 'Weekly treatments' },
      { name: 'Eye Care', href: '/collections/skincare?filter=eye-care', description: 'Delicate eye area' },
      { name: 'Sun Protection', href: '/collections/skincare?filter=spf', description: 'UV defense' },
    ],
    featured: {
      name: 'Vitamin C Glow Serum',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=500&fit=crop',
      price: '89',
      href: '/products/vitamin-c-serum',
      badge: 'Bestseller',
    },
  },
  {
    id: 'makeup',
    name: 'Makeup',
    href: '/collections/makeup',
    subcategories: [
      { name: 'Foundation', href: '/collections/makeup?filter=foundation', description: 'Flawless base' },
      { name: 'Lips', href: '/collections/makeup?filter=lips', description: 'Color & care' },
      { name: 'Eyes', href: '/collections/makeup?filter=eyes', description: 'Define & enhance' },
      { name: 'Cheeks', href: '/collections/makeup?filter=cheeks', description: 'Blush & bronzer' },
      { name: 'Brushes', href: '/collections/makeup?filter=brushes', description: 'Pro tools' },
    ],
    featured: {
      name: 'Silk Foundation',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=500&fit=crop',
      price: '65',
      href: '/products/silk-foundation',
      badge: 'New',
    },
  },
  {
    id: 'bodycare',
    name: 'Body Care',
    href: '/collections/body-care',
    subcategories: [
      { name: 'Body Oils', href: '/collections/body-care?filter=oils', description: 'Nourishing oils' },
      { name: 'Body Lotions', href: '/collections/body-care?filter=lotions', description: 'Daily moisture' },
      { name: 'Scrubs', href: '/collections/body-care?filter=scrubs', description: 'Gentle exfoliation' },
      { name: 'Hand Care', href: '/collections/body-care?filter=hands', description: 'Soft hands' },
    ],
    featured: {
      name: 'Rose Body Oil',
      image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=500&fit=crop',
      price: '75',
      href: '/products/rose-body-oil',
    },
  },
  {
    id: 'sets',
    name: 'Gift Sets',
    href: '/collections/sets',
    subcategories: [
      { name: 'Skincare Sets', href: '/collections/sets?filter=skincare', description: 'Complete routines' },
      { name: 'Travel Sets', href: '/collections/sets?filter=travel', description: 'On-the-go essentials' },
      { name: 'Gift Cards', href: '/gift-cards', description: 'Perfect gift' },
    ],
    featured: {
      name: 'The Glow Kit',
      image: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=400&h=500&fit=crop',
      price: '149',
      href: '/products/glow-kit',
      badge: 'Limited',
    },
  },
];

// ============================================================================
// Component
// ============================================================================

export function MegaMenu(): JSX.Element {
  const t = useTranslations();
  const { openCart, getTotalItems } = useCartStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalItems = getTotalItems();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveCategory(categoryId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 150);
  };

  const activeMenuData = menuCategories.find((cat) => cat.id === activeCategory);

  return (
    <>
      {/* Sticky Navbar */}
      <header
        ref={menuRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-neutral-100'
            : 'bg-white/70 backdrop-blur-md'
        )}
      >
        <nav className="max-w-[1440px] mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <span className="font-display text-2xl md:text-3xl tracking-wide text-primary-800">
                Hayoss
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {menuCategories.map((category) => (
                <div
                  key={category.id}
                  onMouseEnter={() => handleMouseEnter(category.id)}
                  onMouseLeave={handleMouseLeave}
                  className="relative"
                >
                  <Link
                    href={category.href}
                    className={cn(
                      'px-5 py-2 text-sm font-accent font-medium tracking-wide transition-colors relative',
                      activeCategory === category.id
                        ? 'text-accent-gold'
                        : 'text-primary-800 hover:text-accent-gold'
                    )}
                  >
                    {category.name}
                    {activeCategory === category.id && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent-gold"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                </div>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-primary-800" />
              </button>

              <Link
                href="/account"
                className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Account"
              >
                <User className="w-5 h-5 text-primary-800" />
              </Link>

              <LanguageSwitcher />

              <button
                onClick={openCart}
                className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                aria-label={t('common.accessibility.openCart')}
              >
                <ShoppingBag className="w-5 h-5 text-primary-800" />
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent-gold text-primary-800 text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </motion.span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-primary-800" />
                ) : (
                  <Menu className="w-5 h-5 text-primary-800" />
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Mega Menu Dropdown */}
        <AnimatePresence>
          {activeCategory && activeMenuData && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onMouseEnter={() => handleMouseEnter(activeCategory)}
              onMouseLeave={handleMouseLeave}
              className="absolute left-0 right-0 bg-white border-t border-neutral-100 shadow-xl"
            >
              <div className="max-w-[1440px] mx-auto px-6 py-10">
                <div className="grid grid-cols-12 gap-12">
                  {/* Subcategories */}
                  <div className="col-span-7">
                    <div className="grid grid-cols-3 gap-8">
                      {activeMenuData.subcategories.map((sub) => (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className="group"
                          onClick={() => setActiveCategory(null)}
                        >
                          <span className="block text-sm font-accent font-semibold text-primary-800 group-hover:text-accent-gold transition-colors">
                            {sub.name}
                          </span>
                          {sub.description && (
                            <span className="block text-xs text-neutral-500 mt-1">
                              {sub.description}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-neutral-100">
                      <Link
                        href={activeMenuData.href}
                        className="inline-flex items-center gap-2 text-sm font-accent font-semibold text-accent-gold hover:text-accent-gold/80 transition-colors"
                        onClick={() => setActiveCategory(null)}
                      >
                        Shop All {activeMenuData.name}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Featured Product */}
                  {activeMenuData.featured && (
                    <div className="col-span-5">
                      <Link
                        href={activeMenuData.featured.href}
                        className="group block relative"
                        onClick={() => setActiveCategory(null)}
                      >
                        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-neutral-100">
                          <Image
                            src={activeMenuData.featured.image}
                            alt={activeMenuData.featured.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {activeMenuData.featured.badge && (
                            <span className="absolute top-4 left-4 px-3 py-1 bg-accent-gold text-primary-800 text-xs font-accent font-semibold tracking-wider uppercase rounded-full">
                              {activeMenuData.featured.badge}
                            </span>
                          )}
                        </div>
                        <div className="mt-4">
                          <span className="text-xs text-neutral-500 uppercase tracking-wider">
                            Featured
                          </span>
                          <h3 className="font-heading text-lg font-medium text-primary-800 mt-1 group-hover:text-accent-gold transition-colors">
                            {activeMenuData.featured.name}
                          </h3>
                          <p className="text-sm text-primary-800 mt-1">
                            {activeMenuData.featured.price}
                          </p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <span className="font-display text-xl">Menu</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {menuCategories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <Link
                        href={category.href}
                        className="block text-lg font-heading font-medium text-primary-800"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {category.name}
                      </Link>
                      <div className="pl-4 space-y-2">
                        {category.subcategories.slice(0, 4).map((sub) => (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className="block text-sm text-neutral-600 hover:text-accent-gold"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header */}
      <div className="h-20" />
    </>
  );
}
