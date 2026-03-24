'use client';

import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-accent font-semibold tracking-wider uppercase',
    'transition-all duration-300 ease-luxury',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-800 text-neutral-50',
          'hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg',
          'active:translate-y-0',
        ],
        secondary: [
          'bg-transparent text-primary-800 border border-primary-800',
          'hover:bg-primary-800 hover:text-neutral-50',
        ],
        ghost: [
          'bg-transparent text-primary-800',
          'hover:bg-neutral-100',
        ],
        gold: [
          'bg-accent-gold text-primary-800',
          'hover:bg-accent-gold-dark hover:shadow-gold',
        ],
        outline: [
          'bg-transparent text-primary-800 border border-neutral-300',
          'hover:border-primary-800',
        ],
      },
      size: {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-sm',
        xl: 'px-10 py-5 text-base',
        icon: 'w-11 h-11 p-0',
      },
      rounded: {
        default: 'rounded-md',
        full: 'rounded-full',
        none: 'rounded-none',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      rounded: 'default',
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, fullWidth, children, isLoading, disabled, asChild = false, ...props }, ref) => {
    // When asChild is true, render as a Slot (for Link components)
    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={cn(buttonVariants({ variant, size, rounded, fullWidth, className }))}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, rounded, fullWidth, className }))}
        disabled={disabled || isLoading}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner />
            <span className="opacity-0">{children}</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

function Spinner(): JSX.Element {
  return (
    <svg
      className="absolute w-5 h-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export { Button, buttonVariants };
