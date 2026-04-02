'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  categorySlug: string;
  rating?: number;
  isFeatured?: boolean;
}

interface SubCat {
  slug: string;
  name: string;
  count: number;
}

export default function CategoryCollectionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const categorySlug = params.category as string;
  const initialSub = searchParams.get('sub');

  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<SubCat[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(initialSub);
  const [sortBy, setSortBy] = useState('featured');
  const [loading, setLoading] = useState(true);

  const catNames: Record<string, string> = {
    'soins': 'Soins',
    'maquillage': 'Maquillage',
    'parfums': 'Parfums',
  };
  const categoryName = catNames[categorySlug] ?? categorySlug;

  // Fetch products
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/products?limit=100`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (data.success && data.data) {
          // Filter by parent category
          const catProducts = data.data.filter((p: any) => {
            const slug = p.category?.slug;
            const parentSlug = p.category?.parent?.slug;
            return slug === categorySlug || parentSlug === categorySlug;
          });

          // Build subcategories with counts
          const subMap = new Map<string, { name: string; count: number }>();
          for (const p of catProducts) {
            if (p.category?.parent?.slug === categorySlug) {
              const s = subMap.get(p.category.slug) || { name: p.category.name, count: 0 };
              s.count++;
              subMap.set(p.category.slug, s);
            }
          }
          setSubCategories(Array.from(subMap.entries()).map(([slug, v]) => ({ slug, ...v })));

          // Map products
          setProducts(catProducts.map((p: any) => ({
            id: p.id,
            slug: p.slug || p.aliexpressId,
            name: p.name,
            price: Number(p.sellingPrice),
            originalPrice: p.isFeatured ? Math.round(Number(p.sellingPrice) * 1.3) : undefined,
            currency: p.currency || 'EUR',
            image: p.images?.[0] || '/products/placeholder-luxe.png',
            categorySlug: p.category?.slug ?? '',
            rating: Number(p.rating) || 4.5,
            isFeatured: p.isFeatured,
          })));
        }
      } catch (e) {
        console.error('Fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [categorySlug]);

  // Read sub from URL on mount
  useEffect(() => {
    if (initialSub) setSelectedSub(initialSub);
  }, [initialSub]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products];
    if (selectedSub) {
      result = result.filter(p => p.categorySlug === selectedSub);
    }
    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      default: break;
    }
    return result;
  }, [products, selectedSub, sortBy]);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb + Category nav — all in one bar, like Clinique */}
      <div className="border-b border-neutral-100 bg-white sticky top-[104px] lg:top-[128px] z-20">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 pt-2 pb-1">
            <Link href="/collections" className="text-[10px] text-neutral-400 hover:text-[#1A1A1A]">Collections</Link>
            <span className="text-[10px] text-neutral-300">/</span>
            <span className="text-[10px] text-[#1A1A1A] font-medium">{categoryName}</span>
          </div>
          {/* Subcategory tabs */}
          <div className="flex items-center gap-0 overflow-x-auto -mb-px">
            <button
              onClick={() => setSelectedSub(null)}
              className={cn(
                'px-4 py-2.5 text-[11px] tracking-[0.08em] uppercase whitespace-nowrap transition-colors border-b-2',
                !selectedSub
                  ? 'text-[#1A1A1A] border-[#1A1A1A] font-medium'
                  : 'text-neutral-400 border-transparent hover:text-[#1A1A1A]'
              )}
            >
              Tout ({products.length})
            </button>
            {subCategories.map(sub => (
              <button
                key={sub.slug}
                onClick={() => setSelectedSub(sub.slug === selectedSub ? null : sub.slug)}
                className={cn(
                  'px-4 py-2.5 text-[11px] tracking-[0.08em] uppercase whitespace-nowrap transition-colors border-b-2',
                  selectedSub === sub.slug
                    ? 'text-[#1A1A1A] border-[#1A1A1A] font-medium'
                    : 'text-neutral-400 border-transparent hover:text-[#1A1A1A]'
                )}
              >
                {sub.name} ({sub.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort bar */}
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">{filtered.length} produit{filtered.length > 1 ? 's' : ''}</span>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-[11px] text-neutral-600 border-0 bg-transparent focus:outline-none cursor-pointer"
        >
          <option value="featured">Mis en avant</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
        </select>
      </div>

      {/* Products grid */}
      <div className="max-w-[1200px] mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-neutral-100 rounded-lg mb-2" />
                <div className="h-3 bg-neutral-100 rounded w-3/4 mb-1" />
                <div className="h-3 bg-neutral-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-400 text-sm mb-3">Aucun produit trouvé</p>
            <button
              onClick={() => setSelectedSub(null)}
              className="text-xs text-[#B76E79] hover:underline"
            >
              Voir tous les {categoryName.toLowerCase()}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
            {filtered.map(p => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group"
              >
                <div className="aspect-square bg-[#F5F4F2] rounded-lg overflow-hidden mb-2">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-[12px] text-[#1A1A1A] leading-tight line-clamp-2 mb-1">{p.name}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12px] font-medium text-[#1A1A1A]">{p.price.toFixed(2)} €</span>
                  {p.originalPrice && (
                    <span className="text-[10px] text-neutral-400 line-through">{p.originalPrice.toFixed(2)} €</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Other collections */}
      <div className="bg-[#F5F4F2] py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="font-serif text-lg text-[#1A1A1A] mb-4">Autres collections</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { slug: 'soins', name: 'Soins' },
              { slug: 'maquillage', name: 'Maquillage' },
              { slug: 'parfums', name: 'Parfums' },
            ]
              .filter(c => c.slug !== categorySlug)
              .map(c => (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  className="py-3 text-center text-[11px] tracking-[0.08em] uppercase text-neutral-600 hover:text-[#1A1A1A] border border-neutral-200 rounded hover:border-[#1A1A1A] transition-colors"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
