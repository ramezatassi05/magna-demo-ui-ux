import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Button variants aligned with the ADAS Test Agent design system.
 *
 *  - primary:    Magna red, white text — main CTAs
 *  - secondary:  light card surface with hairline border — supporting actions
 *  - ghost:      transparent, hover fills — sidebar/toolbar use
 *  - destructive: status-fail red — rejection / delete actions
 *  - outline:    outlined on light bg — tertiary actions (uses status-pass)
 *  - override:   human-in-the-loop override — blue, used in agent chat
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base ' +
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-magna-red text-white hover:bg-magna-red-hover',
        secondary:
          'bg-surface-card text-ink-primary border border-hairline hover:bg-hairline-subtle',
        ghost:
          'bg-transparent text-ink-on-dark hover:bg-surface-elevated',
        destructive:
          'border border-status-fail text-status-fail hover:bg-status-fail hover:text-white',
        outline:
          'border border-status-pass text-status-pass hover:bg-status-pass hover:text-white',
        override:
          'border border-state-override-border text-state-override bg-state-override-bg hover:bg-state-override hover:text-white',
      },
      size: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-10 px-4 [&_svg]:size-4',
        lg: 'h-11 px-6 [&_svg]:size-4',
        icon: 'h-9 w-9 p-0 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
