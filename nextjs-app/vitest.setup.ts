/**
 * Global Vitest setup:
 *   - Register jest-dom matchers (`toBeInTheDocument`, `toHaveClass`, …).
 *   - Register jest-axe matcher (`toHaveNoViolations`).
 *   - Clean up RTL-mounted React trees between tests.
 *   - Stub `window.matchMedia` — jsdom does not implement it, and our
 *     `useCountUp` hook queries `prefers-reduced-motion` on mount. Returning
 *     `{ matches: true }` bypasses the animation loop so KPI tests can
 *     assert on the final value immediately without fake timers.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true, // force reduced-motion path for deterministic count-up
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
