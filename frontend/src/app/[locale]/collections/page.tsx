'use client';

// ============================================================================
// COLLECTIONS PAGE - Catalogue avec Filtres Premium
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Filter, X, ChevronDown, Grid3X3, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { BentoGrid, BentoProductCell, BentoCategoryCell } from '@/components/ui/bento-grid-luxe';
import { fullCatalog, type Category, type SubCategory } from '@/config/catalog-structure';
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
}

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';
type ViewMode = 'grid-4' | 'grid-3' | 'grid-2';

// ============================================================================
// MOCK DATA (En production, vient de l'API)
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Fallback products si l'API n'est pas disponible
const fallbackProducts: Product[] = [
  {
    id: '1',
    slug: 'serum-eclat-vitamine-c',
    name: 'Sérum Éclat Vitamine C',
    brand: 'Hayoss',
    price: 89,
    originalPrice: 119,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop'],
    categoryId: 'skincare',
    subCategoryId: 'serums',
    badge: 'bestseller',
    rating: 4.8,
    importScore: 95,
  },
  {
    id: '2',
    slug: 'creme-nuit-regenerante',
    name: 'Crème Nuit Régénérante',
    brand: 'Hayoss',
    price: 125,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop'],
    categoryId: 'skincare',
    subCategoryId: 'moisturizers',
    badge: 'new',
    rating: 4.9,
    importScore: 92,
  },
  {
    id: '3',
    slug: 'huile-visage-rose-musquee',
    name: 'Huile Visage Rose Musquée',
    brand: 'Hayoss',
    price: 75,
    originalPrice: 95,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=800&fit=crop'],
    categoryId: 'skincare',
    subCategoryId: 'oils',
    rating: 4.7,
    importScore: 88,
  },
  {
    id: '4',
    slug: 'masque-hydratant-aloe',
    name: 'Masque Hydratant Aloe Vera',
    brand: 'Hayoss',
    price: 45,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop'],
    categoryId: 'skincare',
    subCategoryId: 'masks',
    badge: 'new',
    rating: 4.6,
    importScore: 85,
  },
  {
    id: '5',
    slug: 'lotion-tonique-purifiante',
    name: 'Lotion Tonique Purifiante',
    brand: 'Hayoss',
    price: 55,
    originalPrice: 70,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1570194065650-d99fb4b38b15?w=600&h=800&fit=crop'],
    categoryId: 'skincare',
    subCategoryId: 'toners',
    rating: 4.5,
    importScore: 82,
  },
  {
    id: '6',
    slug: 'creme-contour-yeux',
    name: 'Crème Contour des Yeux',
    brand: 'Hayoss',
    price: 98,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&h=800&fit=crop'],
    categoryId: 'skincare',
    subCategoryId: 'eye-care',
    badge: 'bestseller',
    rating: 4.9,
    importScore: 94,
  },
  {
    id: '7',
    slug: 'gommage-doux-visage',
    name: 'Gommage Doux Visage',
    brand: 'Hayoss',
    price: 42,
    originalPrice: 55,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1598452963314-b09f397a5c48?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1598452963314-b09f397a5c48?w=600&h=800&fit=crop'],
    categoryId: 'skincare',
    subCategoryId: 'exfoliators',
    rating: 4.4,
    importScore: 80,
  },
  {
    id: '8',
    slug: 'baume-levres-nourrissant',
    name: 'Baume Lèvres Nourrissant',
    brand: 'Hayoss',
    price: 28,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=800&fit=crop'],
    categoryId: 'makeup',
    subCategoryId: 'lips',
    badge: 'new',
    rating: 4.8,
    importScore: 91,
  },
  {
    id: '9',
    slug: 'fond-teint-naturel',
    name: 'Fond de Teint Naturel',
    brand: 'Hayoss',
    price: 65,
    originalPrice: 85,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=600&h=800&fit=crop'],
    categoryId: 'makeup',
    subCategoryId: 'face',
    badge: 'bestseller',
    rating: 4.7,
    importScore: 89,
  },
  {
    id: '10',
    slug: 'palette-fards-paupieres',
    name: 'Palette Fards à Paupières',
    brand: 'Hayoss',
    price: 78,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1583241800698-e8ab01d85b24?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1583241800698-e8ab01d85b24?w=600&h=800&fit=crop'],
    categoryId: 'makeup',
    subCategoryId: 'eyes',
    rating: 4.6,
    importScore: 86,
  },
  {
    id: '11',
    slug: 'eau-parfum-rose',
    name: 'Eau de Parfum Rose Éternelle',
    brand: 'Hayoss',
    price: 145,
    originalPrice: 180,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=800&fit=crop'],
    categoryId: 'fragrances',
    subCategoryId: 'women',
    badge: 'bestseller',
    rating: 4.9,
    importScore: 96,
  },
  {
    id: '12',
    slug: 'shampoing-reparateur',
    name: 'Shampoing Réparateur',
    brand: 'Hayoss',
    price: 35,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&h=800&fit=crop',
    images: ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&h=800&fit=crop'],
    categoryId: 'haircare',
    subCategoryId: 'shampoo',
    rating: 4.5,
    importScore: 83,
  },
];

