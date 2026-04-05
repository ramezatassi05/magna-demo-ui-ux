/**
 * Parameter simulation — G1.4
 *
 * Verifies the end-to-end what-if flow:
 *   1. Click "Simulate thresholds" → slider panel expands
 *   2. Move the min-confidence slider → simulation auto-activates
 *   3. SimulatedRibbon appears with "SIMULATED" label + param readout
 *   4. "Exit simulation" → ribbon disappears, panel returns to inactive
 *
 * The Radix Slider exposes arrow-key navigation; we use ArrowRight on the
 * focused slider thumb to deterministically push min_confidence above 0.
 */

import { test, expect } from '@playwright/test';
import { installIndustrialMocks } from './fixtures';

test.describe('Parameter threshold simulation', () => {
  test.beforeEach(async ({ page }) => {
    await installIndustrialMocks(page);
  });

  test('slider drag activates simulation, Exit resets it', async ({ page }) => {
    await page.goto('/');

    // Open the panel from the header button.
    const openButton = page.getByRole('button', {
      name: /simulate thresholds/i,
    }).first();
    await expect(openButton).toBeVisible();
    await openButton.click();

    // Panel expands — aria-expanded flips to true on the collapsible header.
    const collapsibleHeader = page.getByRole('button', {
      name: /simulate thresholds/i,
    }).nth(1);
    await expect(collapsibleHeader).toHaveAttribute('aria-expanded', 'true');

    // Radix puts role="slider" on each Thumb; min_confidence is the first row.
    const slider = page.getByRole('slider').first();
    await expect(slider).toBeVisible();
    await slider.focus();
    // Push right ~10 steps of 0.01 = 0.10 confidence.
    for (let i = 0; i < 10; i++) {
      await slider.press('ArrowRight');
    }

    // Ribbon now visible.
    const ribbon = page.getByRole('status').filter({ hasText: /SIMULATED/i });
    await expect(ribbon).toBeVisible({ timeout: 5_000 });
    await expect(ribbon).toContainText(/min conf/i);

    // Active pill inside the panel header.
    await expect(
      page.getByText(/^Active$/i).first(),
    ).toBeVisible();

    // Exit simulation.
    await ribbon.getByRole('button', { name: /exit simulation/i }).click();
    await expect(ribbon).not.toBeVisible();
  });
});
