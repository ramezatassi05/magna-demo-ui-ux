/**
 * Chat manual override — G1.5
 *
 * Exercises the ManualOverrideControl "Stop agent" flow:
 *   1. User submits a prompt → status becomes 'streaming'
 *   2. Stop agent button (in override strip) becomes visible
 *   3. Clicking it opens an AlertDialog ("Stop agent mid-run?")
 *   4. Confirming calls stop() → fetch is aborted → status returns to idle
 *
 * We hang the /api/chat route (never fulfill) so the fetch sits pending
 * and the client stays in 'streaming' long enough to test the override.
 * Playwright cleans up the orphaned route on test teardown.
 */

import { test, expect } from '@playwright/test';
import { installIndustrialMocks } from './fixtures';

test.describe('Chat manual override', () => {
  test.beforeEach(async ({ page }) => {
    await installIndustrialMocks(page);
    // Hang the chat request so status stays 'streaming' during the test.
    // Never calling fulfill/continue/abort leaves the browser's fetch pending;
    // the client's AbortController aborts it when the user clicks Stop.
    await page.route('**/api/chat', async () => {
      await new Promise(() => {
        /* never resolves — fetch hangs until client aborts */
      });
    });
  });

  test('Stop agent confirms via AlertDialog and returns to idle', async ({
    page,
  }) => {
    await page.goto('/');

    // Open the chat panel.
    await page.getByRole('button', { name: /open ai agent panel/i }).click();
    const chatPanel = page.getByLabel('AI Agent chat panel');
    await expect(chatPanel).toHaveAttribute('aria-hidden', 'false');

    // Submit a prompt — status transitions to 'streaming' synchronously.
    const input = chatPanel.getByRole('textbox', {
      name: /message the agent/i,
    });
    await input.fill('Show failed tests this week');
    await input.press('Enter');

    // The override-strip Stop button is only visible while streaming.
    const stopTrigger = chatPanel.getByRole('button', {
      name: 'Stop agent',
      exact: true,
    });
    await expect(stopTrigger).toBeVisible({ timeout: 5_000 });

    await stopTrigger.click();

    // AlertDialog opens with the expected title + destructive confirm.
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: /stop agent mid-run/i }),
    ).toBeVisible();

    // Confirm destroys the stream — "Stop agent" inside the dialog.
    await dialog.getByRole('button', { name: 'Stop agent', exact: true }).click();

    // Dialog closes + Stop button removed (status back to 'idle').
    await expect(dialog).not.toBeVisible();
    await expect(stopTrigger).not.toBeVisible();
  });
});
