import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vitest configuration for the Next.js app.
 *
 * - `jsdom` gives us a browser-like DOM for React Testing Library.
 * - `globals: true` exposes `describe/it/expect/vi` without imports, matching
 *   the style of our Storybook test environment.
 * - The `@/*` alias mirrors `tsconfig.json` paths so test files resolve
 *   component imports identically to app code.
 * - E2E specs under `__tests__/e2e` are excluded — those run via Playwright.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '__tests__/components/**/*.test.{ts,tsx}',
      '__tests__/industrial/**/*.test.{ts,tsx}',
      '__tests__/lib/**/*.test.{ts,tsx}',
      '__tests__/stores/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules', '__tests__/e2e/**', '.storybook/**'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
