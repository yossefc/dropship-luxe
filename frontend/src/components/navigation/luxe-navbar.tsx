'use client';

// ============================================================================
// LUXE NAVBAR — Clinique-style: logo top, categories below, mega-menu dropdown
// ============================================================================

import { useState } from 'react';
import { Search, ShoppingBag, User, Heart, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useCartStore } from '@/lib/store/cart-store';
import { navigationCategories, type NavCategory } from './navigation-data';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { MobileDrawer } from './mobile-drawer';
import { cn } from '@/lib/utils';

export function LuxeNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { openCart, items } = useCartStore();
  const t = useTranslations();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  let hoverTimeout: NodeJS.Timeout | null = null;

  const handleMouseEnter = (id: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setActiveDropdown(id);
  };

  const handleMouseLeave = () => {
    hoverTimeout = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white">
        {/* Row 1: Announcement bar */}
        <div className="bg-[#1A1A1A] text-white py-1.5 text-center">
          <p className="text-[10px] tracking-wide">
            Livraison offerte dès 50€ d&apos;achat • Retours gratuits sous 30 jours
          </p>
        </div>

        {/* Row 2: Logo + icons */}
        <div className="border-b border-neutral-100">
          <div className="max-w-[1200px] mx-auto px-4 h-12 flex items-center justify-between">
            {/* Left: mobile menu */}
            <div className="flex items-center gap-3 w-[120px]">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-8 h-8 flex items-center justify-center"
                aria-label="Menu"
              >
                <Menu className="w-4 h-4 text-[#1A1A1A]" />
              </button>
              <button className="hidden sm:flex w-8 h-8 items-center justify-center" aria-label="Rechercher">
                <Search className="w-4 h-4 text-[#1A1A1A]" />
              </button>
            </div>

            {/* Center: Logo */}
            <Link href="/" className="font-serif text-xl tracking-wide text-[#1A1A1A]">
              Hayoss
            </Link>

            {/* Right: icons */}
            <div className="flex items-center gap-1 w-[120px] justify-end">
              <Link href="/account" className="hidden md:flex w-8 h-8 items-center justify-center" aria-label="Compte">
                <User className="w-4 h-4 text-[#1A1A1A]" />
              </Link>
              <Link href="/wishlist" className="hidden sm:flex w-8 h-8 items-center justify-center" aria-label="Favoris">
                <Heart className="w-4 h-4 text-[#1A1A1A]" />
              </Link>
              <button
                onClick={openCart}
                className="relative w-8 h-8 flex items-center justify-center"
                aria-label="Panier"
              >
                <ShoppingBag className="w-4 h-4 text-[#1A1A1A]" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#1A1A1A] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Category navigation (desktop only) */}
        <nav className="hidden lg:block border-b border-neutral-100 bg-white">
          <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-center gap-0">
            {navigationCategories.map((cat) => {
              const hasSub = cat.subcategories && cat.subcategories.length > 0;
              return (
                <div
                  key={cat.id}
                  className="relative"
                  onMouseEnter={() => hasSub && handleMouseEnter(cat.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  {hasSub ? (
                    <button
                      className={cn(
                        'px-4 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase transition-colors',
                        activeDropdown === cat.id
                          ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]'
                          : 'text-neutral-600 hover:text-[#1A1A1A] border-b-2 border-transparent'
                      )}
                    >
                      {cat.name}
                    </button>
                  ) : (
                    <Link
                      href={cat.href}
                      className="px-4 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase text-neutral-600 hover:text-[#1A1A1A] border-b-2 border-transparent hover:border-[#1A1A1A] transition-colors block"
                    >
                      {cat.name}
                    </Link>
                  )}

                  {/* Mega Menu Dropdown — full width */}
                  {hasSub && activeDropdown === cat.id && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-full pt-0 z-50"
                      style={{ width: '600px' }}
                      onMouseEnter={() => handleMouseEnter(cat.id)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="bg-white border border-neutral-100 shadow-lg">
                        {/* Header */}
                        <div className="px-6 py-3 border-b border-neutral-100">
                          <Link
                            href={cat.href}
                            className="text-xs font-medium tracking-[0.1em] uppercase text-[#1A1A1A] hover:underline"
                          >
                            Voir tout {cat.name}
                          </Link>
                        </div>

                        {/* Subcategories in 2 columns */}
                        <div className="px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-0">
                          {cat.subcategories?.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="block py-1.5 text-[12px] text-neutral-600 hover:text-[#1A1A1A] hover:underline transition-colors"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
