import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * `webServer` starts `next dev` on port 3000 if it's not already running,
 * so `npm run test:e2e` works in CI and local dev alike. We do NOT depend
 * on the FastAPI backend — every spec mocks `/api/*` via `page.route()`
 * so tests stay deterministic and fast.
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Production server: stable + fast route compilation. Run
    // `npm run build` once before the first E2E run.
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
