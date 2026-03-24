'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  available: boolean;
}

interface ColorSwatchesProps {
  colors: ColorOption[];
  selectedId: string | null;
  onSelect: (colorId: string) => void;
}

export function ColorSwatches({ colors, selectedId, onSelect }: ColorSwatchesProps): JSX.Element {
  const selectedColor = colors.find((c) => c.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-accent text-sm font-medium text-primary-800">
          Couleur
        </span>
        {selectedColor != null && (
          <span className="text-sm text-neutral-500">
            {selectedColor.name}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <SwatchButton
            key={color.id}
            color={color}
            isSelected={color.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface SwatchButtonProps {
  color: ColorOption;
  isSelected: boolean;
  onSelect: (colorId: string) => void;
}

function SwatchButton({ color, isSelected, onSelect }: SwatchButtonProps): JSX.Element {
  const isLight = isLightColor(color.hex);

  return (
    <motion.button
      onClick={() => color.available && onSelect(color.id)}
      disabled={!color.available}
      className={cn(
        'relative w-9 h-9 rounded-full transition-transform duration-200',
        !color.available && 'opacity-30 cursor-not-allowed',
        isLight && 'border border-neutral-300'
      )}
      style={{ backgroundColor: color.hex }}
      whileHover={color.available ? { scale: 1.1 } : undefined}
      whileTap={color.available ? { scale: 0.95 } : undefined}
      aria-label={`Couleur ${color.name}${!color.available ? ' (indisponible)' : ''}`}
    >
      {/* Selection ring */}
      <span
        className={cn(
          'absolute -inset-1 rounded-full border-2 transition-colors duration-200',
          isSelected ? 'border-primary-800' : 'border-transparent'
        )}
      />

      {/* Out of stock indicator */}
      {!color.available && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-full h-0.5 bg-neutral-500 rotate-45 rounded-full" />
        </span>
      )}

      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-primary-800 text-neutral-100 text-xs whitespace-nowrap rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
        {color.name}
      </span>
    </motion.button>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.8;
}
