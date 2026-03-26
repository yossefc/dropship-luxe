'use client';

// ============================================================================
// DYNAMIC CATEGORY COLLECTION PAGE - Design Luxe avec Bento Grid Asymétrique
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronDown,
  ChevronRight,
  Grid3X3,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  X,
  ArrowUpDown
} from 'lucide-react';
import { BentoGrid, BentoProductCell } from '@/components/ui/bento-grid-luxe';
import { fullCatalog, getCategoryBySlug, type Category, type SubCategory } from '@/config/catalog-structure';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  images?: string[];
  categoryId: string;
  subCategoryId: string;
  badge?: 'new' | 'bestseller' | 'sale' | 'limited';
  rating?: number;
  importScore?: number;
  createdAt?: string;
}

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';
type ViewMode = 'bento' | 'grid-3' | 'grid-4';

// ============================================================================
// API URL
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ============================================================================
// CATEGORY COLLECTION PAGE COMPONENT
// ============================================================================

export default function CategoryCollectionPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations();
  const categorySlug = params.category as string;

  // Get category info from slug
  const category = useMemo(() => getCategoryBySlug(categorySlug), [categorySlug]);

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('bento');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedFilterSections, setExpandedFilterSections] = useState<string[]>(['subcategories', 'price']);

  // Fetch products for this category
  useEffect(() => {
    async function fetchProducts() {
      if (!category) return;

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products?category=${category.id}`);
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        if (data.success && data.data) {
          const mappedProducts: Product[] = data.data.map((p: any) => ({
            id: p.id,
            slug: p.translations?.[0]?.slug || p.aliexpressId,
            name: p.translations?.[0]?.name || p.name,
            brand: p.supplierName || 'Hayoss',
            price: p.sellingPrice,
            originalPrice: p.basePrice > p.sellingPrice ? p.basePrice * 2.5 : undefined,
            currency: p.currency || 'EUR',
            image: p.images?.[0] || '/images/placeholder.jpg',
            images: p.images,
            categoryId: category.id,
            subCategoryId: p.subCategoryId || 'general',
            badge: p.importScore >= 90 ? 'bestseller' : p.importScore >= 80 ? 'new' : undefined,
            rating: p.rating || 4.5,
            importScore: p.importScore,
            createdAt: p.createdAt,
          }));
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback: show empty state
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [category]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Sub-category filter
    if (selectedSubCategories.length > 0) {
      result = result.filter(p => selectedSubCategories.includes(p.subCategoryId));
    }

    // Price filter
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sort
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return b.id.localeCompare(a.id);
        });
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.importScore || 0) - (a.importScore || 0));
    }

    return result;
  }, [products, selectedSubCategories, priceRange, sortBy]);

  // Toggle subcategory selection
  const toggleSubCategory = (subId: string) => {
    setSelectedSubCategories(prev =>
      prev.includes(subId)
        ? prev.filter(id => id !== subId)
        : [...prev, subId]
    );
  };

  // Toggle filter section
  const toggleFilterSection = (sectionId: string) => {
    setExpandedFilterSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSubCategories([]);
    setPriceRange([0, 500]);
    setSortBy('featured');
  };

  const hasActiveFilters = selectedSubCategories.length > 0 || priceRange[0] > 0 || priceRange[1] < 500;

  // 404 if category not found
  if (!category) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="font-serif text-4xl text-[#1A1A1A] mb-4">Collection non trouvée</h1>
          <p className="text-neutral-600 mb-8">Cette catégorie n'existe pas ou a été déplacée.</p>
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-md hover:bg-neutral-800 transition-colors"
          >
            Voir toutes les collections
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const categoryName = locale === 'fr' ? category.nameFR : category.nameEN;

  // Determine grid based on view mode
  const getGridConfig = () => {
    switch (viewMode) {
      case 'grid-3':
        return { columns: 3 as const, gap: 'lg' as const };
      case 'grid-4':
        return { columns: 4 as const, gap: 'md' as const };
      case 'bento':
      default:
        return { columns: 4 as const, gap: 'lg' as const };
    }
  };

  // Calculate asymmetric spans for Bento layout
  const getBentoSpan = (index: number): 'default' | 'wide' | 'tall' | 'featured' => {
    if (viewMode !== 'bento') return 'default';

    // Create asymmetric pattern: first item featured, then alternating wide/tall
    const pattern = [
      'featured',  // 0 - Large hero product
      'default',   // 1
      'default',   // 2
      'tall',      // 3 - Tall item
      'wide',      // 4 - Wide item
      'default',   // 5
      'default',   // 6
      'default',   // 7
      'tall',      // 8 - Another tall
      'default',   // 9
      'wide',      // 10 - Another wide
      'default',   // 11
    ];

    return pattern[index % pattern.length] as 'default' | 'wide' | 'tall' | 'featured';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================== */}
      {/* HERO SECTION - Elegant Category Header */}
      {/* ================================================================== */}
      <section className="relative h-[50vh] min-h-[400px] bg-[#F8F7F5] flex items-center justify-center overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/40" />

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#B76E79]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-[#D4AF37]/5 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative text-center px-6 max-w-4xl"
        >
          {/* Breadcrumb */}
          <nav className="flex items-center justify-center gap-2 text-sm text-neutral-500 mb-6">
            <Link href="/" className="hover:text-[#B76E79] transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/collections" className="hover:text-[#B76E79] transition-colors">Collections</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#1A1A1A]">{categoryName}</span>
          </nav>

          {/* Category Icon/Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-white rounded-full shadow-lg"
          >
            <Sparkles className="w-7 h-7 text-[#B76E79]" />
          </motion.div>

          {/* Category Title - Elegant Serif */}
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-[#1A1A1A] font-light tracking-tight mb-4">
            {categoryName}
          </h1>

          {/* Category Description */}
          <p className="text-lg md:text-xl text-neutral-600 font-light max-w-2xl mx-auto leading-relaxed">
            {locale === 'fr'
              ? `Découvrez notre collection exclusive de ${categoryName.toLowerCase()}, sélectionnée avec soin pour sublimer votre beauté naturelle.`
              : `Discover our exclusive ${categoryName.toLowerCase()} collection, carefully curated to enhance your natural beauty.`
            }
          </p>

          {/* Product count badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm text-neutral-600 shadow-sm">
              <span className="w-2 h-2 bg-[#B76E79] rounded-full" />
              {filteredProducts.length} {filteredProducts.length > 1 ? 'produits' : 'produit'}
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* SUBCATEGORIES BAR - Horizontal Scrollable Pills */}
      {/* ================================================================== */}
      {category.subCategories && category.subCategories.length > 0 && (
        <section className="border-b border-neutral-100 sticky top-16 bg-white/95 backdrop-blur-md z-30">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
            <div className="flex items-center gap-3 overflow-x-auto py-5 scrollbar-hide">
              <button
                onClick={() => setSelectedSubCategories([])}
                className={cn(
                  'flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                  selectedSubCategories.length === 0
                    ? 'bg-[#1A1A1A] text-white shadow-md'
                    : 'bg-[#F5F4F2] text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {locale === 'fr' ? 'Tous' : 'All'}
              </button>
              {category.subCategories.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => toggleSubCategory(sub.id)}
                  className={cn(
                    'flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                    selectedSubCategories.includes(sub.id)
                      ? 'bg-[#B76E79] text-white shadow-md'
                      : 'bg-[#F5F4F2] text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  {locale === 'fr' ? sub.nameFR : sub.nameEN}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ================================================================== */}
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-10 md:py-16">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-10">
          {/* Left: Filter button + Active filters */}
          <div className="flex items-center gap-4">
            {/* Desktop Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'hidden md:flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-all duration-300',
                showFilters
                  ? 'bg-[#1A1A1A] text-white shadow-md'
                  : 'bg-[#F8F7F5] text-[#1A1A1A] hover:bg-neutral-200'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{locale === 'fr' ? 'Filtres' : 'Filters'}</span>
              {hasActiveFilters && (
                <span className="w-5 h-5 flex items-center justify-center bg-[#B76E79] text-white text-xs rounded-full">
                  {selectedSubCategories.length + (priceRange[0] > 0 || priceRange[1] < 500 ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className={cn(
                'md:hidden flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg',
                'bg-[#F8F7F5] text-[#1A1A1A]'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="w-5 h-5 flex items-center justify-center bg-[#B76E79] text-white text-xs rounded-full">
                  {selectedSubCategories.length + (priceRange[0] > 0 || priceRange[1] < 500 ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Active filter pills */}
            {hasActiveFilters && (
              <div className="hidden md:flex items-center gap-2">
                {selectedSubCategories.map(subId => {
                  const sub = category.subCategories?.find(s => s.id === subId);
                  if (!sub) return null;
                  return (
                    <button
                      key={subId}
                      onClick={() => toggleSubCategory(subId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B76E79]/10 text-[#B76E79] text-sm rounded-full hover:bg-[#B76E79]/20 transition-colors"
                    >
                      <span>{locale === 'fr' ? sub.nameFR : sub.nameEN}</span>
                      <X className="w-3 h-3" />
                    </button>
                  );
                })}
                {(priceRange[0] > 0 || priceRange[1] < 500) && (
                  <button
                    onClick={() => setPriceRange([0, 500])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B76E79]/10 text-[#B76E79] text-sm rounded-full hover:bg-[#B76E79]/20 transition-colors"
                  >
                    <span>{priceRange[0]}€ - {priceRange[1]}€</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-neutral-500 hover:text-[#B76E79] transition-colors ml-2"
                >
                  {locale === 'fr' ? 'Tout effacer' : 'Clear all'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Sort + View Mode */}
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <ArrowUpDown className="w-4 h-4 hidden sm:block" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-transparent font-medium pr-6 cursor-pointer focus:outline-none"
                >
                  <option value="featured">{locale === 'fr' ? 'Mis en avant' : 'Featured'}</option>
                  <option value="newest">{locale === 'fr' ? 'Nouveautés' : 'Newest'}</option>
                  <option value="price-asc">{locale === 'fr' ? 'Prix croissant' : 'Price: Low to High'}</option>
                  <option value="price-desc">{locale === 'fr' ? 'Prix décroissant' : 'Price: High to Low'}</option>
                  <option value="rating">{locale === 'fr' ? 'Mieux notés' : 'Top Rated'}</option>
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden lg:flex items-center gap-1 border-l border-neutral-200 pl-4">
              <button
                onClick={() => setViewMode('bento')}
                className={cn(
                  'p-2.5 rounded-lg transition-all duration-300',
                  viewMode === 'bento' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-neutral-100'
                )}
                aria-label="Vue Bento"
                title="Affichage Bento"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="8" height="8" rx="1" />
                  <rect x="13" y="3" width="8" height="4" rx="1" />
                  <rect x="13" y="9" width="8" height="8" rx="1" />
                  <rect x="3" y="13" width="8" height="4" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid-3')}
                className={cn(
                  'p-2.5 rounded-lg transition-all duration-300',
                  viewMode === 'grid-3' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-neutral-100'
                )}
                aria-label="Vue 3 colonnes"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid-4')}
                className={cn(
                  'p-2.5 rounded-lg transition-all duration-300',
                  viewMode === 'grid-4' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-neutral-100'
                )}
                aria-label="Vue 4 colonnes"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area with Sidebar */}
        <div className="flex gap-10">
          {/* ============================================================ */}
          {/* SIDEBAR FILTERS (Desktop) */}
          {/* ============================================================ */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="hidden md:block flex-shrink-0 overflow-hidden"
              >
                <div className="w-[300px] pr-8">
                  {/* Filter Header */}
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200">
                    <h2 className="font-serif text-lg text-[#1A1A1A]">
                      {locale === 'fr' ? 'Affiner' : 'Refine'}
                    </h2>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-[#B76E79] hover:underline"
                      >
                        {locale === 'fr' ? 'Réinitialiser' : 'Reset'}
                      </button>
                    )}
                  </div>

                  {/* Subcategories Filter */}
                  {category.subCategories && category.subCategories.length > 0 && (
                    <div className="mb-6">
                      <button
                        onClick={() => toggleFilterSection('subcategories')}
                        className="w-full flex items-center justify-between py-3"
                      >
                        <span className="text-sm font-semibold tracking-wide uppercase text-[#1A1A1A]">
                          {locale === 'fr' ? 'Type de produit' : 'Product Type'}
                        </span>
                        <ChevronDown className={cn(
                          'w-4 h-4 text-neutral-400 transition-transform duration-300',
                          expandedFilterSections.includes('subcategories') && 'rotate-180'
                        )} />
                      </button>
                      <AnimatePresence>
                        {expandedFilterSections.includes('subcategories') && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="py-2 space-y-1">
                              {category.subCategories.map(sub => (
                                <label
                                  key={sub.id}
                                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer group hover:bg-[#F8F7F5] transition-colors"
                                >
                                  <div className={cn(
                                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
                                    selectedSubCategories.includes(sub.id)
                                      ? 'bg-[#B76E79] border-[#B76E79]'
                                      : 'border-neutral-300 group-hover:border-[#B76E79]'
                                  )}>
                                    {selectedSubCategories.includes(sub.id) && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedSubCategories.includes(sub.id)}
                                    onChange={() => toggleSubCategory(sub.id)}
                                    className="sr-only"
                                  />
                                  <span className="text-sm text-neutral-700 group-hover:text-[#1A1A1A] transition-colors">
                                    {locale === 'fr' ? sub.nameFR : sub.nameEN}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Price Filter */}
                  <div className="mb-6">
                    <button
                      onClick={() => toggleFilterSection('price')}
                      className="w-full flex items-center justify-between py-3"
                    >
                      <span className="text-sm font-semibold tracking-wide uppercase text-[#1A1A1A]">
                        {locale === 'fr' ? 'Prix' : 'Price'}
                      </span>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-neutral-400 transition-transform duration-300',
                        expandedFilterSections.includes('price') && 'rotate-180'
                      )} />
                    </button>
                    <AnimatePresence>
                      {expandedFilterSections.includes('price') && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="py-4">
                            {/* Price inputs */}
                            <div className="flex items-center gap-4 mb-6">
                              <div className="flex-1">
                                <label className="text-xs text-neutral-500 mb-1.5 block">Min (€)</label>
                                <input
                                  type="number"
                                  value={priceRange[0]}
                                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                  className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20 focus:border-[#B76E79] transition-all"
                                  min={0}
                                />
                              </div>
                              <span className="text-neutral-300 mt-5">—</span>
                              <div className="flex-1">
                                <label className="text-xs text-neutral-500 mb-1.5 block">Max (€)</label>
                                <input
                                  type="number"
                                  value={priceRange[1]}
                                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                  className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20 focus:border-[#B76E79] transition-all"
                                  min={0}
                                />
                              </div>
                            </div>

                            {/* Price Range Slider */}
                            <div className="relative pt-2">
                              <input
                                type="range"
                                min={0}
                                max={500}
                                value={priceRange[1]}
                                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-[#B76E79]"
                              />
                              <div
                                className="absolute top-2 left-0 h-1.5 bg-[#B76E79] rounded-full pointer-events-none"
                                style={{ width: `${(priceRange[1] / 500) * 100}%` }}
                              />
                            </div>

                            {/* Quick price buttons */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              {[50, 100, 200, 500].map(price => (
                                <button
                                  key={price}
                                  onClick={() => setPriceRange([0, price])}
                                  className={cn(
                                    'px-3 py-1.5 text-xs rounded-full transition-all',
                                    priceRange[1] === price && priceRange[0] === 0
                                      ? 'bg-[#B76E79] text-white'
                                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                  )}
                                >
                                  &lt; {price}€
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* PRODUCTS GRID - Bento Asymétrique */}
          {/* ============================================================ */}
          <div className="flex-1 min-w-0">
            {loading ? (
              // Loading state with skeleton
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-neutral-200 rounded-xl mb-4" />
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-neutral-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              // Empty state
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-[#F8F7F5] rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#B76E79]/50" />
                </div>
                <h3 className="font-serif text-2xl text-[#1A1A1A] mb-3">
                  {locale === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
                </h3>
                <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                  {locale === 'fr'
                    ? 'Essayez de modifier vos filtres ou explorez d\'autres catégories.'
                    : 'Try adjusting your filters or explore other categories.'
                  }
                </p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  {locale === 'fr' ? 'Réinitialiser les filtres' : 'Reset filters'}
                </button>
              </motion.div>
            ) : (
              // Products Bento Grid
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <BentoGrid columns={getGridConfig().columns} gap={getGridConfig().gap}>
                  {filteredProducts.map((product, index) => (
                    <BentoProductCell
                      key={product.id}
                      id={product.id}
                      slug={product.slug}
                      name={product.name}
                      brand={product.brand}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      currency={product.currency}
                      image={product.image}
                      badge={product.badge}
                      rating={product.rating}
                      span={getBentoSpan(index)}
                    />
                  ))}
                </BentoGrid>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* MOBILE FILTERS DRAWER */}
      {/* ================================================================== */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed right-0 top-0 bottom-0 w-[85%] max-w-md bg-white z-50 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
                <h2 className="font-serif text-xl text-[#1A1A1A]">
                  {locale === 'fr' ? 'Filtres' : 'Filters'}
                </h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 -mr-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="px-6 py-6">
                {/* Subcategories */}
                {category.subCategories && category.subCategories.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold tracking-wide uppercase text-[#1A1A1A] mb-4">
                      {locale === 'fr' ? 'Type de produit' : 'Product Type'}
                    </h3>
                    <div className="space-y-2">
                      {category.subCategories.map(sub => (
                        <label
                          key={sub.id}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                        >
                          <div className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                            selectedSubCategories.includes(sub.id)
                              ? 'bg-[#B76E79] border-[#B76E79]'
                              : 'border-neutral-300'
                          )}>
                            {selectedSubCategories.includes(sub.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedSubCategories.includes(sub.id)}
                            onChange={() => toggleSubCategory(sub.id)}
                            className="sr-only"
                          />
                          <span className="text-sm text-neutral-700">
                            {locale === 'fr' ? sub.nameFR : sub.nameEN}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-[#1A1A1A] mb-4">
                    {locale === 'fr' ? 'Prix' : 'Price'}
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg"
                        placeholder="Min"
                        min={0}
                      />
                    </div>
                    <span className="text-neutral-300">—</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg"
                        placeholder="Max"
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[50, 100, 200, 500].map(price => (
                      <button
                        key={price}
                        onClick={() => setPriceRange([0, price])}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-full transition-all',
                          priceRange[1] === price && priceRange[0] === 0
                            ? 'bg-[#B76E79] text-white'
                            : 'bg-neutral-100 text-neutral-600'
                        )}
                      >
                        &lt; {price}€
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="sticky bottom-0 bg-white border-t border-neutral-100 px-6 py-4 flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-3 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  {locale === 'fr' ? 'Réinitialiser' : 'Reset'}
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  {locale === 'fr' ? `Voir ${filteredProducts.length} produits` : `See ${filteredProducts.length} products`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* RELATED CATEGORIES SECTION */}
      {/* ================================================================== */}
      <section className="bg-[#F8F7F5] py-16 md:py-24">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] mb-4">
              {locale === 'fr' ? 'Explorer d\'autres collections' : 'Explore other collections'}
            </h2>
            <p className="text-neutral-600 max-w-lg mx-auto">
              {locale === 'fr'
                ? 'Découvrez nos autres gammes de produits soigneusement sélectionnés.'
                : 'Discover our other ranges of carefully selected products.'
              }
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {fullCatalog
              .filter(cat => cat.id !== category.id)
              .slice(0, 4)
              .map((cat, index) => (
                <Link
                  key={cat.id}
                  href={`/collections/${cat.slug}`}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/60 via-transparent to-transparent z-10" />
                  <div className="absolute inset-0 bg-[#F5F4F2] flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-[#B76E79]/20" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    <h3 className="font-serif text-xl md:text-2xl text-white mb-1 group-hover:translate-y-[-4px] transition-transform duration-300">
                      {locale === 'fr' ? cat.nameFR : cat.nameEN}
                    </h3>
                    <span className="text-white/70 text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {locale === 'fr' ? 'Découvrir' : 'Discover'}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
