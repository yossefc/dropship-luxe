'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { ProductGallery } from '@/components/product/product-gallery-i18n';
import { ProductInfo, type ProductInfoData, type ShadeOption, type SizeOption } from '@/components/product/product-info-i18n';
import { ProductAccordions } from '@/components/product/product-accordions';
import { AllergyDisclaimer } from '@/components/product/allergy-disclaimer';
import { useCartStore } from '@/lib/store/cart-store';
import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { ProductCard, type ProductCardData } from '@/components/home/product-card';

// ============================================================================
// Types
// ============================================================================

interface ProductTranslation {
  name: string;
  slug: string;
  description: string;
  descriptionHtml: string;
  benefits: string[];
  ingredients?: string;
  howToUse?: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

interface ProductData {
  id: string;
  sku: string;
  images: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  rating: number;
  reviewCount: number;
  brand: string;
  category: string;
  shades?: ShadeOption[];
  sizes?: SizeOption[];
  translation: ProductTranslation;
}

interface ProductPageClientProps {
  product: ProductData;
}

// ============================================================================
// Mock Recommendations (Replace with API call)
// ============================================================================

const mockRecommendations: ProductCardData[] = [
  {
    id: '2',
    slug: 'creme-nuit-regenerante',
    name: 'Crème Nuit Régénérante',
    brand: 'La Maison',
    price: 125,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=800&fit=crop',
    badge: 'new',
    rating: 4.9,
  },
  {
    id: '3',
    slug: 'huile-precieuse-rose',
    name: 'Huile Précieuse à la Rose',
    brand: 'Fleur de Luxe',
    price: 145,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=800&fit=crop',
    rating: 4.7,
  },
  {
    id: '4',
    slug: 'masque-hydratant-intense',
    name: 'Masque Hydratant Intense',
    brand: 'Aqua Pure',
    price: 68,
    originalPrice: 85,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=800&fit=crop',
    badge: 'sale',
    rating: 4.6,
  },
  {
    id: '5',
    slug: 'serum-acide-hyaluronique',
    name: 'Sérum Acide Hyaluronique',
    brand: 'La Maison',
    price: 79,
    currency: 'EUR',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop',
    rating: 4.8,
  },
];

// ============================================================================
// Component
// ============================================================================

export function ProductPageClient({ product }: ProductPageClientProps): JSX.Element {
  const t = useTranslations();
  const { addItem, openCart, getTotalItems } = useCartStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [displayImage, setDisplayImage] = useState<string>(product.images[0] || '');

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  // Transform product data for ProductInfo component
  const productInfoData: ProductInfoData = {
    id: product.id,
    brand: product.brand,
    name: product.translation.name,
    subtitle: product.translation.description.split('.')[0] + '.',
    price: product.price,
    originalPrice: product.originalPrice,
    currency: product.currency,
    rating: product.rating,
    reviewCount: product.reviewCount,
    shades: product.shades,
    sizes: product.sizes,
    stock: product.stock,
    badges: product.originalPrice ? ['sale'] : undefined,
  };

  // Transform images for gallery
  const galleryImages = product.images.map((src, index) => ({
    id: `img-${index}`,
    src,
    alt: `${product.translation.name} - ${index + 1}`,
  }));

  // Handle add to cart with animation
  const handleAddToCart = useCallback(
    (data: {
      shadeId?: string;
      sizeId?: string;
      quantity: number;
      shadeName?: string;
      sizeName?: string;
    }) => {
      for (let i = 0; i < data.quantity; i++) {
        addItem({
          productId: product.id,
          name: product.translation.name,
          brand: product.brand,
          image: product.images[0],
          price: product.price,
          color: data.shadeName,
          size: data.sizeName,
        });
      }
      // Cart drawer opens automatically via store
    },
    [addItem, product]
  );

  const totalItems = getTotalItems();

  return (
    <div ref={containerRef} className="min-h-screen bg-white">
      {/* Header removed — using global LuxeNavbar from layout */}
      <div className="hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Back button */}
          <div className="flex items-center gap-4">
            <Link
              href="/collections"
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.nav.collections')}</span>
            </Link>
          </div>

          {/* Logo */}
          <Link href="/" className="font-display text-xl sm:text-2xl tracking-wide">
            {t('common.brand.name')}
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSwitcher />
            <motion.button
              onClick={openCart}
              className="relative w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
              aria-label={t('common.accessibility.openCart')}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-accent-gold text-primary-800 text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>
        <div className="max-w-[1200px] mx-auto px-4 py-4">
          {/* Product Section: Image + Info + Details — all in one view */}
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_1fr] gap-6">

            {/* Col 1: Product Image — small, clean */}
            <div className="flex flex-col gap-3">
              <div className="aspect-square bg-neutral-50 rounded-lg overflow-hidden">
                {displayImage && (
                  <img
                    src={displayImage}
                    alt={product.translation.name}
                    className="w-full h-full object-contain transition-opacity duration-200"
                  />
                )}
              </div>
              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="w-16 h-16 bg-neutral-50 rounded overflow-hidden border border-neutral-200">
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Col 2: Product Info — name, price, variants, add to cart */}
            <div className="flex flex-col gap-4">
              {/* Category breadcrumb */}
              <p className="text-xs text-neutral-400 tracking-wide uppercase">{product.category}</p>

