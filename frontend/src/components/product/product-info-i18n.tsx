'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Star, Heart, Truck, CreditCard, Shield, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { localeSeoConfig, type Locale } from '@/i18n/config';

// ============================================================================
// Types
// ============================================================================

export interface ShadeOption {
  id: string;
  name: string;
  color: string; // Hex color
  available: boolean;
}

export interface SizeOption {
  id: string;
  label: string;
  price?: number;
  available: boolean;
}

export interface ProductInfoData {
  id: string;
  brand: string;
  name: string;
  subtitle?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  shades?: ShadeOption[];
  sizes?: SizeOption[];
  stock: number;
  badges?: Array<'new' | 'sale' | 'bestseller' | 'limited'>;
}

interface ProductInfoProps {
  product: ProductInfoData;
  onAddToCart: (data: {
    shadeId?: string;
    sizeId?: string;
    quantity: number;
    shadeName?: string;
    sizeName?: string;
  }) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ProductInfo({ product, onAddToCart }: ProductInfoProps): JSX.Element {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const seoConfig = localeSeoConfig[locale];

  const [selectedShadeId, setSelectedShadeId] = useState<string | null>(
    product.shades?.find((s) => s.available)?.id ?? null
  );
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(
    product.sizes?.find((s) => s.available)?.id ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);

  const selectedShade = product.shades?.find((s) => s.id === selectedShadeId);
  const selectedSize = product.sizes?.find((s) => s.id === selectedSizeId);

  const discount = product.originalPrice != null
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const formatPrice = useCallback((amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: seoConfig.currency,
    }).format(amount);
  }, [locale, seoConfig.currency]);

  const handleAddToCart = async (): Promise<void> => {
    setIsAddingToCart(true);

    // Simulate network delay for animation
    await new Promise((resolve) => setTimeout(resolve, 600));

    onAddToCart({
      shadeId: selectedShadeId ?? undefined,
      sizeId: selectedSizeId ?? undefined,
      quantity,
      shadeName: selectedShade?.name,
      sizeName: selectedSize?.label,
    });

    setIsAddingToCart(false);
    setShowAddedFeedback(true);

    // Hide feedback after animation
    setTimeout(() => setShowAddedFeedback(false), 2000);
  };

  const hasVariants = (product.shades?.length ?? 0) > 0 || (product.sizes?.length ?? 0) > 0;
  const canAddToCart = product.stock > 0 && (
    !hasVariants ||
    ((product.shades?.length ?? 0) === 0 || selectedShadeId != null) &&
    ((product.sizes?.length ?? 0) === 0 || selectedSizeId != null)
  );

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-12 lg:pr-16 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        {/* Brand & Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-overline">{product.brand}</span>
          {product.badges?.map((badge) => (
            <Badge key={badge} variant={badge}>
              {t(`common.badges.${badge}`)}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl lg:text-4xl xl:text-5xl font-light leading-tight text-primary-800">
          {product.name}
        </h1>

        {/* Subtitle */}
        {product.subtitle && (
          <p className="text-lg font-light text-neutral-600 leading-relaxed">
            {product.subtitle}
          </p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4',
                  i < Math.floor(product.rating)
                    ? 'fill-accent-gold text-accent-gold'
                    : 'text-neutral-300'
                )}
              />
            ))}
          </div>
          <span className="text-sm text-neutral-500">
            {product.rating.toFixed(1)}
          </span>
          <a
            href="#reviews"
            className="text-sm text-neutral-500 underline underline-offset-2 hover:text-primary-800 transition-colors"
          >
            ({t('products.reviews.count', { count: product.reviewCount })})
          </a>
        </div>
      </motion.div>

      {/* Price */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-2"
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-body text-3xl font-light text-primary-800">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice != null && (
            <>
              <span className="text-lg text-neutral-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
              <span className="px-2 py-1 bg-accent-rose-gold/10 text-accent-rose-gold text-sm font-semibold rounded">
                -{discount}%
              </span>
            </>
          )}
        </div>
        <p className="text-sm text-neutral-500">
          {t('products.payment.installments', {
            amount: formatPrice(product.price / 3)
          })}
        </p>
      </motion.div>

      {/* Shade Selector */}
      {product.shades && product.shades.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <label className="font-accent font-semibold text-sm tracking-wide uppercase text-primary-800">
              {t('products.variants.shade')}
            </label>
            {selectedShade && (
              <span className="text-sm text-neutral-600">{selectedShade.name}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {product.shades.map((shade) => (
              <motion.button
                key={shade.id}
                onClick={() => shade.available && setSelectedShadeId(shade.id)}
                disabled={!shade.available}
                className={cn(
                  'relative w-10 h-10 rounded-full transition-all duration-200',
                  'ring-2 ring-offset-2',
                  selectedShadeId === shade.id
                    ? 'ring-accent-gold scale-110'
                    : 'ring-transparent hover:ring-neutral-300',
                  !shade.available && 'opacity-40 cursor-not-allowed'
                )}
                style={{ backgroundColor: shade.color }}
                whileHover={shade.available ? { scale: 1.1 } : {}}
                whileTap={shade.available ? { scale: 0.95 } : {}}
                aria-label={shade.name}
                aria-pressed={selectedShadeId === shade.id}
              >
                {selectedShadeId === shade.id && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Check className={cn(
                      'w-5 h-5',
                      isLightColor(shade.color) ? 'text-primary-800' : 'text-white'
                    )} />
                  </motion.span>
                )}
                {!shade.available && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-full h-0.5 bg-neutral-400 rotate-45" />
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Size Selector */}
      {product.sizes && product.sizes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <label className="font-accent font-semibold text-sm tracking-wide uppercase text-primary-800">
            {t('products.variants.size')}
          </label>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <motion.button
                key={size.id}
                onClick={() => size.available && setSelectedSizeId(size.id)}
                disabled={!size.available}
                className={cn(
                  'px-4 py-2 rounded-md border text-sm font-medium transition-all',
                  selectedSizeId === size.id
                    ? 'border-accent-gold bg-accent-gold/10 text-primary-800'
                    : 'border-neutral-300 text-neutral-600 hover:border-primary-800',
                  !size.available && 'opacity-40 cursor-not-allowed line-through'
                )}
                whileTap={size.available ? { scale: 0.98 } : {}}
              >
                {size.label}
                {size.price && size.price !== product.price && (
                  <span className="ml-1 text-xs text-neutral-500">
                    ({formatPrice(size.price)})
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quantity Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <label className="font-accent font-semibold text-sm tracking-wide uppercase text-primary-800">
          {t('products.variants.quantity')}
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-neutral-300 rounded-md">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-primary-800 transition-colors"
              aria-label={t('products.quantity.decrease')}
            >
              −
            </button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-primary-800 transition-colors"
              aria-label={t('products.quantity.increase')}
            >
              +
            </button>
          </div>
          <StockIndicator stock={product.stock} />
        </div>
      </motion.div>

      {/* Add to Cart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            isLoading={isAddingToCart}
          >
            {t('common.cta.addToCart')}
          </Button>

          {/* Added to cart feedback */}
          <AnimatePresence>
            {showAddedFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-0 flex items-center justify-center bg-success text-white rounded-md pointer-events-none"
              >
                <Check className="w-5 h-5 mr-2" />
                {t('cart.notifications.added')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={() => setIsWishlisted(!isWishlisted)}
          className={cn(
            'flex-shrink-0 w-14 h-14 flex items-center justify-center',
            'border rounded-md transition-colors duration-200',
            isWishlisted
              ? 'bg-accent-rose-gold/10 border-accent-rose-gold text-accent-rose-gold'
              : 'border-neutral-300 text-neutral-500 hover:border-primary-800 hover:text-primary-800'
          )}
          whileTap={{ scale: 0.95 }}
          aria-label={isWishlisted ? t('products.wishlist.remove') : t('products.wishlist.add')}
          aria-pressed={isWishlisted}
        >
          <Heart className={cn('w-5 h-5', isWishlisted && 'fill-current')} />
        </motion.button>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 bg-neutral-100 rounded-lg space-y-3"
      >
        <TrustBadge
          icon={Truck}
          text={t('products.trust.freeShipping')}
          highlight={t('products.trust.freeShippingAmount')}
        />
        <TrustBadge
          icon={CreditCard}
          text={t('products.trust.payment')}
          highlight={t('products.trust.paymentInstallments')}
        />
        <TrustBadge
          icon={RefreshCw}
          text={t('products.trust.returns')}
          highlight={t('products.trust.returnsDays')}
        />
        <TrustBadge
          icon={Shield}
          text={t('products.trust.secure')}
          highlight={t('products.trust.securePayment')}
        />
      </motion.div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StockIndicator({ stock }: { stock: number }): JSX.Element {
  const t = useTranslations('products');
  const isLow = stock > 0 && stock <= 5;
  const isOut = stock === 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isOut ? 'bg-error' : isLow ? 'bg-warning animate-pulse' : 'bg-success'
        )}
      />
      <span className="text-neutral-500">
        {isOut ? (
          t('stock.outOfStock')
        ) : isLow ? (
          t('stock.lowStock', { count: stock })
        ) : (
          t('stock.inStock')
        )}
      </span>
    </div>
  );
}

interface TrustBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  highlight: string;
}

function TrustBadge({ icon: Icon, text, highlight }: TrustBadgeProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 text-sm text-neutral-600">
      <Icon className="w-5 h-5 text-accent-gold flex-shrink-0" />
      <span>
        {text} <strong className="text-primary-800">{highlight}</strong>
      </span>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function isLightColor(hex: string): boolean {
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 128;
}
