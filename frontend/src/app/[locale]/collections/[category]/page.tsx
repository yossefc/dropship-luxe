'use client';

// ============================================================================
// DYNAMIC CATEGORY COLLECTION PAGE - Design Luxe Chaleureux
// ============================================================================
// Route dynamique pour /collections/skincare, /collections/makeup, etc.
// Esthetique premium : Rose Gold Romance, typographie Serif elegante
// Composants modulaires pour un code propre et maintenable
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { fullCatalog, getCategoryBySlug } from '@/config/catalog-structure';
import {
  CollectionHero,
  CollectionFilters,
  ProductGridLuxe,
  ProductSkeletonGrid,
  type SortOption,
} from '@/components/collection';

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
  hoverImage?: string;
  images?: string[];
  categoryId: string;
  subCategoryId: string;
  badge?: 'new' | 'bestseller' | 'sale' | 'limited';
  rating?: number;
  reviewCount?: number;
  colorSwatches?: Array<{ name: string; hex: string }>;
  importScore?: number;
  createdAt?: string;
}

// ============================================================================
// API URL
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ============================================================================
// HELPER FUNCTIONS (moved before component for TypeScript compatibility)
// ============================================================================

function generateColorSwatches(productName: string): Array<{ name: string; hex: string }> | undefined {
  const name = productName.toLowerCase();

  if (name.includes('fond de teint') || name.includes('foundation') || name.includes('concealer')) {
    return [
      { name: 'Porcelaine', hex: '#F5E6D3' },
      { name: 'Ivoire', hex: '#EAD9C4' },
      { name: 'Beige', hex: '#D4B896' },
      { name: 'Caramel', hex: '#B8926A' },
    ];
  }

  if (name.includes('rouge') || name.includes('lipstick') || name.includes('levres')) {
    return [
      { name: 'Nude Rose', hex: '#C4908B' },
      { name: 'Corail', hex: '#E07B67' },
      { name: 'Berry', hex: '#8B3A5B' },
    ];
  }

  return undefined;
}

// ============================================================================
// CATEGORY COLLECTION PAGE COMPONENT
// ============================================================================

