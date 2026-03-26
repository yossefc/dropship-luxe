'use client';

// ============================================================================
// PRODUCT DETAIL PAGE (PDP) - Fiche Produit Premium
// ============================================================================
// Design luxueux avec galerie sticky, swatches visuels, accordéon INCI
// Optimisé pour conversion et expérience haut de gamme
// ============================================================================

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, Truck, RotateCcw, Shield, ChevronDown, Minus, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  stock: number;
  color?: {
    name: string;
    hex: string;
    image?: string;
  };
  size?: string;
}

interface ProductImage {
  id: string;
  src: string;
  alt: string;
}

interface ProductAccordionSection {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

interface ProductDetailPageProps {
  product: {
    id: string;
    name: string;
    brand: string;
    price: number;
    originalPrice?: number;
    currency?: string;
    description: string;
    shortDescription?: string;
    images: ProductImage[];
    variants?: ProductVariant[];
    rating?: number;
    reviewCount?: number;
    benefits?: string[];
    ingredients?: string;
    usage?: string;
    shippingInfo?: string;
    badge?: 'new' | 'bestseller' | 'sale' | 'limited';
  };
  onAddToCart?: (productId: string, variantId?: string, quantity?: number) => void;
}

// ============================================================================
// PRODUCT DETAIL PAGE COMPONENT
// ============================================================================

export function ProductDetailPage({ product, onAddToCart }: ProductDetailPageProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('description');

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentOriginalPrice = selectedVariant?.originalPrice ?? product.originalPrice;
  const discount = currentOriginalPrice
    ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
    : 0;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: product.currency || 'EUR',
    }).format(amount);
  };

  const handleAddToCart = useCallback(() => {
    onAddToCart?.(product.id, selectedVariant?.id, quantity);
  }, [onAddToCart, product.id, selectedVariant, quantity]);

  const accordionSections: ProductAccordionSection[] = [
    {
      id: 'description',
      title: 'Description',
      content: product.description,
    },
    ...(product.ingredients ? [{
      id: 'ingredients',
      title: 'Composition INCI',
      content: (
        <p className="text-sm text-neutral-600 leading-relaxed font-mono">
          {product.ingredients}
        </p>
      ),
    }] : []),
    ...(product.usage ? [{
      id: 'usage',
      title: "Conseils d'utilisation",
      content: product.usage,
    }] : []),
    {
      id: 'shipping',
      title: 'Livraison & Retours',
      content: product.shippingInfo || (
        <div className="space-y-3 text-sm text-neutral-600">
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-[#B76E79] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1A1A1A]">Livraison offerte dès 50€</p>
              <p>Expédition sous 24-48h • Livraison 7-15 jours ouvrés</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-[#B76E79] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1A1A1A]">Retours gratuits sous 30 jours</p>
              <p>Produits non ouverts uniquement</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#B76E79] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1A1A1A]">Paiement 100% sécurisé</p>
              <p>Vos données sont protégées</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Extraire les couleurs uniques des variantes
  const colorVariants = product.variants?.filter(v => v.color)
    .reduce((acc, v) => {
      if (v.color && !acc.find(c => c.hex === v.color!.hex)) {
        acc.push(v.color);
      }
      return acc;
    }, [] as NonNullable<ProductVariant['color']>[]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* ================================================================ */}
          {/* LEFT: Image Gallery (Sticky on desktop) */}
          {/* ================================================================ */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {/* Main Image */}
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-[4/5] bg-[#F5F4F2] rounded-lg overflow-hidden mb-4"
            >
              <Image
                src={product.images[selectedImage]?.src}
                alt={product.images[selectedImage]?.alt || product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Badge */}
              {product.badge && (
                <div className="absolute top-4 left-4">
                  <span className={cn(
                    'inline-block px-3 py-1.5 text-xs font-semibold tracking-wider uppercase rounded-full',
                    product.badge === 'new' && 'bg-[#1A1A1A] text-white',
                    product.badge === 'bestseller' && 'bg-[#C9A962] text-[#1A1A1A]',
                    product.badge === 'sale' && 'bg-[#A65252] text-white',
                    product.badge === 'limited' && 'bg-[#B76E79] text-white',
                  )}>
                    {product.badge === 'sale' ? `-${discount}%` : product.badge}
                  </span>
                </div>
              )}

              {/* Wishlist & Share */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={cn(
                    'p-2.5 rounded-full transition-all',
                    isWishlisted
                      ? 'bg-[#B76E79] text-white'
                      : 'bg-white/90 backdrop-blur-sm text-[#1A1A1A] hover:bg-white'
                  )}
                  aria-label={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Heart className={cn('w-5 h-5', isWishlisted && 'fill-current')} />
                </button>
                <button
                  className="p-2.5 bg-white/90 backdrop-blur-sm text-[#1A1A1A] rounded-full hover:bg-white transition-colors"
                  aria-label="Partager"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden transition-all',
                      selectedImage === index
                        ? 'ring-2 ring-[#B76E79] ring-offset-2'
                        : 'ring-1 ring-neutral-200 hover:ring-neutral-300'
                    )}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* RIGHT: Product Information */}
          {/* ================================================================ */}
          <div className="lg:py-4">
            {/* Brand */}
            <p className="text-sm text-[#B76E79] tracking-[0.15em] uppercase mb-2">
              {product.brand}
            </p>

            {/* Name */}
            <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light leading-tight mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        i < Math.floor(product.rating!) ? 'text-[#C9A962]' : 'text-neutral-300'
                      )}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-neutral-600">
                  {product.rating} ({product.reviewCount || 0} avis)
                </span>
              </div>
            )}

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-neutral-600 leading-relaxed mb-6">
                {product.shortDescription}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="font-serif text-3xl text-[#1A1A1A]">
                {formatPrice(currentPrice)}
              </span>
              {currentOriginalPrice && (
                <>
                  <span className="text-lg text-neutral-400 line-through">
                    {formatPrice(currentOriginalPrice)}
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold text-[#A65252] bg-[#A65252]/10 rounded">
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            {/* Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <div className="mb-8">
                <ul className="space-y-2">
                  {product.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-neutral-600">
                      <Check className="w-4 h-4 text-[#B76E79] flex-shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Color Swatches */}
            {colorVariants && colorVariants.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    Teinte : <span className="font-normal text-neutral-600">{selectedVariant?.color?.name}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colorVariants.map((color) => {
                    const variant = product.variants?.find(v => v.color?.hex === color.hex);
                    const isSelected = selectedVariant?.color?.hex === color.hex;

                    return (
                      <button
                        key={color.hex}
                        onClick={() => variant && setSelectedVariant(variant)}
                        className={cn(
                          'relative w-10 h-10 rounded-full transition-all',
                          isSelected
                            ? 'ring-2 ring-[#B76E79] ring-offset-2'
                            : 'ring-1 ring-neutral-300 hover:ring-neutral-400'
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                        aria-label={`Sélectionner la teinte ${color.name}`}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check className={cn(
                              'w-5 h-5',
                              isLightColor(color.hex) ? 'text-[#1A1A1A]' : 'text-white'
                            )} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <span className="block text-sm font-medium text-[#1A1A1A] mb-3">Quantité</span>
              <div className="inline-flex items-center border border-neutral-300 rounded-md">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-neutral-600 hover:text-[#1A1A1A] disabled:opacity-50 transition-colors"
                  disabled={quantity <= 1}
                  aria-label="Diminuer la quantité"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-neutral-600 hover:text-[#1A1A1A] transition-colors"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="space-y-3 mb-10">
              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-[#1A1A1A] text-white text-sm font-semibold tracking-wider uppercase rounded-md hover:bg-neutral-800 transition-colors"
              >
                Ajouter au panier — {formatPrice(currentPrice * quantity)}
              </button>

              <button className="w-full py-4 border-2 border-[#1A1A1A] text-[#1A1A1A] text-sm font-semibold tracking-wider uppercase rounded-md hover:bg-[#1A1A1A] hover:text-white transition-colors">
                Acheter maintenant
              </button>
            </div>

            {/* Accordion */}
            <div className="border-t border-neutral-200">
              {accordionSections.map((section) => (
                <div key={section.id} className="border-b border-neutral-200">
                  <button
                    onClick={() => setExpandedSection(
                      expandedSection === section.id ? '' : section.id
                    )}
                    className="w-full flex items-center justify-between py-5 text-left"
                  >
                    <span className="text-sm font-semibold tracking-wider uppercase text-[#1A1A1A]">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-neutral-500 transition-transform',
                        expandedSection === section.id && 'rotate-180'
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {expandedSection === section.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-6 text-neutral-600 leading-relaxed">
                          {typeof section.content === 'string' ? (
                            <p>{section.content}</p>
                          ) : (
                            section.content
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ProductDetailPage;
