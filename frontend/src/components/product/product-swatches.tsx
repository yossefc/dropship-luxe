'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  available: boolean;
  image?: string;
}

export interface SizeSwatch {
  id: string;
  label: string;
  available: boolean;
  price?: number;
}

interface ColorSwatchesProps {
  colors: ColorSwatch[];
  selectedId?: string;
  onSelect: (color: ColorSwatch) => void;
  showNames?: boolean;
}

interface SizeSwatchesProps {
  sizes: SizeSwatch[];
  selectedId?: string;
  onSelect: (size: SizeSwatch) => void;
}

// ============================================================================
// Color Swatches Component
// ============================================================================

export function ColorSwatches({
  colors,
  selectedId,
  onSelect,
  showNames = true,
}: ColorSwatchesProps): JSX.Element {
  const selectedColor = colors.find((c) => c.id === selectedId);

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-accent font-medium text-primary-800">
          Color
        </span>
        {selectedColor && showNames && (
          <span className="text-sm text-neutral-600">{selectedColor.name}</span>
        )}
      </div>

      {/* Swatches */}
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <motion.button
            key={color.id}
            onClick={() => color.available && onSelect(color)}
            disabled={!color.available}
            whileHover={{ scale: color.available ? 1.1 : 1 }}
            whileTap={{ scale: color.available ? 0.95 : 1 }}
            className={cn(
              'relative w-10 h-10 rounded-full transition-all duration-200',
              !color.available && 'opacity-40 cursor-not-allowed',
              selectedId === color.id && 'ring-2 ring-offset-2 ring-primary-800'
            )}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          >
            {/* Selection indicator */}
            {selectedId === color.id && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check
                  className={cn(
                    'w-5 h-5',
                    isLightColor(color.hex) ? 'text-primary-800' : 'text-white'
                  )}
                />
              </motion.span>
            )}

            {/* Sold out indicator */}
            {!color.available && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-full h-0.5 bg-neutral-500 rotate-45 transform" />
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Size Swatches Component
// ============================================================================

export function SizeSwatches({
  sizes,
  selectedId,
  onSelect,
}: SizeSwatchesProps): JSX.Element {
  return (
    <div className="space-y-3">
      {/* Label */}
      <span className="text-sm font-accent font-medium text-primary-800">
        Size
      </span>

      {/* Swatches */}
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <motion.button
            key={size.id}
            onClick={() => size.available && onSelect(size)}
            disabled={!size.available}
            whileHover={{ scale: size.available ? 1.02 : 1 }}
            whileTap={{ scale: size.available ? 0.98 : 1 }}
            className={cn(
              'px-5 py-3 min-w-[80px] rounded-lg border-2 text-sm font-accent font-medium transition-all duration-200',
              selectedId === size.id
                ? 'border-primary-800 bg-primary-800 text-white'
                : 'border-neutral-200 text-primary-800 hover:border-neutral-300',
              !size.available && 'opacity-40 cursor-not-allowed line-through'
            )}
          >
            {size.label}
            {size.price && (
              <span className="block text-xs mt-0.5 opacity-70">
                +{size.price}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function isLightColor(hex: string): boolean {
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 180;
}
