'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatPrice } from '@/lib/utils';

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
  currency?: string;
  freeShippingThreshold?: number;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  currency = 'EUR',
  freeShippingThreshold = 50,
}: CartDrawerProps): JSX.Element {
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
                      Votre panier
                    </span>
                    {itemCount > 0 && (
                      <span className="px-2 py-0.5 bg-primary-800 text-neutral-50 text-xs font-accent font-semibold rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                      aria-label="Fermer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </Dialog.Close>
                </div>

                <VisuallyHidden>
                  <Dialog.Description>
                    Panier contenant {itemCount} article{itemCount > 1 ? 's' : ''}
                  </Dialog.Description>
                </VisuallyHidden>

                {/* Free shipping progress */}
                {subtotal > 0 && (
                  <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
                    <div className="flex items-center gap-3 text-sm">
                      <Truck className="w-4 h-4 text-accent-gold flex-shrink-0" />
                      {hasFreeShipping ? (
                        <span className="text-success font-medium">
                          Félicitations ! Vous bénéficiez de la livraison offerte
                        </span>
                      ) : (
                        <span className="text-neutral-600">
                          Plus que <strong className="text-primary-800">{formatPrice(remainingForFreeShipping, currency)}</strong> pour la livraison offerte
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
                      {items.map((item, index) => (
                        <motion.li
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 100 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          layout
                        >
                          <CartItemRow
                            item={item}
                            currency={currency}
                            onUpdateQuantity={onUpdateQuantity}
                            onRemove={onRemoveItem}
                          />
                        </motion.li>
                      ))}
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
                          Emballage cadeau
                        </span>
                        <span className="text-xs text-neutral-500 block">
                          +5€ - Avec message personnalisé
                        </span>
                      </div>
                    </button>

                    {/* Totals */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Sous-total</span>
                        <span className="font-medium">{formatPrice(subtotal, currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Livraison</span>
                        <span className={hasFreeShipping ? 'text-success font-medium' : ''}>
                          {hasFreeShipping ? 'Offerte' : 'Calculée à l\'étape suivante'}
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="space-y-3 pt-2">
                      <Button variant="primary" size="lg" fullWidth asChild>
                        <Link href="/checkout" onClick={onClose}>
                          Commander
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <p className="text-xs text-center text-neutral-500">
                        Paiement sécurisé • Retours gratuits sous 30 jours
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
  currency: string;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

function CartItemRow({
  item,
  currency,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps): JSX.Element {
  return (
    <div className="flex gap-4 p-4">
      {/* Image */}
      <Link href={`/products/${item.productId}`} className="relative flex-shrink-0">
        <div className="w-24 h-32 rounded-md overflow-hidden bg-neutral-100">
          <Image
            src={item.image}
            alt={item.name}
            width={96}
            height={128}
            className="w-full h-full object-cover"
          />
        </div>
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
            >
              <Plus className="w-3 h-3" />
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-medium text-primary-800">
              {formatPrice(item.price * item.quantity, currency)}
            </span>
            <motion.button
              onClick={() => onRemove(item.id)}
              className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-error transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Supprimer"
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
        Votre panier est vide
      </h3>
      <p className="text-neutral-500 mb-6">
        Découvrez notre sélection de produits d'exception
      </p>
      <Dialog.Close asChild>
        <Button variant="primary" asChild>
          <Link href="/collections">
            Découvrir la collection
          </Link>
        </Button>
      </Dialog.Close>
    </div>
  );
}
