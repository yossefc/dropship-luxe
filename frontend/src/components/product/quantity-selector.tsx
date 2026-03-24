'use client';

import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
}: QuantitySelectorProps): JSX.Element {
  const handleDecrement = (): void => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (): void => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-500">Quantité</span>
      <div className="flex items-center border border-neutral-300 rounded-md">
        <motion.button
          onClick={handleDecrement}
          disabled={value <= min}
          className={cn(
            'w-11 h-11 flex items-center justify-center',
            'transition-colors duration-200',
            value <= min
              ? 'text-neutral-300 cursor-not-allowed'
              : 'text-primary-800 hover:bg-neutral-100'
          )}
          whileTap={value > min ? { scale: 0.9 } : undefined}
          aria-label="Diminuer la quantité"
        >
          <Minus className="w-4 h-4" />
        </motion.button>

        <span className="w-12 text-center font-accent text-base font-medium">
          {value}
        </span>

        <motion.button
          onClick={handleIncrement}
          disabled={value >= max}
          className={cn(
            'w-11 h-11 flex items-center justify-center',
            'transition-colors duration-200',
            value >= max
              ? 'text-neutral-300 cursor-not-allowed'
              : 'text-primary-800 hover:bg-neutral-100'
          )}
          whileTap={value < max ? { scale: 0.9 } : undefined}
          aria-label="Augmenter la quantité"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
