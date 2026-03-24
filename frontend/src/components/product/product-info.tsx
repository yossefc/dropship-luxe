'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, Truck, CreditCard, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ColorSwatches, type ColorOption } from './color-swatches';
import { SizeSelector, type SizeOption } from './size-selector';
import { QuantitySelector } from './quantity-selector';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface ProductData {
  id: string;
  brand: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  colors: ColorOption[];
  sizes: SizeOption[];
  stock: number;
  badges?: Array<'new' | 'sale' | 'bestseller' | 'limited'>;
}

interface ProductInfoProps {
  product: ProductData;
  onAddToCart: (data: { colorId: string; sizeId: string; quantity: number }) => void;
}

export function ProductInfo({ product, onAddToCart }: ProductInfoProps): JSX.Element {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    product.colors.find((c) => c.available)?.id ?? null
  );
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const discount = product.originalPrice != null
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const handleAddToCart = async (): Promise<void> => {
    if (selectedColorId == null || selectedSizeId == null) return;

    setIsAddingToCart(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    onAddToCart({ colorId: selectedColorId, sizeId: selectedSizeId, quantity });
    setIsAddingToCart(false);
  };

  const canAddToCart = selectedColorId != null && selectedSizeId != null && product.stock > 0;

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-12 lg:pr-16 lg:max-w-[560px] space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        {/* Brand & Badges */}
        <div className="flex items-center gap-3">
          <span className="text-overline">{product.brand}</span>
          {product.badges?.map((badge) => (
            <Badge key={badge} variant={badge}>
              {badge === 'new' && 'Nouveau'}
              {badge === 'sale' && 'Promo'}
              {badge === 'bestseller' && 'Best-seller'}
              {badge === 'limited' && 'Édition limitée'}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl lg:text-5xl font-light leading-tight text-primary-800">
          {product.name}
        </h1>

        {/* Subtitle */}
        <p className="text-lg font-light text-neutral-600 leading-relaxed">
          {product.subtitle}
        </p>

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
            ({product.reviewCount} avis)
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
        <div className="flex items-baseline gap-3">
          <span className="font-body text-3xl font-light text-primary-800">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.originalPrice != null && (
            <>
              <span className="text-lg text-neutral-400 line-through">
                {formatPrice(product.originalPrice, product.currency)}
              </span>
              <span className="px-2 py-1 bg-accent-rose-gold/10 text-accent-rose-gold text-sm font-semibold rounded">
                -{discount}%
              </span>
            </>
          )}
        </div>
        <p className="text-sm text-neutral-500">
          ou <strong className="text-primary-800">3x {formatPrice(product.price / 3, product.currency)}</strong> sans frais avec Klarna
        </p>
      </motion.div>

      {/* Variants */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <ColorSwatches
          colors={product.colors}
          selectedId={selectedColorId}
          onSelect={setSelectedColorId}
        />

        <SizeSelector
          sizes={product.sizes}
          selectedId={selectedSizeId}
          onSelect={setSelectedSizeId}
        />
      </motion.div>

      {/* Add to Cart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4"
      >
        <QuantitySelector value={quantity} onChange={setQuantity} max={product.stock} />

        <div className="flex gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            isLoading={isAddingToCart}
          >
            Ajouter au panier
          </Button>

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
            aria-label={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={cn('w-5 h-5', isWishlisted && 'fill-current')} />
          </motion.button>
        </div>

        {/* Stock indicator */}
        <StockIndicator stock={product.stock} />
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 bg-neutral-100 rounded-lg space-y-3"
      >
        <TrustBadge icon={Truck} text="Livraison offerte" highlight="dès 50€" />
        <TrustBadge icon={CreditCard} text="Paiement en" highlight="3x sans frais" />
        <TrustBadge icon={RefreshCw} text="Retours gratuits" highlight="sous 30 jours" />
        <TrustBadge icon={Shield} text="Paiement" highlight="100% sécurisé" />
      </motion.div>
    </div>
  );
}

function StockIndicator({ stock }: { stock: number }): JSX.Element {
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
          'Rupture de stock'
        ) : isLow ? (
          <>Plus que <strong className="text-primary-800">{stock}</strong> en stock</>
        ) : (
          'En stock'
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
