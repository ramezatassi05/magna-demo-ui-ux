/**
 * Automated screenshot capture — G5
 *
 * Navigates through each industrial page with anomaly-tripping fixtures
 * and writes a full-page PNG to ../docs/screenshots/. Reproducible +
 * deterministic: no FastAPI backend required, no manual steps.
 *
 * Run via `npm run screenshots`. The spec is intentionally quarantined
 * from the main E2E suite (matched by filename) so that a flaky capture
 * doesn't fail the test gate.
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import {
  installIndustrialMocks,
  fulfillJson,
  SSE_TWO_TOOLS,
} from './fixtures';

// Standard desktop viewport for a consistent visual record. Setting
// per-test via `test.use({ viewport })` at module scope confuses Playwright's
// BrowserContext reuse — we set it imperatively in each test instead.

// __dirname = nextjs-app/__tests__/e2e/industrial → repo root is 4 up.
const OUT_DIR = path.resolve(__dirname, '../../../../docs/screenshots');
const out = (name: string) => path.join(OUT_DIR, name);

// Generous timeout — dev server may recompile routes on first hit,
// and multiple SWR calls need to resolve before anomaly surfaces appear.
test.setTimeout(60_000);

/** Wait for the dashboard's SWR data loads to settle (stats fixture has 527). */
async function waitForDashboardData(page: import('@playwright/test').Page) {
  await expect(
    page.getByRole('heading', { name: /validation campaign dashboard/i }),
  ).toBeVisible();
  // KPI "Total Validation Runs" value from ANOMALY_STATS = 527.
  await expect(page.getByText('527', { exact: true }).first()).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('Industrial refactor screenshots', () => {
  test('dashboard-full.png — task cards + KPI anomaly corners', async ({
    page,
  }) => {
    await installIndustrialMocks(page);
    await page.goto('/');
    await waitForDashboardData(page);
    // Task rack renders after all-tests + trends resolve.
    await expect(
      page
        .getByRole('article')
        .filter({ hasText: /Thermal AEB critical failure/i })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: out('dashboard-full.png'), fullPage: true });
  });

  test('results-full.png — presets + row anomaly strips', async ({ page }) => {
    await installIndustrialMocks(page);
    await page.goto('/results?result=fail');
    await expect(
      page.getByRole('heading', { name: /test results/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('toolbar', { name: /saved filter scopes/i }),
    ).toBeVisible();
    // Wait for at least one anomaly strip to render (confirms table data loaded).
    await expect(
      page.getByRole('status', { name: /CRITICAL — TC-2026-0400/ }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: out('results-full.png'), fullPage: true });
  });

  test('results-detail.png — row-detail expanded with meter + WhyPopover open', async ({
    page,
  }) => {
    await installIndustrialMocks(page);
    await page.goto('/results?result=fail');
    // Click a critical thermal row to expand its detail panel. Table rows
    // are <tr role="button"> — first one with the TC-2026-04001 id.
    const firstRow = page
      .getByRole('button')
      .filter({ hasText: /TC-2026-04001/i })
      .first();
    await expect(firstRow).toBeVisible({ timeout: 20_000 });
    await firstRow.click();
    // Open WhyPopover in the detail pane if present.
    const whyTrigger = page
      .getByRole('button', { name: /show rationale/i })
      .first();
    if (await whyTrigger.count()) {
      await whyTrigger.click();
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: out('results-detail.png'), fullPage: true });
  });

  test('test-generator-full.png — meters + WhyPopovers', async ({ page }) => {
    await installIndustrialMocks(page);
    // Mock the POST /api/test-cases proxy route.
    await page.route('**/api/test-cases', (route) =>
      fulfillJson(route, {
        requirement:
          'The AEB system shall detect pedestrians at ≥50m in daylight with ≤0.1% FPR.',
        feature: 'AEB',
        generation_mode: 'template',
        cases: [
          {
            test_id: 'TC-AEB-0001',
            title: 'Pedestrian detection at 50m — daylight, clear',
            preconditions: [
              'Dry asphalt, 18°C',
              'Camera firmware v4.2.1',
              'Vehicle stationary',
            ],
            steps: [
              'Position adult pedestrian mannequin at 50m centreline',
              'Accelerate vehicle to 40km/h',
              'Record detection latency',
            ],
            expected_result: 'AEB triggers brake at ≥45m with <200ms latency',
            pass_criteria: 'Detection confirmed, FPR ≤0.1% across 20 runs',
            priority: 'high',
            estimated_duration_min: 15,
            confidence: 'high',
          },
          {
            test_id: 'TC-AEB-0002',
            title: 'Pedestrian detection at 50m — dusk, partial shadow',
            preconditions: ['Ambient 200 lux', 'Moderate cloud cover'],
            steps: [
              'Position mannequin at 50m with shadow cast by roadside tree',
              'Repeat approach sequence',
            ],
            expected_result:
              'AEB engages at ≥40m (10% margin for reduced contrast)',
            pass_criteria: 'Confidence score ≥0.75 across 20 runs',
            priority: 'high',
            estimated_duration_min: 18,
            confidence: 'medium',
          },
          {
            test_id: 'TC-AEB-0003',
            title: 'Cyclist edge-case at 70m — rain, night',
            preconditions: ['Wet asphalt', '2mm/h precipitation'],
            steps: [
              'Position cyclist dummy at 70m',
              'Set rainfall simulation',
              'Measure detection distance',
            ],
            expected_result: 'System flags low-confidence detection ≥55m',
            pass_criteria: 'No missed detections; confidence logged ≥0.6',
            priority: 'medium',
            estimated_duration_min: 22,
            confidence: 'medium',
          },
        ],
      }),
    );
    await page.goto('/test-generator');
    await expect(
      page.getByRole('heading', { name: /test case generator|generator/i }),
    ).toBeVisible({ timeout: 20_000 });
    const requirement = page.getByLabel(/requirement/i).first();
    await requirement.fill(
      'The AEB system shall detect pedestrians at ≥50m in daylight with ≤0.1% FPR.',
    );
    await page
      .getByRole('button', { name: /generate test cases/i })
      .click();
    // TC-AEB-0001 appears twice (card header + generation history panel);
    // use .first() to satisfy strict-mode.
    await expect(page.getByText(/TC-AEB-0001/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: out('test-generator-full.png'),
      fullPage: true,
    });
  });

  test('chat-trace-expanded.png — DecisionTrace with tool calls', async ({
    page,
  }) => {
    await installIndustrialMocks(page);
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: SSE_TWO_TOOLS,
      }),
    );
    await page.goto('/');
    await waitForDashboardData(page);
    await page.getByRole('button', { name: /open ai agent panel/i }).click();
    const chatPanel = page.getByLabel('AI Agent chat panel');
    await expect(chatPanel).toHaveAttribute('aria-hidden', 'false');
    const input = chatPanel.getByRole('textbox', {
      name: /message the agent/i,
    });
    await input.fill('Investigate thermal AEB regressions');
    await input.press('Enter');
    await expect(
      chatPanel.getByText(/3 thermal AEB regressions/i),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('tree', { name: /agent reasoning/i }),
    ).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: out('chat-trace-expanded.png'),
      fullPage: false,
    });
  });

  test('parameter-sim-active.png — slider panel open with SIMULATED ribbon', async ({
    page,
  }) => {
    await installIndustrialMocks(page);
    await page.goto('/');
    await waitForDashboardData(page);
    await page
      .getByRole('button', { name: /simulate thresholds/i })
      .first()
      .click();
    const slider = page.getByRole('slider').first();
    await expect(slider).toBeVisible({ timeout: 10_000 });
    await slider.focus();
    for (let i = 0; i < 15; i++) {
      await slider.press('ArrowRight');
    }
    await expect(
      page.getByRole('status').filter({ hasText: /SIMULATED/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: out('parameter-sim-active.png'),
      fullPage: true,
    });
  });

  test('manual-override-dialog.png — AlertDialog confirming agent stop', async ({
    page,
  }) => {
    await installIndustrialMocks(page);
    // Hang the chat request so status stays 'streaming'.
    await page.route('**/api/chat', async () => {
      await new Promise(() => {
        /* never resolves */
      });
    });
    await page.goto('/');
    await waitForDashboardData(page);
    await page.getByRole('button', { name: /open ai agent panel/i }).click();
    const chatPanel = page.getByLabel('AI Agent chat panel');
    await expect(chatPanel).toHaveAttribute('aria-hidden', 'false');
    const input = chatPanel.getByRole('textbox', {
      name: /message the agent/i,
    });
    await input.fill('Investigate thermal AEB regressions');
    await input.press('Enter');
    const stopTrigger = chatPanel.getByRole('button', {
      name: 'Stop agent',
      exact: true,
    });
    await expect(stopTrigger).toBeVisible({ timeout: 10_000 });
    await stopTrigger.click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: out('manual-override-dialog.png'),
      fullPage: false,
    });
  });
});