              {/* Brand */}
              <p className="text-xs font-medium text-[#B76E79] tracking-wider uppercase">{product.brand}</p>

              {/* Name */}
              <h1 className="font-serif text-xl font-light text-[#1A1A1A] leading-tight">
                {product.translation.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-xs ${i < Math.round(product.rating) ? 'text-amber-400' : 'text-neutral-200'}`}>★</span>
                  ))}
                </div>
                <span className="text-xs text-neutral-400">({product.reviewCount})</span>
              </div>

              {/* Price — updates when variant selected */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-[#1A1A1A]">
                  {(selectedVariant?.price ?? product.price).toFixed(2)} €
                </span>
                {!selectedVariant && product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-neutral-400 line-through">
                    {product.originalPrice.toFixed(2)} €
                  </span>
                )}
                {product.sizes && product.sizes.length > 0 && !selectedVariant && (
                  <span className="text-xs text-neutral-400">à partir de</span>
                )}
              </div>

              {/* Variants — text buttons with color name, click to show image */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wide">
                    {selectedVariant ? `Sélection : ${selectedVariant.label}` : 'Choisir une option'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.sizes.map((size: any) => {
                      const isSelected = selectedVariant?.id === size.id;
                      const colorHex = size.attributes?.colorHex;
                      const displayName = /^\d+$/.test(size.label) ? `Teinte ${size.label}` : size.label;
                      return (
                        <button
                          key={size.id}
                          onClick={() => {
                            setSelectedVariant(isSelected ? null : { ...size, label: displayName });
                            if (size.image && !isSelected) setDisplayImage(size.image);
                            else setDisplayImage(product.images[0]);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full border transition-all',
                            isSelected
                              ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                              : size.available
                                ? 'border-neutral-200 hover:border-[#B76E79] text-neutral-600'
                                : 'border-neutral-100 text-neutral-300 cursor-not-allowed opacity-40'
                          )}
                          disabled={!size.available}
                        >
                          {colorHex && (
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-neutral-300"
                              style={{ backgroundColor: colorHex }}
                            />
                          )}
                          {displayName}
                        </button>
                      );
                    })}
                  </div>
                  {selectedVariant?.price && (
                    <p className="text-xs text-[#B76E79] mt-1.5">{selectedVariant.price.toFixed(2)} €</p>
                  )}
                </div>
              )}

              {/* Short description — NOT repeated in col 3 */}
              {product.translation.benefits && product.translation.benefits.length > 0 && (
                <ul className="space-y-1">
                  {product.translation.benefits.slice(0, 3).map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-500">
                      <span className="text-[#B76E79] mt-0.5">✦</span> {b}
                    </li>
                  ))}
                </ul>
              )}

              {/* Add to Cart */}
              <button
                onClick={() => handleAddToCart({ quantity: 1 })}
                className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-medium tracking-wide rounded hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Ajouter au panier
              </button>

              {/* Stock info */}
              {product.stock > 0 && (
                <p className="text-xs text-green-600">✓ En stock ({product.stock} disponibles)</p>
              )}
            </div>

            {/* Col 3: Product details — what you're buying */}
            <div className="flex flex-col gap-4 text-sm">
              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B76E79] mb-2">Description</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {product.translation.description}
                </p>
              </div>

              {/* Product info — what you get */}
              <div className="bg-[#F9F8F6] rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A] mb-2">Ce que vous recevez</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-neutral-400">Catégorie</div>
                  <div className="text-neutral-700">{product.category}</div>
                  {product.sizes && product.sizes.length > 0 && (
                    <>
                      <div className="text-neutral-400">Options disponibles</div>
                      <div className="text-neutral-700">{product.sizes.length} variante{product.sizes.length > 1 ? 's' : ''}</div>
                    </>
                  )}
                  <div className="text-neutral-400">Marque</div>
                  <div className="text-neutral-700">{product.brand}</div>
                  <div className="text-neutral-400">Livraison</div>
                  <div className="text-neutral-700">7-20 jours ouvrés</div>
                  <div className="text-neutral-400">Retours</div>
                  <div className="text-neutral-700">30 jours</div>
                </div>
              </div>

              {/* Variant images removed — shown only when clicking a color above */}

              {/* How to use */}
              {product.translation.howToUse && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Utilisation</h3>
                  <p className="text-xs text-neutral-600 whitespace-pre-line leading-relaxed">
                    {product.translation.howToUse}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        <section className="py-16 bg-neutral-50 border-t border-neutral-100">
          <div className="max-w-[1440px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h2 className="font-display text-3xl md:text-4xl font-light">
                {t('products.recommendations.title')}
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {mockRecommendations.map((rec, index) => (
                <ProductCard
                  key={rec.id}
                  product={rec}
                  index={index}
                  onAddToCart={(p) => {
                    addItem({
                      productId: p.id,
                      name: p.name,
                      brand: p.brand,
                      image: p.image,
                      price: p.price,
                    });
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-neutral-200 bg-white">
          <div className="max-w-[1440px] mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <Link href="/" className="font-display text-xl">
                {t('common.brand.name')}
              </Link>
              <p className="text-sm text-neutral-500">
                © 2024 {t('common.brand.name')}. {t('common.footer.rights')}.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile Sticky Add to Cart */}
      <MobileStickyCart
        product={productInfoData}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

// ============================================================================
// Mobile Sticky Cart Component
// ============================================================================

interface MobileStickyCartProps {
  product: ProductInfoData;
  onAddToCart: (data: {
    shadeId?: string;
    sizeId?: string;
    quantity: number;
    shadeName?: string;
    sizeName?: string;
  }) => void;
}

function MobileStickyCart({ product, onAddToCart }: MobileStickyCartProps): JSX.Element {
  const t = useTranslations();

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-neutral-200 shadow-lg z-30"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="font-semibold text-primary-800">
            {formatPrice(product.price, product.currency)}
          </p>
          {product.stock > 0 ? (
            <p className="text-xs text-success">{t('products.stock.inStock')}</p>
          ) : (
            <p className="text-xs text-error">{t('products.stock.outOfStock')}</p>
          )}
        </div>
        <motion.button
          onClick={() => onAddToCart({ quantity: 1 })}
          disabled={product.stock === 0}
          className="flex-1 max-w-[200px] py-3 px-6 bg-primary-800 text-white font-accent font-semibold text-sm tracking-wider uppercase rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.98 }}
        >
          {t('common.cta.addToCart')}
        </motion.button>
      </div>
    </motion.div>
  );
}
