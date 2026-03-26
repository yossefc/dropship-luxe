'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Check, Sparkles } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface BundleProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  currency: string;
}

interface CrossSellBundleProps {
  mainProduct: BundleProduct;
  bundleProducts: BundleProduct[];
  bundleDiscount?: number; // Percentage discount for bundle
  onAddBundle: (productIds: string[]) => void;
  title?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CrossSellBundle({
  mainProduct,
  bundleProducts,
  bundleDiscount = 15,
  onAddBundle,
  title = 'Complete Your Routine',
}: CrossSellBundleProps): JSX.Element {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set([mainProduct.id])
  );

  const toggleProduct = (productId: string) => {
    // Don't allow deselecting the main product
    if (productId === mainProduct.id) return;

    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const allProducts = [mainProduct, ...bundleProducts];
  const selectedProductsList = allProducts.filter((p) => selectedProducts.has(p.id));

  const originalTotal = selectedProductsList.reduce((sum, p) => sum + p.price, 0);
  const hasBundle = selectedProductsList.length > 1;
  const bundleTotal = hasBundle
    ? originalTotal * (1 - bundleDiscount / 100)
    : originalTotal;
  const savings = originalTotal - bundleTotal;

  const handleAddBundle = () => {
    onAddBundle(Array.from(selectedProducts));
  };

  return (
    <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-accent-gold" />
        <h3 className="font-heading text-lg font-semibold text-primary-800">
          {title}
        </h3>
        {hasBundle && (
          <span className="ml-auto px-3 py-1 bg-accent-gold text-primary-800 text-xs font-accent font-bold tracking-wider uppercase rounded-full">
            Save {bundleDiscount}%
          </span>
        )}
      </div>

      {/* Products */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {allProducts.map((product, index) => (
          <div key={product.id} className="flex items-center gap-3">
            {/* Product Card */}
            <motion.button
              onClick={() => toggleProduct(product.id)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200',
                selectedProducts.has(product.id)
                  ? 'border-primary-800 shadow-md'
                  : 'border-transparent opacity-60 hover:opacity-80'
              )}
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
              />

              {/* Selection indicator */}
              {selectedProducts.has(product.id) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-5 h-5 bg-primary-800 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}

              {/* Main product label */}
              {product.id === mainProduct.id && (
                <div className="absolute bottom-0 left-0 right-0 bg-primary-800/90 text-white text-[10px] font-accent font-semibold text-center py-0.5">
                  This item
                </div>
              )}
            </motion.button>

            {/* Plus sign between products */}
            {index < allProducts.length - 1 && (
              <Plus className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Product names */}
      <div className="space-y-1">
        {selectedProductsList.map((product) => (
          <div key={product.id} className="flex items-center justify-between text-sm">
            <span className="text-neutral-600 truncate pr-4">{product.name}</span>
            <span className="text-primary-800 font-medium flex-shrink-0">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="border-t border-neutral-200 pt-4 space-y-2">
        {hasBundle && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Bundle Discount</span>
            <span className="text-green-600 font-medium">
              -{formatPrice(savings, mainProduct.currency)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-heading font-semibold text-primary-800">Total</span>
          <div className="text-right">
            <span className="font-heading text-xl font-semibold text-primary-800">
              {formatPrice(bundleTotal, mainProduct.currency)}
            </span>
            {hasBundle && (
              <span className="block text-sm text-neutral-400 line-through">
                {formatPrice(originalTotal, mainProduct.currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add to Cart Button */}
      <motion.button
        onClick={handleAddBundle}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-4 bg-primary-800 text-white font-accent font-semibold text-sm tracking-wider uppercase rounded-xl hover:bg-primary-900 transition-colors"
      >
        Add {selectedProductsList.length} {selectedProductsList.length === 1 ? 'Item' : 'Items'} to Bag
      </motion.button>
    </div>
  );
}
