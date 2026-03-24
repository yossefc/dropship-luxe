'use client';

import { useCartStore } from '@/lib/store/cart-store';
import { CartDrawer } from './cart-drawer';

interface CartProviderProps {
  children: React.ReactNode;
}

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const { items, isOpen, closeCart, updateQuantity, removeItem } = useCartStore();

  return (
    <>
      {children}
      <CartDrawer
        isOpen={isOpen}
        onClose={closeCart}
        items={items}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
      />
    </>
  );
}
