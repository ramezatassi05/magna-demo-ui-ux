/**
 * Dashboard E2E test.
 *
 * The dashboard page fetches from FastAPI (NEXT_PUBLIC_API_URL, defaulting
 * to http://localhost:8000). We intercept those requests with page.route()
 * and return deterministic fixtures so:
 *
 *   - tests don't require the Python backend to be running
 *   - assertions have known values (KPI numbers, chart data)
 *   - the suite is hermetic and fast in CI
 *
 * The `**` globbing in the route patterns matches any origin (localhost:8000,
 * relative URLs, whatever the app happens to use).
 */

import { test, expect, type Route } from '@playwright/test';

// -----------------------------------------------------------------------------
// Deterministic fixtures
// -----------------------------------------------------------------------------

const STATS_FIXTURE = {
  total_tests: 527,
  pass_rate: 0.784,
  counts_by_sensor: { camera: 210, radar: 132, thermal: 105, lidar: 80 },
  counts_by_feature: { AEB: 110, FCW: 88, LCA: 95, BSD: 72, ACC: 102, TSR: 60 },
  counts_by_result: { pass: 413, fail: 78, warning: 36 },
  mean_detection_distance: 87.3,
  mean_false_positive_rate: 0.0184,
};

// 30 days of trend points — 14 required for passRateDelta, 30 for the chart.
const TRENDS_FIXTURE = Array.from({ length: 30 }, (_, i) => {
  const day = String(i + 1).padStart(2, '0');
  return {
    date: `2026-03-${day}`,
    pass: 12 + (i % 5),
    fail: 2 + (i % 3),
    warning: 1,
  };
});

const TESTS_FIXTURE = {
  items: Array.from({ length: 8 }, (_, i) => ({
    test_id: `TC-2026-${String(100 + i).padStart(5, '0')}`,
    sensor_type: (['camera', 'radar', 'thermal', 'lidar'] as const)[i % 4],
    scenario: 'Highway cut-in, clear, day',
    scenario_tags: ['vehicle', 'clear', 'day'],
    feature: 'AEB' as const,
    result: (['pass', 'fail', 'warning'] as const)[i % 3],
    confidence_score: 0.5 + (i % 5) * 0.1,
    detection_distance_m: 50 + i * 10,
    false_positive_rate: 0.01,
    execution_time_ms: 1200,
    timestamp: `2026-03-${String(i + 10).padStart(2, '0')}T12:00:00Z`,
    vehicle_model: 'SUV-X1' as const,
    firmware_version: 'v4.2.1',
    notes: '',
  })),
  page: 1,
  page_size: 200,
  total: 8,
  total_pages: 1,
};

function fulfillJson(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    // Hide Next.js dev overlay (harmless in CI/build mode — it only renders
    // in `next dev`). MutationObserver catches the portal whenever it mounts.
    await page.addInitScript(() => {
      const neutralize = () => {
        document.querySelectorAll('nextjs-portal').forEach((el) => {
          (el as HTMLElement).style.pointerEvents = 'none';
          (el as HTMLElement).style.display = 'none';
        });
      };
      new MutationObserver(neutralize).observe(document.documentElement, {
        subtree: true,
        childList: true,
      });
      neutralize();
    });

    // Install mocks BEFORE navigating so no request escapes interception.
    await page.route('**/api/stats', (route) => fulfillJson(route, STATS_FIXTURE));
    await page.route('**/api/stats/trends', (route) =>
      fulfillJson(route, TRENDS_FIXTURE),
    );
    await page.route('**/api/tests?**', (route) =>
      fulfillJson(route, TESTS_FIXTURE),
    );
  });

  test('renders KPI cards, a chart, and sidebar navigation', async ({ page }) => {
    await page.goto('/');

    // Page header
    await expect(
      page.getByRole('heading', { name: /validation campaign dashboard/i }),
    ).toBeVisible();

    // All 4 KPI card labels are present. `exact: true` disambiguates "Pass
    // Rate" from the always-mounted chat suggestion "Compare sensor pass
    // rates" (AgentChatPanel is in the DOM even when closed).
    await expect(
      page.getByText('Total Validation Runs', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Pass Rate', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Mean Detection Range', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('False Positive Rate', { exact: true }),
    ).toBeVisible();

    // Values from STATS_FIXTURE land in the DOM (count-up animates, so we
    // wait for the final value). 527 total, 78.4 pass_rate, 87.3 distance.
    await expect(page.getByText('527')).toBeVisible();
    await expect(page.getByText('78.4')).toBeVisible();
    await expect(page.getByText('87.3')).toBeVisible();

    // At least one Recharts SVG has rendered
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible({
      timeout: 10_000,
    });

    // Sidebar navigates to Results
    await page.getByRole('link', { name: /test results/i }).click();
    await expect(page).toHaveURL(/\/results/);
  });

  test('recent failures card renders when data is available', async ({ page }) => {
    await page.goto('/');
    // "Recent Failures" chart card header is present regardless of data
    await expect(page.getByText('Recent Failures')).toBeVisible();
  });
});