// ============================================================================
// COLLECTIONS PAGE COMPONENT
// ============================================================================

export default function CollectionsPage() {
  const t = useTranslations();

  // State
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid-4');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFilterSections, setExpandedFilterSections] = useState<string[]>(['categories', 'price']);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        if (data.success && data.data) {
          const mappedProducts: Product[] = data.data.map((p: any) => ({
            id: p.id,
            slug: p.translations?.[0]?.slug || p.aliexpressId,
            name: p.translations?.[0]?.name || p.name,
            brand: p.supplierName || 'Dropship Luxe',
            price: p.sellingPrice,
            originalPrice: p.basePrice > p.sellingPrice ? p.basePrice * 2.5 : undefined,
            currency: p.currency || 'EUR',
            image: p.images?.[0] || '/images/placeholder.jpg',
            images: p.images,
            categoryId: 'skincare', // Default, would come from API
            subCategoryId: 'serums',
            badge: p.importScore >= 90 ? 'bestseller' : p.importScore >= 80 ? 'new' : undefined,
            rating: p.rating || 4.5,
            importScore: p.importScore,
          }));
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory) {
      result = result.filter(p => p.categoryId === selectedCategory);
    }

    // Sub-category filter
    if (selectedSubCategory) {
      result = result.filter(p => p.subCategoryId === selectedSubCategory);
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
        // Assuming newer products have higher IDs
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.importScore || 0) - (a.importScore || 0));
    }

    return result;
  }, [products, selectedCategory, selectedSubCategory, priceRange, sortBy]);

  // Get subcategories for selected category
  const currentSubCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const category = fullCatalog.find(c => c.id === selectedCategory);
    return category?.subCategories || [];
  }, [selectedCategory]);

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
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setPriceRange([0, 500]);
    setSortBy('featured');
  };

  const hasActiveFilters = selectedCategory || selectedSubCategory || priceRange[0] > 0 || priceRange[1] < 500;

  const gridColumns = {
    'grid-4': 4,
    'grid-3': 3,
    'grid-2': 2,
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[320px] bg-[#F5F4F2] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center px-6"
        >
          <span className="text-xs font-medium tracking-[0.3em] uppercase text-[#B76E79] mb-4 block">
            Notre Collection
          </span>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#1A1A1A] font-light">
            {selectedCategory
              ? fullCatalog.find(c => c.id === selectedCategory)?.nameFR
              : 'Tous les Produits'}
          </h1>
          <p className="mt-4 text-neutral-600 max-w-lg mx-auto">
            Découvrez notre sélection de produits cosmétiques premium,
            soigneusement choisis pour sublimer votre beauté naturelle.
          </p>
        </motion.div>
      </section>

      {/* Categories Bar */}
      <section className="border-b border-neutral-200 sticky top-16 bg-white z-30">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-6 overflow-x-auto py-4 scrollbar-hide">
            <button
              onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); }}
              className={cn(
                'flex-shrink-0 text-sm font-medium tracking-wide transition-colors',
                !selectedCategory ? 'text-[#B76E79]' : 'text-neutral-600 hover:text-[#1A1A1A]'
              )}
            >
              Tous
            </button>
            {fullCatalog.map(category => (
              <button
                key={category.id}
                onClick={() => { setSelectedCategory(category.id); setSelectedSubCategory(null); }}
                className={cn(
                  'flex-shrink-0 text-sm font-medium tracking-wide transition-colors',
                  selectedCategory === category.id ? 'text-[#B76E79]' : 'text-neutral-600 hover:text-[#1A1A1A]'
                )}
              >
                {category.nameFR}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-8">
          {/* Left: Filter button + Count */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors',
                showFilters
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F5F4F2] text-[#1A1A1A] hover:bg-neutral-200'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtres</span>
              {hasActiveFilters && (
                <span className="w-5 h-5 flex items-center justify-center bg-[#B76E79] text-white text-xs rounded-full">
                  {[selectedCategory, selectedSubCategory, priceRange[0] > 0 || priceRange[1] < 500].filter(Boolean).length}
                </span>
              )}
            </button>
            <span className="text-sm text-neutral-500">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Right: Sort + View Mode */}
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-transparent text-sm font-medium text-neutral-600 pr-6 cursor-pointer focus:outline-none"
              >
                <option value="featured">Mis en avant</option>
                <option value="newest">Nouveautés</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="rating">Mieux notés</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>

            {/* View Mode */}
            <div className="hidden md:flex items-center gap-1 border-l border-neutral-200 pl-4">
              <button
                onClick={() => setViewMode('grid-2')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'grid-2' ? 'bg-[#F5F4F2]' : 'hover:bg-neutral-100'
                )}
                aria-label="Vue 2 colonnes"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid-3')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'grid-3' ? 'bg-[#F5F4F2]' : 'hover:bg-neutral-100'
                )}
                aria-label="Vue 3 colonnes"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid-4')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === 'grid-4' ? 'bg-[#F5F4F2]' : 'hover:bg-neutral-100'
                )}
                aria-label="Vue 4 colonnes"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="4" height="4" rx="1" />
                  <rect x="10" y="3" width="4" height="4" rx="1" />
                  <rect x="17" y="3" width="4" height="4" rx="1" />
                  <rect x="3" y="10" width="4" height="4" rx="1" />
                  <rect x="10" y="10" width="4" height="4" rx="1" />
                  <rect x="17" y="10" width="4" height="4" rx="1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <div className="w-[280px] pr-6 border-r border-neutral-200">
                  {/* Filter Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-semibold tracking-wider uppercase">Filtres</h2>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-[#B76E79] hover:underline"
                      >
                        Tout effacer
                      </button>
                    )}
                  </div>

                  {/* Categories Filter */}
                  <div className="border-b border-neutral-200 pb-4 mb-4">
                    <button
                      onClick={() => toggleFilterSection('categories')}
                      className="w-full flex items-center justify-between py-2"
                    >
                      <span className="text-sm font-medium">Catégories</span>
                      <ChevronDown className={cn(
                        'w-4 h-4 transition-transform',
                        expandedFilterSections.includes('categories') && 'rotate-180'
                      )} />
                    </button>
                    <AnimatePresence>
                      {expandedFilterSections.includes('categories') && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 space-y-2">
                            {fullCatalog.map(category => (
                              <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                  type="radio"
                                  name="category"
                                  checked={selectedCategory === category.id}
                                  onChange={() => { setSelectedCategory(category.id); setSelectedSubCategory(null); }}
                                  className="w-4 h-4 text-[#B76E79] border-neutral-300 focus:ring-[#B76E79]"
                                />
                                <span className="text-sm text-neutral-600 group-hover:text-[#1A1A1A]">
                                  {category.nameFR}
                                </span>
                              </label>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sub-categories Filter (if category selected) */}
                  {currentSubCategories.length > 0 && (
                    <div className="border-b border-neutral-200 pb-4 mb-4">
                      <button
                        onClick={() => toggleFilterSection('subcategories')}
                        className="w-full flex items-center justify-between py-2"
                      >
                        <span className="text-sm font-medium">Sous-catégories</span>
                        <ChevronDown className={cn(
                          'w-4 h-4 transition-transform',
                          expandedFilterSections.includes('subcategories') && 'rotate-180'
                        )} />
                      </button>
                      <AnimatePresence>
                        {expandedFilterSections.includes('subcategories') && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 space-y-2">
                              {currentSubCategories.map(sub => (
                                <label key={sub.id} className="flex items-center gap-3 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={selectedSubCategory === sub.id}
                                    onChange={() => setSelectedSubCategory(
                                      selectedSubCategory === sub.id ? null : sub.id
                                    )}
                                    className="w-4 h-4 text-[#B76E79] border-neutral-300 rounded focus:ring-[#B76E79]"
                                  />
                                  <span className="text-sm text-neutral-600 group-hover:text-[#1A1A1A]">
                                    {sub.nameFR}
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
                  <div className="border-b border-neutral-200 pb-4 mb-4">
                    <button
                      onClick={() => toggleFilterSection('price')}
                      className="w-full flex items-center justify-between py-2"
                    >
                      <span className="text-sm font-medium">Prix</span>
                      <ChevronDown className={cn(
                        'w-4 h-4 transition-transform',
                        expandedFilterSections.includes('price') && 'rotate-180'
                      )} />
                    </button>
                    <AnimatePresence>
                      {expandedFilterSections.includes('price') && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex-1">
                                <label className="text-xs text-neutral-500 mb-1 block">Min</label>
                                <input
                                  type="number"
                                  value={priceRange[0]}
                                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#B76E79]"
                                />
                              </div>
                              <span className="text-neutral-400 mt-5">—</span>
                              <div className="flex-1">
                                <label className="text-xs text-neutral-500 mb-1 block">Max</label>
                                <input
                                  type="number"
                                  value={priceRange[1]}
                                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#B76E79]"
                                />
                              </div>
                            </div>
                            {/* Price Range Slider */}
                            <input
                              type="range"
                              min={0}
                              max={500}
                              value={priceRange[1]}
                              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                              className="w-full accent-[#B76E79]"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#B76E79] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-neutral-500 mb-4">Aucun produit trouvé</p>
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#B76E79] hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <BentoGrid columns={gridColumns[viewMode] as 2 | 3 | 4} gap="lg">
                {filteredProducts.map((product) => (
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
                  />
                ))}
              </BentoGrid>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
