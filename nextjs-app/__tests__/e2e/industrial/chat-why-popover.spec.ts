/**
 * Chat Why popover — G1.7
 *
 * Verifies that when the last tool call's preview is parseable JSON with
 * scalar fields, the assistant bubble footer renders a "Why?" trigger
 * (ariaLabel "Show answer rationale") that opens a WhyPopover with the
 * extracted evidence as data points.
 *
 * SSE_TWO_TOOLS's final tool_result preview is:
 *   '{"critical_count":3,"avg_confidence":0.42,"top_sensor":"thermal"}'
 * → 3 scalar entries become 3 RationaleDataPoints in the popover.
 */

import { test, expect } from '@playwright/test';
import { installIndustrialMocks, SSE_TWO_TOOLS } from './fixtures';

test.describe('Chat Why popover', () => {
  test.beforeEach(async ({ page }) => {
    await installIndustrialMocks(page);
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: SSE_TWO_TOOLS,
      }),
    );
  });

  test('renders Why trigger on completed message and opens evidence list', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /open ai agent panel/i }).click();
    const chatPanel = page.getByLabel('AI Agent chat panel');

    const input = chatPanel.getByRole('textbox', {
      name: /message the agent/i,
    });
    await input.fill('Explain thermal AEB regressions');
    await input.press('Enter');

    // Wait for doneMeta footer — it only renders after the 'done' event.
    await expect(
      chatPanel.getByText(/2 tool calls/),
    ).toBeVisible({ timeout: 10_000 });

    // WhyPopover default trigger button has aria-label "Show answer rationale".
    const whyTrigger = chatPanel.getByRole('button', {
      name: /show answer rationale/i,
    });
    await expect(whyTrigger).toBeVisible();

    await whyTrigger.click();

    // Popover content (Radix portal) — scope assertions to the dialog so
    // we don't pick up the DecisionTrace finding that also shows the
    // preview JSON as raw text.
    const popover = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /why this answer/i }),
    });
    await expect(popover).toBeVisible();
    await expect(popover.getByText(/key evidence/i)).toBeVisible();

    // All 3 scalar fields render as data-point labels inside the popover.
    await expect(popover.getByText(/critical_count/i)).toBeVisible();
    await expect(popover.getByText(/avg_confidence/i)).toBeVisible();
    await expect(popover.getByText(/top_sensor/i)).toBeVisible();
  });
});