export default function CategoryCollectionPage() {
  const params = useParams();
  const locale = useLocale();
  const categorySlug = params.category as string;

  // Get category info from slug
  const category = useMemo(() => getCategoryBySlug(categorySlug), [categorySlug]);

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [sortBy, setSortBy] = useState<SortOption>('featured');

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
            brand: 'Dropship Luxe',
            price: Number(p.sellingPrice),
            originalPrice: p.importScore >= 80 ? Math.round(Number(p.sellingPrice) * 1.3) : undefined,
            currency: p.currency || 'EUR',
            image: p.images?.[0] || '/images/placeholder.jpg',
            hoverImage: p.images?.[1],
            images: p.images,
            categoryId: category.id,
            subCategoryId: p.subCategoryId || 'general',
            badge: p.importScore >= 92 ? 'bestseller' : p.importScore >= 85 ? 'new' : undefined,
            rating: Number(p.rating) || 4.5,
            reviewCount: Math.floor(Math.random() * 150) + 20,
            colorSwatches: generateColorSwatches(p.name),
            importScore: p.importScore,
            createdAt: p.createdAt,
          }));
          setProducts(mappedProducts);
        } else {
          // Use fallback products if API returns empty
          setProducts(getFallbackProducts(category.id));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback products on error
        setProducts(getFallbackProducts(category?.id || 'skincare'));
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
  }, [products, selectedSubCategory, priceRange, sortBy]);

  // 404 if category not found
  if (!category) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#F5EDE8] flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-[#B8927A]" />
          </div>
          <h1 className="font-serif text-4xl text-[#2D2926] mb-4">Collection introuvable</h1>
          <p className="text-[#6B5B54] mb-8">Cette categorie n&apos;existe pas ou a ete deplacee.</p>
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B8927A] text-white rounded-lg hover:bg-[#A37E68] transition-colors"
          >
            Voir toutes les collections
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Hero Header - Composant Modulaire */}
      <CollectionHero
        category={category}
        productCount={filteredProducts.length}
      />

      {/* Sticky Filters Bar - Composant Modulaire */}
      <CollectionFilters
        category={category}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedSubCategory={selectedSubCategory}
        onSubCategoryChange={setSelectedSubCategory}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        totalProducts={filteredProducts.length}
      />

      {/* Main Content Area */}
      <main className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <AnimatePresence mode="wait">
          {loading ? (
            <ProductSkeletonGrid key="skeleton" count={8} />
          ) : filteredProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#F5EDE8] flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-[#B8927A]" />
              </div>
              <h3 className="font-serif text-2xl text-[#2D2926] mb-3">
                {locale === 'fr' ? 'Aucun produit trouve' : 'No products found'}
              </h3>
              <p className="text-[#6B5B54] max-w-md mx-auto mb-8">
                {locale === 'fr'
                  ? 'Essayez de modifier vos filtres pour decouvrir d\'autres merveilles.'
                  : 'Try adjusting your filters to discover other treasures.'
                }
              </p>
              <button
                onClick={() => {
                  setSelectedSubCategory(null);
                  setPriceRange([0, 500]);
                  setSortBy('featured');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#B8927A] text-white rounded-lg hover:bg-[#A37E68] transition-colors"
              >
                {locale === 'fr' ? 'Reinitialiser les filtres' : 'Reset filters'}
              </button>
            </motion.div>
          ) : (
            <ProductGridLuxe
              key="products"
              products={filteredProducts}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Related Collections Section */}
      <section className="bg-[#F5EDE8] py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2926] mb-4">
              {locale === 'fr' ? 'Explorer d\'autres collections' : 'Explore other collections'}
            </h2>
            <p className="text-[#6B5B54] max-w-lg mx-auto">
              {locale === 'fr'
                ? 'Decouvrez nos autres gammes de produits soigneusement selectionnes.'
                : 'Discover our other ranges of carefully selected products.'
              }
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {fullCatalog
              .filter(cat => cat.id !== category.id)
              .slice(0, 4)
              .map((cat) => (
                <Link
                  key={cat.id}
                  href={`/collections/${cat.id}`}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2D2926]/70 via-[#2D2926]/20 to-transparent z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#F9F7F5] to-[#EDE4DC] flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-[#B8927A]/30" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    <h3 className="font-serif text-xl md:text-2xl text-white mb-1 group-hover:translate-y-[-4px] transition-transform duration-300">
                      {locale === 'fr' ? cat.nameFR : cat.nameEN}
                    </h3>
                    <span className="text-white/70 text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {locale === 'fr' ? 'Decouvrir' : 'Discover'}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Decorative footer divider */}
      <div className="bg-[#FFFBF7] py-12">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4C4B5] to-transparent" />
            <div className="w-2 h-2 rounded-full bg-[#B8927A]" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4C4B5] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FALLBACK PRODUCTS FOR OFFLINE/ERROR STATES
// ============================================================================

function getFallbackProducts(categoryId: string): Product[] {
  const skincareFallback: Product[] = [
    {
      id: '1',
      slug: 'serum-eclat-vitamine-c',
      name: 'Serum Eclat Vitamine C',
      brand: 'Dropship Luxe',
      price: 89,
      originalPrice: 119,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
      hoverImage: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&h=800&fit=crop',
      categoryId: 'skincare',
      subCategoryId: 'serums',
      badge: 'bestseller',
      rating: 4.8,
      reviewCount: 127,
      importScore: 95,
    },
    {
      id: '2',
      slug: 'creme-nuit-regenerante',
      name: 'Creme Nuit Regenerante',
      brand: 'Dropship Luxe',
      price: 125,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
      categoryId: 'skincare',
      subCategoryId: 'moisturizers',
      badge: 'new',
      rating: 4.9,
      reviewCount: 89,
      importScore: 92,
    },
    {
      id: '3',
      slug: 'huile-visage-rose-musquee',
      name: 'Huile Visage Rose Musquee',
      brand: 'Dropship Luxe',
      price: 75,
      originalPrice: 95,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=800&fit=crop',
      hoverImage: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=800&fit=crop',
      categoryId: 'skincare',
      subCategoryId: 'oils',
      rating: 4.7,
      reviewCount: 64,
      importScore: 88,
    },
    {
      id: '4',
      slug: 'masque-hydratant-aloe-vera',
      name: 'Masque Hydratant Aloe Vera',
      brand: 'Dropship Luxe',
      price: 45,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop',
      categoryId: 'skincare',
      subCategoryId: 'masks',
      badge: 'new',
      rating: 4.6,
      reviewCount: 53,
      importScore: 85,
    },
    {
      id: '5',
      slug: 'lotion-tonique-purifiante',
      name: 'Lotion Tonique Purifiante',
      brand: 'Dropship Luxe',
      price: 55,
      originalPrice: 70,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&h=800&fit=crop',
      categoryId: 'skincare',
      subCategoryId: 'toners',
      rating: 4.5,
      reviewCount: 41,
      importScore: 82,
    },
    {
      id: '6',
      slug: 'creme-contour-yeux',
      name: 'Creme Contour des Yeux',
      brand: 'Dropship Luxe',
      price: 98,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&h=800&fit=crop',
      categoryId: 'skincare',
      subCategoryId: 'eye-care',
      badge: 'bestseller',
      rating: 4.9,
      reviewCount: 112,
      importScore: 94,
    },
  ];

  const makeupFallback: Product[] = [
    {
      id: '7',
      slug: 'fond-teint-velours-mat',
      name: 'Fond de Teint Velours Mat',
      brand: 'Dropship Luxe',
      price: 65,
      originalPrice: 85,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=600&h=800&fit=crop',
      categoryId: 'makeup',
      subCategoryId: 'face-makeup',
      badge: 'bestseller',
      rating: 4.7,
      reviewCount: 98,
      colorSwatches: [
        { name: 'Porcelaine', hex: '#F5E6D3' },
        { name: 'Ivoire', hex: '#EAD9C4' },
        { name: 'Beige', hex: '#D4B896' },
        { name: 'Caramel', hex: '#B8926A' },
      ],
      importScore: 89,
    },
    {
      id: '8',
      slug: 'baume-levres-nourrissant',
      name: 'Baume Levres Nourrissant',
      brand: 'Dropship Luxe',
      price: 28,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=800&fit=crop',
      categoryId: 'makeup',
      subCategoryId: 'lip-makeup',
      badge: 'new',
      rating: 4.8,
      reviewCount: 156,
      importScore: 91,
    },
    {
      id: '9',
      slug: 'palette-fards-paupieres-nude',
      name: 'Palette Fards a Paupieres Nude',
      brand: 'Dropship Luxe',
      price: 78,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=600&h=800&fit=crop',
      categoryId: 'makeup',
      subCategoryId: 'eye-makeup',
      rating: 4.6,
      reviewCount: 73,
      importScore: 86,
    },
    {
      id: '10',
      slug: 'set-pinceaux-or-rose',
      name: 'Set 15 Pinceaux Or Rose',
      brand: 'Dropship Luxe',
      price: 58,
      originalPrice: 75,
      currency: 'EUR',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=800&fit=crop',
      categoryId: 'makeup',
      subCategoryId: 'makeup-brushes',
      badge: 'bestseller',
      rating: 4.9,
      reviewCount: 201,
      importScore: 95,
    },
  ];

  if (categoryId === 'makeup') {
    return makeupFallback;
  }

  return skincareFallback;
}
