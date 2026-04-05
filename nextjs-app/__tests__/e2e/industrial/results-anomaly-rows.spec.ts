/**
 * Results table anomaly rows — G1.3
 *
 * Verifies that failed rows on /results render inline-row AnomalyAlertBadge
 * strips (the 4px left accent) and that the Radix tooltip reveals the
 * severity + test_id on hover.
 *
 * With `?result=fail` the filtered fixture set returns 6 failures: 3
 * critical thermal AEB + 2 anomaly camera FCW + 1 anomaly radar LCA.
 */

import { test, expect } from '@playwright/test';
import { installIndustrialMocks } from './fixtures';

test.describe('Results anomaly row strips', () => {
  test.beforeEach(async ({ page }) => {
    await installIndustrialMocks(page);
  });

  test('critical failures render inline anomaly strip with tooltip', async ({
    page,
  }) => {
    await page.goto('/results?result=fail');

    // Table header is visible once data lands.
    await expect(
      page.getByRole('heading', { name: /test results/i }),
    ).toBeVisible();

    // The inline-row variant renders role="status" with aria-label containing
    // "CRITICAL — TC-..." (uppercase severity, em-dash separator).
    const criticalStrips = page.getByRole('status', {
      name: /CRITICAL — TC-2026-0400/,
    });
    // At least the 3 thermal AEB criticals render strips.
    await expect(criticalStrips.first()).toBeVisible({ timeout: 10_000 });
    expect(await criticalStrips.count()).toBeGreaterThanOrEqual(3);

    // Anomaly (non-critical) failures also get a strip.
    const anomalyStrips = page.getByRole('status', {
      name: /ANOMALY — TC-2026-0401/, // camera FCW fails
    });
    expect(await anomalyStrips.count()).toBeGreaterThanOrEqual(1);

    // Tooltip reveal on hover — Radix renders the TooltipContent portal.
    await criticalStrips.first().hover();
    await expect(
      page.getByRole('tooltip').filter({ hasText: /CRITICAL — TC-/ }),
    ).toBeVisible();
  });
});
