/**
 * Scoping presets — G1.2
 *
 * Verifies:
 *   1. Clicking a built-in preset chip applies its filters to the URL
 *   2. Active preset chip picks up aria-pressed="true"
 *   3. "Save current" flow persists a user preset across a reload
 *      (via zustand-persist → localStorage key `scoping-presets-v1`)
 *
 * The built-in "Rainy night thermal fails" preset maps to
 *   { sensor_type: 'thermal', result: 'fail', search: 'rain night' }.
 */

import { test, expect } from '@playwright/test';
import { installIndustrialMocks } from './fixtures';

test.describe('Scoping presets', () => {
  test.beforeEach(async ({ page }) => {
    await installIndustrialMocks(page);
    // Playwright gives each test a fresh BrowserContext → empty localStorage
    // by default, so we don't need to wipe it via addInitScript (which would
    // clobber our saved preset on page.reload()).
  });

  test('applies built-in preset and persists a user-saved preset', async ({
    page,
  }) => {
    await page.goto('/results');

    // Built-in chip is visible in the presets toolbar.
    const presetsToolbar = page.getByRole('toolbar', {
      name: /saved filter scopes/i,
    });
    await expect(presetsToolbar).toBeVisible();

    const thermalChip = presetsToolbar.getByRole('button', {
      name: 'Rainy night thermal fails',
    });
    await expect(thermalChip).toBeVisible();
    await expect(thermalChip).toHaveAttribute('aria-pressed', 'false');

    await thermalChip.click();

    // URL picks up the filters from the preset.
    await expect(page).toHaveURL(/sensor_type=thermal/);
    const url = new URL(page.url());
    expect(url.searchParams.get('sensor_type')).toBe('thermal');
    expect(url.searchParams.get('result')).toBe('fail');
    // search is URL-encoded as "rain+night" by URLSearchParams.
    expect(url.searchParams.get('search')).toBe('rain night');

    // Chip is now active.
    await expect(thermalChip).toHaveAttribute('aria-pressed', 'true');

    // --- Save current filters as a new user preset ---
    const saveChip = presetsToolbar.getByRole('button', {
      name: /save current filters as preset/i,
    });
    await saveChip.click();

    const nameInput = page.getByLabel(/preset name/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('e2e-custom-preset');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // The custom preset chip should now be in the toolbar.
    await expect(
      presetsToolbar.getByRole('button', { name: 'e2e-custom-preset', exact: true }),
    ).toBeVisible();

    // --- Reload; custom preset persists via localStorage ---
    await page.reload();

    const reloadedToolbar = page.getByRole('toolbar', {
      name: /saved filter scopes/i,
    });
    await expect(
      reloadedToolbar.getByRole('button', { name: 'e2e-custom-preset', exact: true }),
    ).toBeVisible();

    // Cleanup: remove the persisted user preset so we don't leak state.
    await page.evaluate(() => {
      window.localStorage.removeItem('scoping-presets-v1');
    });
  });
});
