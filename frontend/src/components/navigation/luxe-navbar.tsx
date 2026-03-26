'use client';

// ============================================================================
// LUXE NAVBAR - Main Navigation Component
// ============================================================================
// Combine MegaMenu (desktop) + MobileDrawer (mobile)
// Design: Luxe Minimaliste avec transition fluide au scroll
// ============================================================================

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ShoppingBag, Menu, Search, Heart, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/lib/store/cart-store';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { MegaMenu } from './mega-menu';
import { MobileDrawer } from './mobile-drawer';

// ============================================================================
// LUXE NAVBAR COMPONENT
// ============================================================================

export function LuxeNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { openCart, items } = useCartStore();
  const t = useTranslations();

  // Calculate total items in cart
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll progress for subtle animations
  const { scrollY } = useScroll();
  const navbarBgOpacity = useTransform(scrollY, [0, 50], [0.8, 0.98]);

  return (
    <>
      {/* Navbar */}
      <motion.header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
          isScrolled
            ? 'shadow-sm border-b border-[#E8E4DF]/50'
            : 'border-b border-transparent'
        )}
        style={{
          backgroundColor: `rgba(255, 251, 247, ${navbarBgOpacity.get()})`,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Top Bar - Optional Announcement */}
        <div className="bg-[#2D2926] text-white py-2 text-center">
          <p className="text-xs font-accent tracking-wide">
            Livraison offerte dès 50€ d&apos;achat • Retours gratuits sous 30 jours
          </p>
        </div>

        {/* Main Navbar */}
        <div className="h-[72px] max-w-[1440px] mx-auto px-4 lg:px-8 flex items-center justify-between">
          {/* Left - Mobile Menu Button + Logo */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center hover:bg-[#FDF8F5] rounded-full transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-[#2D2926]" />
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="font-display text-xl md:text-2xl tracking-wide text-[#2D2926] hover:text-[#B8927A] transition-colors"
            >
              {t('common.brand.name')}
            </Link>
          </div>

          {/* Center - Desktop Navigation (MegaMenu) */}
          <div className="hidden lg:block absolute left-1/2 -translate-x-1/2">
            <MegaMenu />
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button
              className="hidden sm:flex w-10 h-10 items-center justify-center hover:bg-[#FDF8F5] rounded-full transition-colors"
              aria-label="Rechercher"
            >
              <Search className="w-5 h-5 text-[#2D2926]" />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="hidden sm:flex w-10 h-10 items-center justify-center hover:bg-[#FDF8F5] rounded-full transition-colors"
              aria-label="Ma wishlist"
            >
              <Heart className="w-5 h-5 text-[#2D2926]" />
            </Link>

            {/* Account */}
            <Link
              href="/account"
              className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-[#FDF8F5] rounded-full transition-colors"
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
              className="relative w-10 h-10 flex items-center justify-center hover:bg-[#FDF8F5] rounded-full transition-colors"
              aria-label={t('common.accessibility.openCart')}
            >
              <ShoppingBag className="w-5 h-5 text-[#2D2926]" />
              {/* Cart Badge */}
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#B8927A] text-white text-[10px] font-accent font-bold rounded-full flex items-center justify-center"
                >
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Spacer for fixed navbar */}
      <div className="h-[calc(72px+32px)]" /> {/* 72px navbar + 32px announcement bar */}
    </>
  );
}
