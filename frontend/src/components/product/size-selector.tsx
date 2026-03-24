'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SizeOption {
  id: string;
  label: string;
  available: boolean;
}

interface SizeSelectorProps {
  sizes: SizeOption[];
  selectedId: string | null;
  onSelect: (sizeId: string) => void;
  label?: string;
}

export function SizeSelector({
  sizes,
  selectedId,
  onSelect,
  label = 'Taille',
}: SizeSelectorProps): JSX.Element {
  const selectedSize = sizes.find((s) => s.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-accent text-sm font-medium text-primary-800">
            {label}
          </span>
          {selectedSize != null && (
            <span className="text-sm text-neutral-500">
              {selectedSize.label}
            </span>
          )}
        </div>
        <button className="text-sm text-neutral-500 underline underline-offset-2 hover:text-primary-800 transition-colors">
          Guide des tailles
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <motion.button
            key={size.id}
            onClick={() => size.available && onSelect(size.id)}
            disabled={!size.available}
            className={cn(
              'min-w-[48px] h-12 px-4',
              'flex items-center justify-center',
              'border rounded-md',
              'font-accent text-sm font-medium',
              'transition-all duration-200',
              size.available
                ? size.id === selectedId
                  ? 'bg-primary-800 border-primary-800 text-neutral-50'
                  : 'bg-transparent border-neutral-300 text-primary-800 hover:border-primary-800'
                : 'bg-transparent border-neutral-200 text-neutral-300 cursor-not-allowed line-through'
            )}
            whileHover={size.available ? { scale: 1.02 } : undefined}
            whileTap={size.available ? { scale: 0.98 } : undefined}
          >
            {size.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
