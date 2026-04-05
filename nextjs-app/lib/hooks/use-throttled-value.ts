'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * rAF-throttled value hook. Returns the latest `value`, but update-
 * emissions are capped at one per animation frame. Use this on slider
 * outputs feeding heavy recomputes — the slider UI remains 60fps while
 * downstream computations (stats aggregation, chart re-render) only
 * run once per frame.
 *
 * Combine with `useDeferredValue` for an additional layer of tearing
 * protection on slow devices.
 */
export function useThrottledValue<T>(value: T): T {
  const [throttled, setThrottled] = useState(value);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<T>(value);

  useEffect(() => {
    pendingRef.current = value;
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      setThrottled(pendingRef.current);
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value]);

  return throttled;
}
