'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Radix Slider.Thumb has its own role="slider" but does not inherit
  // aria-label / aria-labelledby / aria-valuetext from the Root. The Root
  // renders a div (role="none") which doesn't permit aria-valuetext, so we
  // strip these attrs off Root and forward them to the Thumb explicitly.
  const {
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-valuetext': ariaValueText,
    ...rootProps
  } = props;
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className,
      )}
      {...rootProps}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-hairline">
        <SliderPrimitive.Range className="absolute h-full bg-magna-red" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
        aria-valuetext={ariaValueText}
        className={cn(
          'block h-4 w-4 rounded-full border-2 border-magna-red bg-surface-card shadow-card transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
          'hover:scale-110 disabled:pointer-events-none disabled:opacity-50',
        )}
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
