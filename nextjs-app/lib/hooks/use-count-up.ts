'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animate a numeric value from 0 → `target` using requestAnimationFrame with
 * an easeOutQuart curve. Returns the current animated value, rounded to the
 * requested number of decimals.
 *
 * Used by KpiCard to add a subtle count-up on first paint without pulling in
 * framer-motion or another animation library.
 */
export function useCountUp(target: number, durationMs = 800, decimals = 0): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect users who prefer reduced motion — jump straight to the target.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !Number.isFinite(target) || target === 0) {
      setValue(target);
      return;
    }

    startRef.current = null;
    const factor = 10 ** decimals;

    const tick = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(target * eased * factor) / factor);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, decimals]);

  return value;
}
