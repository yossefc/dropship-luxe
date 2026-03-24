'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

interface MobileStickyCartProps {
  price: number;
  currency: string;
  canAdd: boolean;
  isLoading: boolean;
  onAddToCart: () => void;
  isVisible: boolean;
}

export function MobileStickyCart({
  price,
  currency,
  canAdd,
  isLoading,
  onAddToCart,
  isVisible,
}: MobileStickyCartProps): JSX.Element {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-4 bg-white border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <span className="font-body text-xl font-light text-primary-800">
                {formatPrice(price, currency)}
              </span>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onAddToCart}
              disabled={!canAdd}
              isLoading={isLoading}
            >
              Ajouter au panier
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
