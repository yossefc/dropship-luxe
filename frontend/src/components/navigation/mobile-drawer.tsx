'use client';

// ============================================================================
// MOBILE DRAWER NAVIGATION
// ============================================================================
// Off-canvas navigation élégant pour mobile
// Design: Luxe Minimaliste avec animations fluides
// Accordéon pour sous-catégories
// ============================================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { navigationCategories, type NavCategory } from './navigation-data';

// ============================================================================
// MOBILE ACCORDION ITEM
// ============================================================================

interface AccordionItemProps {
  category: NavCategory;
  onClose: () => void;
}

function AccordionItem({ category, onClose }: AccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  return (
    <div className="border-b border-[#E8E4DF] last:border-b-0">
      {hasSubcategories ? (
        <>
          {/* Accordion Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-5 px-6"
          >
            <span
              className={cn(
                'font-display text-lg tracking-wide text-[#2D2926]',
                category.featured && 'text-[#B8927A]'
              )}
            >
              {category.name}
            </span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-[#6B5B54]" />
            </motion.div>
          </button>

          {/* Accordion Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="bg-[#FDF8F5] py-4 px-6">
                  {/* View All Link */}
                  <Link
                    href={category.href}
                    onClick={onClose}
                    className="flex items-center gap-2 py-3 text-sm font-accent font-medium text-[#B8927A]"
                  >
                    Tout voir
                    <ChevronRight className="w-4 h-4" />
                  </Link>

                  {/* Subcategories */}
                  <div className="space-y-1">
                    {category.subcategories?.map((sub, index) => (
                      <motion.div
                        key={sub.href}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={sub.href}
                          onClick={onClose}
                          className="flex items-center justify-between py-3 text-[#2D2926] hover:text-[#B8927A] transition-colors"
                        >
                          <span className="font-accent text-[15px]">{sub.name}</span>
                          <ChevronRight className="w-4 h-4 text-[#6B5B54]" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Simple Link (no subcategories) */
        <Link
          href={category.href}
          onClick={onClose}
          className="flex items-center justify-between py-5 px-6"
        >
          <span
            className={cn(
              'font-display text-lg tracking-wide text-[#2D2926]',
              category.featured && 'text-[#B8927A]'
            )}
          >
            {category.name}
          </span>
          <ChevronRight className="w-5 h-5 text-[#6B5B54]" />
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// MOBILE DRAWER
// ============================================================================

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[400px] bg-white z-50 lg:hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-[72px] px-6 border-b border-[#E8E4DF]">
              <Link href="/" onClick={onClose} className="font-display text-2xl text-[#2D2926]">
                Dropship Luxe
              </Link>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#FDF8F5] transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5 text-[#2D2926]" />
              </button>
            </div>

            {/* Navigation */}
            <div className="h-[calc(100%-72px)] overflow-y-auto overscroll-contain">
              {/* Categories */}
              <nav className="py-4">
                {navigationCategories.map((category) => (
                  <AccordionItem
                    key={category.id}
                    category={category}
                    onClose={onClose}
                  />
                ))}
              </nav>

              {/* Footer Links */}
              <div className="px-6 py-8 mt-auto border-t border-[#E8E4DF] bg-[#FDF8F5]">
                <div className="space-y-4">
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="flex items-center gap-3 text-[#2D2926] font-accent"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mon compte
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={onClose}
                    className="flex items-center gap-3 text-[#2D2926] font-accent"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Ma wishlist
                  </Link>
                  <Link
                    href="/faq"
                    onClick={onClose}
                    className="flex items-center gap-3 text-[#2D2926] font-accent"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Aide & FAQ
                  </Link>
                </div>

                {/* Contact */}
                <div className="mt-8 pt-6 border-t border-[#E8E4DF]">
                  <p className="text-xs text-[#6B5B54] uppercase tracking-[0.15em] mb-3">
                    Service client
                  </p>
                  <a
                    href="mailto:contact@dropshipluxe.com"
                    className="text-[#B8927A] font-accent hover:underline"
                  >
                    contact@dropshipluxe.com
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
