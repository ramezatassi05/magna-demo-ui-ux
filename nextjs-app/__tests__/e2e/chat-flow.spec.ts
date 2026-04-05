/**
 * Chat flow E2E test.
 *
 * Exercises the full agent chat loop:
 *   1. Open the chat panel from the sidebar
 *   2. Submit a prompt
 *   3. Watch the thinking indicator
 *   4. See the streamed assistant response land in a bubble
 *
 * The real pipeline is browser → /api/chat (Next.js proxy) → FastAPI → LLM.
 * For determinism we mock /api/chat directly with a hand-crafted SSE stream
 * that exercises thinking → tool_call → tool_result → text → done frames,
 * matching the AgentEvent discriminated union in lib/types.ts.
 */

import { test, expect } from '@playwright/test';

// -----------------------------------------------------------------------------
// Synthetic SSE stream body. Each event is `data: <json>\n\n`.
// -----------------------------------------------------------------------------

function sseFrame(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

const SSE_BODY = [
  sseFrame({
    type: 'thinking',
    message: 'Looking up failed validation runs from the last 7 days.',
  }),
  sseFrame({
    type: 'tool_call',
    tool_call_id: 'tc_1',
    tool_name: 'query_tests',
    args: { result: 'fail', days: 7 },
  }),
  sseFrame({
    type: 'tool_result',
    tool_call_id: 'tc_1',
    status: 'success',
    preview: { row_count: 3 },
  }),
  sseFrame({
    type: 'text',
    delta: 'Found 3 failed tests this week. ',
  }),
  sseFrame({
    type: 'text',
    delta: 'The camera sensor had the highest failure rate.',
  }),
  sseFrame({
    type: 'done',
    duration_ms: 1420,
    tool_calls: 1,
  }),
].join('');

// Dashboard data mocks so the page renders without errors while we test chat.
const STATS_STUB = {
  total_tests: 100,
  pass_rate: 0.8,
  counts_by_sensor: { camera: 40, radar: 30, thermal: 20, lidar: 10 },
  counts_by_feature: { AEB: 20, FCW: 20, LCA: 20, BSD: 20, ACC: 10, TSR: 10 },
  counts_by_result: { pass: 80, fail: 15, warning: 5 },
  mean_detection_distance: 75,
  mean_false_positive_rate: 0.02,
};

test.describe('Chat flow', () => {
  test.beforeEach(async ({ page }) => {
    // Next.js dev mode injects a <nextjs-portal> custom element that can
    // sit on top of the chat panel and intercept pointer events. We inject
    // a MutationObserver early so the portal is neutralised even though it's
    // mounted asynchronously. Harmless in CI/build mode (no overlay there).
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

    // Stub the dashboard's data requests to keep the page errorless.
    await page.route('**/api/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STATS_STUB),
      }),
    );
    await page.route('**/api/stats/trends', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );
    await page.route('**/api/tests?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          page: 1,
          page_size: 200,
          total: 0,
          total_pages: 0,
        }),
      }),
    );

    // The critical mock: /api/chat returns our synthetic SSE stream.
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: SSE_BODY,
      }),
    );
  });

  test('user sends a message and receives a streamed response', async ({
    page,
  }) => {
    await page.goto('/');

    // Open chat panel from the sidebar toggle
    await page.getByRole('button', { name: /open ai agent panel/i }).click();

    // Panel is now visible; suggested prompts render in the empty state
    const chatPanel = page.getByLabel('AI Agent chat panel');
    await expect(chatPanel).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByText('How can I help?')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Show failed tests this week' }),
    ).toBeVisible();

    // Type a message and submit with Enter
    const input = page.getByRole('textbox', { name: /message the agent/i });
    await input.fill('Show failed tests this week');
    await input.press('Enter');

    // User bubble shows the submitted text
    await expect(
      page.getByText('Show failed tests this week').last(),
    ).toBeVisible();

    // Assistant text from two text frames is concatenated in the bubble
    await expect(
      page.getByText(/Found 3 failed tests this week/),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/camera sensor had the highest failure rate/),
    ).toBeVisible();

    // doneMeta footer: "1 tool call · 1.4s"
    await expect(page.getByText(/1 tool call/)).toBeVisible();
    await expect(page.getByText(/1\.4s/)).toBeVisible();
  });

  test('closing the panel flips aria-hidden back to true', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open ai agent panel/i }).click();

    const chatPanel = page.getByLabel('AI Agent chat panel');
    await expect(chatPanel).toHaveAttribute('aria-hidden', 'false');

    // The Next.js dev portal can still intercept pointer events despite
    // our init-script neutraliser (it mounts with a shadow root). Remove
    // it explicitly just before the click to guarantee the button is hit.
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach((n) => n.remove());
    });

    await page.getByRole('button', { name: /close chat panel/i }).click();
    await expect(chatPanel).toHaveAttribute('aria-hidden', 'true');
  });
});
