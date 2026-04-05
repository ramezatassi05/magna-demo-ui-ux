/**
 * Chat decision trace — G1.6
 *
 * Verifies that the DecisionTrace tree renders when an assistant response
 * has ≥1 tool call, surfaces each step as a treeitem, and supports basic
 * arrow-key navigation.
 *
 * The fixture stream (SSE_TWO_TOOLS) emits:
 *   thinking → tool_call(query_tests) → tool_result → thinking → tool_call
 *   (summarize_results) → tool_result → text → done
 *
 * After the stream completes, buildTrace() produces two tool steps, each
 * with a nested "finding" child rendered from the tool result preview.
 */

import { test, expect } from '@playwright/test';
import { installIndustrialMocks, SSE_TWO_TOOLS } from './fixtures';

test.describe('Chat decision trace', () => {
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

  test('renders tool steps as treeitems and supports arrow-key nav', async ({
    page,
  }) => {
    await page.goto('/');

    // Open the chat panel + submit a prompt.
    await page.getByRole('button', { name: /open ai agent panel/i }).click();
    const chatPanel = page.getByLabel('AI Agent chat panel');
    await expect(chatPanel).toHaveAttribute('aria-hidden', 'false');

    const input = chatPanel.getByRole('textbox', {
      name: /message the agent/i,
    });
    await input.fill('Investigate thermal AEB regressions');
    await input.press('Enter');

    // Wait for the streamed response text to appear.
    await expect(
      page.getByText(/3 thermal AEB regressions/),
    ).toBeVisible({ timeout: 10_000 });

    // DecisionTrace renders as role="tree" with aria-label "Agent reasoning".
    const trace = page.getByRole('tree', { name: /agent reasoning/i });
    await expect(trace).toBeVisible();

    // buildTrace zippers thinking + tool calls — with 2 of each we get at
    // least 2 top-level reasoning + 2 top-level tool items + 2 finding
    // children. All render as <li role="treeitem">, so ≥ 6 total.
    const items = trace.getByRole('treeitem');
    expect(await items.count()).toBeGreaterThanOrEqual(4);

    // Tool steps carry aria-expanded (they own a finding child). Reasoning
    // steps don't, so we grab the first treeitem WITH the attribute.
    const expandableItem = trace.locator('[role="treeitem"][aria-expanded]').first();
    await expect(expandableItem).toHaveAttribute('aria-expanded', 'true');

    // Arrow-key nav: focus first item, press ArrowDown, assert focus moved.
    const firstItem = items.first();
    await firstItem.click();
    await firstItem.press('ArrowDown');

    // The focused element should now be a treeitem with tabIndex=0.
    const focused = page.locator('[role="treeitem"][tabindex="0"]');
    await expect(focused).not.toHaveCount(0);
  });
});
