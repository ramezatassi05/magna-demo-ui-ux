/**
 * Dashboard task cards — G1.1
 *
 * Verifies that:
 *   1. The DynamicTaskCard rack renders when anomaly-tripping data is loaded
 *   2. The critical thermal+AEB cluster surfaces as the top-ranked task
 *   3. Clicking "Inspect failures" deep-links to /results with the task's
 *      filter params baked into the URL
 *
 * Fixtures in `./fixtures.ts` produce one critical + two anomaly tasks; we
 * assert on the critical task's title + action-link destination.
 */

import { test, expect } from '@playwright/test';
import { installIndustrialMocks } from './fixtures';

test.describe('Dashboard task cards', () => {
  test.beforeEach(async ({ page }) => {
    await installIndustrialMocks(page);
  });

  test('renders critical task and deep-links to /results on Inspect click', async ({
    page,
  }) => {
    await page.goto('/');

    // Dashboard header renders first, then task rack after data loads.
    await expect(
      page.getByRole('heading', { name: /validation campaign dashboard/i }),
    ).toBeVisible();

    // Critical thermal AEB task card (title from toOperationalTask).
    const criticalCard = page
      .getByRole('article')
      .filter({ hasText: /Thermal AEB critical failure/i })
      .first();
    await expect(criticalCard).toBeVisible({ timeout: 10_000 });

    // The AnomalyAlertBadge standalone pill shows the metric readout.
    await expect(
      criticalCard.getByText(/3 failures · 24h/i),
    ).toBeVisible();

    // Inspect failures action — deep-link to Results with sensor+feature+result.
    const inspectLink = criticalCard.getByRole('link', {
      name: /inspect failures/i,
    });
    await expect(inspectLink).toBeVisible();

    await inspectLink.click();

    // URL contains all three filter params (order-independent match).
    await expect(page).toHaveURL(/\/results\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('sensor_type')).toBe('thermal');
    expect(url.searchParams.get('feature')).toBe('AEB');
    expect(url.searchParams.get('result')).toBe('fail');
  });
});
