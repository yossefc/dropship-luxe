'use client';

// ============================================================================
// LUXE NAVBAR - Main Navigation Component
// ============================================================================
// Design: Clean, solid background, professional layout
// ============================================================================

import { useState } from 'react';
import { ShoppingBag, Menu, Search, Heart, User, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/lib/store/cart-store';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { MobileDrawer } from './mobile-drawer';
import { navigationCategories } from './navigation-data';

// ============================================================================
// DROPDOWN MENU COMPONENT
// ============================================================================

interface DropdownMenuProps {
  category: typeof navigationCategories[0];
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function DropdownMenu({ category, isOpen, onMouseEnter, onMouseLeave }: DropdownMenuProps) {
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {hasSubcategories ? (
        <button
          className={cn(
            'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors',
            isOpen
              ? 'text-[#B8927A]'
              : 'text-[#2D2926] hover:text-[#B8927A]'
          )}
        >
          {category.name}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      ) : (
        <Link
          href={category.href}
          className="px-3 py-2 text-sm font-medium text-[#2D2926] hover:text-[#B8927A] transition-colors"
        >
          {category.name}
        </Link>
      )}

      {/* Dropdown Panel */}
      {hasSubcategories && isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-2 min-w-[220px]">
            {/* View All Link */}
            <Link
              href={category.href}
              className="block px-4 py-2.5 text-sm font-medium text-[#B8927A] hover:bg-[#FDF8F5] border-b border-gray-100 mb-1"
            >
              Voir tout {category.name}
            </Link>

            {/* Subcategories */}
            {category.subcategories?.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                className="block px-4 py-2.5 text-sm text-[#2D2926] hover:bg-[#FDF8F5] hover:text-[#B8927A] transition-colors"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LUXE NAVBAR COMPONENT
// ============================================================================

export function LuxeNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { openCart, items } = useCartStore();
  const t = useTranslations();

  // Calculate total items in cart
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Dropdown handlers
  const handleMouseEnter = (categoryId: string) => {
    setActiveDropdown(categoryId);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  return (
    <>
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm">
        {/* Announcement Bar */}
        <div className="bg-[#2D2926] text-white py-2 text-center">
          <p className="text-xs font-medium tracking-wide">
            Livraison offerte dès 50€ d&apos;achat • Retours gratuits sous 30 jours
          </p>
        </div>

        {/* Main Navbar */}
        <div className="border-b border-gray-100">
          <div className="h-16 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
            {/* Left - Mobile Menu + Logo */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-5 h-5 text-[#2D2926]" />
              </button>

              {/* Logo */}
              <Link
                href="/"
                className="font-serif text-2xl font-semibold text-[#2D2926] hover:text-[#B8927A] transition-colors"
              >
                Hayoss
              </Link>
            </div>

            {/* Center - Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigationCategories.map((category) => (
                <DropdownMenu
                  key={category.id}
                  category={category}
                  isOpen={activeDropdown === category.id}
                  onMouseEnter={() => handleMouseEnter(category.id)}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </nav>

            {/* Right - Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                className="hidden sm:flex w-10 h-10 items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                aria-label="Rechercher"
              >
                <Search className="w-5 h-5 text-[#2D2926]" />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="hidden sm:flex w-10 h-10 items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                aria-label="Ma wishlist"
              >
                <Heart className="w-5 h-5 text-[#2D2926]" />
              </Link>

              {/* Account */}
              <Link
                href="/account"
                className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                aria-label="Mon compte"
              >
                <User className="w-5 h-5 text-[#2D2926]" />
              </Link>

              {/* Language Switcher */}
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              {/* Cart Button */}
              <button
                onClick={openCart}
                className="relative w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors"
                aria-label={t('common.accessibility.openCart')}
              >
                <ShoppingBag className="w-5 h-5 text-[#2D2926]" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#B8927A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Spacer for fixed navbar */}
      <div className="h-[88px]" /> {/* 64px navbar + 24px announcement bar */}
    </>
  );
}
