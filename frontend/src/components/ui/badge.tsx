'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center',
    'font-accent text-xs font-semibold tracking-wider uppercase',
    'px-3 py-1 rounded-sm',
  ],
  {
    variants: {
      variant: {
        new: 'bg-accent-gold text-primary-800',
        sale: 'bg-accent-rose-gold text-neutral-50',
        bestseller: 'bg-secondary-navy text-neutral-50',
        limited: 'bg-secondary-bordeaux text-neutral-50',
        eco: 'bg-success text-neutral-50',
        default: 'bg-neutral-200 text-neutral-600',
      },
      position: {
        default: '',
        floating: 'absolute top-3 left-3 z-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      position: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, position, ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(badgeVariants({ variant, position, className }))}
      {...props}
    />
  );
}
