'use client';

// ============================================================================
// COLLECTION FILTERS - Barre de Filtres Horizontale Elegante
// ============================================================================
// Design sticky minimaliste avec filtres horizontaux
// Tri, sous-categories, et gamme de prix en pilules cliquables
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { type Category } from '@/config/catalog-structure';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'rating';

interface CollectionFiltersProps {
  category: Category;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedSubCategory: string | null;
  onSubCategoryChange: (subCategoryId: string | null) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  totalProducts: number;
}

// ============================================================================
// SORT OPTIONS
// ============================================================================

const sortOptions: Array<{ value: SortOption; labelFr: string; labelEn: string }> = [
  { value: 'featured', labelFr: 'Mis en avant', labelEn: 'Featured' },
  { value: 'newest', labelFr: 'Nouveautes', labelEn: 'Newest' },
  { value: 'price-asc', labelFr: 'Prix croissant', labelEn: 'Price: Low to High' },
  { value: 'price-desc', labelFr: 'Prix decroissant', labelEn: 'Price: High to Low' },
  { value: 'rating', labelFr: 'Mieux notes', labelEn: 'Top Rated' },
];

// ============================================================================
// PRICE RANGES
// ============================================================================

const priceRanges = [
  { label: 'Tous les prix', value: [0, 500] as [number, number] },
  { label: '< 50', value: [0, 50] as [number, number] },
  { label: '50 - 100', value: [50, 100] as [number, number] },
  { label: '100 - 200', value: [100, 200] as [number, number] },
  { label: '> 200', value: [200, 500] as [number, number] },
];

// ============================================================================
// COLLECTION FILTERS COMPONENT
// ============================================================================

export function CollectionFilters({
  category,
  sortBy,
  onSortChange,
  selectedSubCategory,
  onSubCategoryChange,
  priceRange,
  onPriceRangeChange,
  totalProducts,
}: CollectionFiltersProps) {
  const locale = useLocale();
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);

  const hasActiveFilters = selectedSubCategory !== null || priceRange[0] > 0 || priceRange[1] < 500;
  const currentSort = sortOptions.find(opt => opt.value === sortBy);

  const clearAllFilters = () => {
    onSubCategoryChange(null);
    onPriceRangeChange([0, 500]);
  };

  return (
    <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E4DF]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
          {/* Left: Sub-category Pills */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 md:pb-0 -mx-2 px-2">
            {/* "All" button */}
            <button
              onClick={() => onSubCategoryChange(null)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                selectedSubCategory === null
                  ? 'bg-[#2D2926] text-white shadow-md'
                  : 'bg-[#F5EDE8] text-[#6B5B54] hover:bg-[#EDE4DC]'
              )}
            >
              {locale === 'fr' ? 'Tous' : 'All'}
            </button>

            {/* Sub-category buttons */}
            {category.subCategories?.slice(0, 6).map(sub => (
              <button
                key={sub.id}
                onClick={() => onSubCategoryChange(sub.id === selectedSubCategory ? null : sub.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  selectedSubCategory === sub.id
                    ? 'bg-[#B8927A] text-white shadow-md'
                    : 'bg-[#F5EDE8] text-[#6B5B54] hover:bg-[#EDE4DC]'
                )}
              >
                {locale === 'fr' ? sub.nameFR : sub.nameEN}
              </button>
            ))}

            {/* More indicator if there are more subcategories */}
            {category.subCategories && category.subCategories.length > 6 && (
              <span className="flex-shrink-0 px-3 py-2 text-sm text-[#B8A99A]">
                +{category.subCategories.length - 6}
              </span>
            )}
          </div>

          {/* Right: Sort, Price Filter, Count */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Price Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowPriceDropdown(!showPriceDropdown)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  priceRange[0] > 0 || priceRange[1] < 500
                    ? 'bg-[#B8927A] text-white'
                    : 'bg-[#F5EDE8] text-[#6B5B54] hover:bg-[#EDE4DC]'
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {priceRange[0] > 0 || priceRange[1] < 500
                    ? `${priceRange[0]} - ${priceRange[1]}`
                    : locale === 'fr' ? 'Prix' : 'Price'
                  }
                </span>
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  showPriceDropdown && 'rotate-180'
                )} />
              </button>

              <AnimatePresence>
                {showPriceDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowPriceDropdown(false)}
                    />

                    {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#E8E4DF] overflow-hidden z-50"
                    >
                      <div className="p-2">
                        {priceRanges.map((range, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              onPriceRangeChange(range.value);
                              setShowPriceDropdown(false);
                            }}
                            className={cn(
                              'w-full px-4 py-2.5 text-left text-sm rounded-lg transition-colors',
                              priceRange[0] === range.value[0] && priceRange[1] === range.value[1]
                                ? 'bg-[#B8927A] text-white'
                                : 'text-[#6B5B54] hover:bg-[#F5EDE8]'
                            )}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#F5EDE8] text-[#6B5B54] hover:bg-[#EDE4DC] transition-all duration-300"
              >
                <span className="hidden sm:inline">
                  {locale === 'fr' ? currentSort?.labelFr : currentSort?.labelEn}
                </span>
                <span className="sm:hidden">
                  {locale === 'fr' ? 'Trier' : 'Sort'}
                </span>
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  showSortDropdown && 'rotate-180'
                )} />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSortDropdown(false)}
                    />

                    {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E8E4DF] overflow-hidden z-50"
                    >
                      <div className="p-2">
                        {sortOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              onSortChange(option.value);
                              setShowSortDropdown(false);
                            }}
                            className={cn(
                              'w-full px-4 py-2.5 text-left text-sm rounded-lg transition-colors',
                              sortBy === option.value
                                ? 'bg-[#B8927A] text-white'
                                : 'text-[#6B5B54] hover:bg-[#F5EDE8]'
                            )}
                          >
                            {locale === 'fr' ? option.labelFr : option.labelEn}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Product count */}
            <span className="hidden lg:inline text-sm text-[#B8A99A] border-l border-[#E8E4DF] pl-4">
              {totalProducts} {totalProducts > 1 ? 'produits' : 'produit'}
            </span>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#B8927A] hover:text-[#8B6B5D] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {locale === 'fr' ? 'Effacer' : 'Clear'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
