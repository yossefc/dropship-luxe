'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { localeSeoConfig, type Locale } from '@/i18n/config';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  freeShippingThreshold?: number;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  freeShippingThreshold = 50,
}: CartDrawerProps): JSX.Element {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const seoConfig = localeSeoConfig[locale];

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: seoConfig.currency,
    }).format(amount);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const hasFreeShipping = remainingForFreeShipping === 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />
            </Dialog.Overlay>

            {/* Drawer */}
            <Dialog.Content asChild>
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
                  <Dialog.Title className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="font-heading text-xl">
                      {t('cart.title')}
                    </span>
                    {itemCount > 0 && (
                      <motion.span
                        key={itemCount}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-2 py-0.5 bg-primary-800 text-neutral-50 text-xs font-accent font-semibold rounded-full"
                      >
                        {itemCount}
                      </motion.span>
                    )}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                      aria-label={t('common.accessibility.closeCart')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Close>
                </div>

                <VisuallyHidden>
                  <Dialog.Description>
                    {t('cart.description', { count: itemCount })}
                  </Dialog.Description>
                </VisuallyHidden>

                {/* Free shipping progress */}
                {subtotal > 0 && (
                  <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
                    <div className="flex items-center gap-3 text-sm">
                      <Truck className="w-4 h-4 text-accent-gold flex-shrink-0" />
                      {hasFreeShipping ? (
                        <span className="text-success font-medium">
                          {t('cart.freeShippingUnlocked')}
                        </span>
                      ) : (
                        <span className="text-neutral-600">
                          {t('cart.summary.freeShippingProgress', { amount: formatPrice(remainingForFreeShipping) })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-accent-gold rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%` }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="flex-1 overflow-y-auto">
                  {items.length === 0 ? (
                    <EmptyCart />
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      <AnimatePresence mode="popLayout">
                        {items.map((item, index) => (
                          <motion.li
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 100, height: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            layout
                          >
                            <CartItemRow
                              item={item}
                              formatPrice={formatPrice}
                              onUpdateQuantity={onUpdateQuantity}
                              onRemove={onRemoveItem}
                            />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                  <div className="border-t border-neutral-200 p-6 space-y-4 bg-white">
                    {/* Gift option */}
                    <button className="w-full flex items-center gap-3 p-3 border border-neutral-200 rounded-md hover:border-primary-800 transition-colors text-left">
                      <Gift className="w-5 h-5 text-accent-gold" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-primary-800">
                          {t('cart.giftWrap.title')}
                        </span>
                        <span className="text-xs text-neutral-500 block">
                          {t('cart.giftWrap.description')}
                        </span>
                      </div>
                    </button>

                    {/* Totals */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">{t('cart.summary.subtotal')}</span>
                        <span className="font-medium">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">{t('cart.summary.shipping')}</span>
                        <span className={hasFreeShipping ? 'text-success font-medium' : ''}>
                          {hasFreeShipping ? t('cart.summary.shippingFree') : t('cart.summary.shippingCalculated')}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="space-y-3 pt-2">
                      <Button variant="primary" size="lg" fullWidth asChild>
                        <Link href="/checkout" onClick={onClose}>
                          {t('cart.actions.checkout')}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <p className="text-xs text-center text-neutral-500">
                        {t('cart.secureCheckout')}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}


/* =============================================================================
   CART ITEM ROW
   ============================================================================= */

interface CartItemRowProps {
  item: CartItem;
  formatPrice: (amount: number) => string;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

function CartItemRow({
  item,
  formatPrice,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps): JSX.Element {
  const t = useTranslations('cart');

  return (
    <div className="flex gap-4 p-4">
      {/* Image */}
      <Link href={`/products/${item.productId}`} className="relative flex-shrink-0">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="w-24 h-32 rounded-md overflow-hidden bg-neutral-100"
        >
          <Image
            src={item.image}
            alt={item.name}
            width={96}
            height={128}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </Link>

      {/* Details */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1">
          <span className="text-xs font-accent font-medium tracking-wider uppercase text-neutral-500">
            {item.brand}
          </span>
          <Link href={`/products/${item.productId}`}>
            <h4 className="font-heading text-base font-medium text-primary-800 line-clamp-2 hover:text-accent-gold transition-colors">
              {item.name}
            </h4>
          </Link>
          {(item.color != null || item.size != null) && (
            <p className="text-sm text-neutral-500 mt-1">
              {[item.color, item.size].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        {/* Price & Quantity */}
        <div className="flex items-end justify-between mt-3">
          <div className="flex items-center border border-neutral-200 rounded">
            <motion.button
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className={cn(
                'w-8 h-8 flex items-center justify-center',
                item.quantity <= 1 ? 'text-neutral-300' : 'text-neutral-600 hover:bg-neutral-50'
              )}
              whileTap={{ scale: 0.9 }}
              aria-label={t('item.decreaseQuantity')}
            >
              <Minus className="w-3 h-3" />
            </motion.button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <motion.button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-50"
              whileTap={{ scale: 0.9 }}
              aria-label={t('item.increaseQuantity')}
            >
              <Plus className="w-3 h-3" />
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-medium text-primary-800">
              {formatPrice(item.price * item.quantity)}
            </span>
            <motion.button
              onClick={() => onRemove(item.id)}
              className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-error transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t('item.remove')}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* =============================================================================
   EMPTY CART
   ============================================================================= */

function EmptyCart(): JSX.Element {
  const t = useTranslations('cart');

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center mb-6"
      >
        <ShoppingBag className="w-10 h-10 text-neutral-400" />
      </motion.div>
      <h3 className="font-heading text-xl text-primary-800 mb-2">
        {t('empty.title')}
      </h3>
      <p className="text-neutral-500 mb-6">
        {t('empty.description')}
      </p>
      <Dialog.Close asChild>
        <Button variant="primary" asChild>
          <Link href="/collections">
            {t('empty.cta')}
          </Link>
        </Button>
      </Dialog.Close>
    </div>
  );
}
