# Frontend Testing Guide — ADAS Test Agent

**Audience:** Frontend engineers and QA working on the ADAS Test Agent Next.js app, or on any similarly-shaped internal dashboard.

**Scope:** Five self-contained sections covering component tests, end-to-end tests, visual regression, **AI-assisted test generation**, and accessibility. Every recommendation is backed by a runnable file in this repository.

---

## Table of Contents

1. [Component Testing with React Testing Library](#1-component-testing-with-react-testing-library)
2. [E2E Testing with Playwright](#2-e2e-testing-with-playwright)
3. [Visual Regression Testing](#3-visual-regression-testing)
4. [AI-Assisted Test Generation](#4-ai-assisted-test-generation)
5. [Accessibility Testing](#5-accessibility-testing)

---

## 1. Component Testing with React Testing Library

### Philosophy

> Test behavior, not implementation.

The core rule of [React Testing Library (RTL)](https://testing-library.com/docs/guiding-principles) is to write tests that resemble how users interact with the app. Concretely, for this codebase that means:

- Query by **role, label, or visible text** — never by class name or internal `data-testid` unless absolutely necessary.
- Use **`user-event@14`** (not `fireEvent`) — it dispatches realistic pointer and keyboard sequences.
- Assert on what the **user sees** (DOM text, ARIA state) — not on implementation details like internal React state or props.
- Mock at the **boundary**: network requests, hooks that open streams, `window` APIs. Don't mock React internals.

### Setup

**Stack:** Vitest + jsdom + React Testing Library + jest-dom + jest-axe.

We chose Vitest over Jest because the repo already ships a Vite 5 install (via Storybook's `@storybook/nextjs-vite`), so running Vitest adds no duplicate dependency tree and inherits the same TypeScript transform. Vitest's API is nearly identical to Jest's, with faster cold starts and native ESM support.

**`nextjs-app/vitest.config.ts`:**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',              // browser-like DOM
    globals: true,                     // describe/it/expect/vi without imports
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/components/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '__tests__/e2e/**'],
    css: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
```

**`nextjs-app/vitest.setup.ts`:**

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
afterEach(() => { cleanup(); });

// jsdom does not ship matchMedia. Our useCountUp hook queries
// prefers-reduced-motion and short-circuits if it matches — returning true
// from the stub makes KPI animations resolve instantly in tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
```

**Running tests:**

```bash
npm test              # single run
npm run test:watch    # watch mode (re-runs on save)
```

### Core Patterns

**Rendering and querying**

```tsx
import { render, screen } from '@testing-library/react';
import { KpiCard } from '@/components/kpi-card';

render(<KpiCard label="Pass Rate" value={82} accentColor="pass" />);
expect(screen.getByText('Pass Rate')).toBeInTheDocument();
expect(screen.getByText('82')).toBeInTheDocument();
```

Prefer these queries (in order):

1. `getByRole` with `name` — `screen.getByRole('button', { name: /approve/i })`
2. `getByLabelText` — form fields, aside panels
3. `getByText` — static copy
4. `getByTestId` — **last resort** when nothing else works

**User events (not fireEvent)**

```tsx
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(screen.getByRole('button', { name: /approve/i }));
await user.type(input, 'hello');
await user.keyboard('{Enter}');
```

**Mocking hooks with `vi.mock`**

Hoist mocks above imports — Vitest does this automatically, so the pattern is just:

```tsx
vi.mock('@/hooks/use-agent-chat', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-agent-chat')>(
    '@/hooks/use-agent-chat',
  );
  return { ...actual, useAgentChat: () => currentMockChat };
});
```

See `__tests__/components/agent-chat-panel.test.tsx` for the full pattern — a mutable `currentMockChat` module-scoped variable that tests swap between renders.

**Reusing fixtures**

Component tests pull from the same fixtures file that Storybook stories use (`.storybook/mocks/fixtures.ts`). This keeps tests and stories aligned — when the data shape changes, both update together.

```tsx
import { MOCK_TEST_RECORDS } from '../../.storybook/mocks/fixtures';
const ROWS = MOCK_TEST_RECORDS.slice(0, 5);
```

### Walkthrough: `kpi-card.test.tsx`

The KpiCard component has three interesting behaviors worth testing closely:

1. **A count-up animation** via `useCountUp` — jumps from 0 → target over 800ms using `requestAnimationFrame`.
2. **Directional trend coloring** — green for improving, red for regressing.
3. **Inverted trend mode** — for metrics like false-positive rate where "up" is bad.

**Handling animation in tests:** the naive approach is to `waitFor` until the target value appears, but that's flaky. Instead, `useCountUp` already has a `prefers-reduced-motion` escape hatch — it skips the animation entirely. We stub `window.matchMedia` in `vitest.setup.ts` to always return `matches: true`, so the hook sets the final value synchronously on mount. Tests assert on the number directly:

```tsx
render(<KpiCard label="Total" value={1234} accentColor="magna" />);
expect(screen.getByText('1,234')).toBeInTheDocument();  // no waiting needed
```

**Testing trend color direction:** we find the trend text node and walk up to its container div, then assert on the Tailwind class:

```tsx
render(<KpiCard label="FPR" value={1.8} trend={0.3} accentColor="warning" invertTrend />);
const trendRow = screen.getByText('+0.3').closest('div');
expect(trendRow).toHaveClass('text-status-fail');      // rising FPR is bad → red
expect(trendRow).not.toHaveClass('text-status-pass');
```

**Why a separate test for `invertTrend`:** the flag exists specifically for metrics where "more" is worse (false-positive rate, latency). A regression in the color logic would silently mis-signal whether a metric is improving or degrading. That's exactly the kind of subtle bug a dedicated test case catches.

**Accessibility check:** every component test file should include one `axe` assertion (see Section 5):

```tsx
const { container } = render(<KpiCard {...props} />);
expect(await axe(container)).toHaveNoViolations();
```

### Coverage expectations

| Component | Key contract to test |
|-----------|---------------------|
| `KpiCard` | label, animated value, trend direction, inverted trend, loading skeleton, accent colors |
| `ConfidenceBadge` | score → level threshold mapping, explicit level, size variants, icon toggle, tooltip |
| `TestResultsTable` | row rendering, sort callback + key, keyboard row expand, empty state, pagination boundaries |
| `ApprovalButton` | uncontrolled state transitions, controlled mode callbacks, Undo, no direct approved↔rejected |
| `AgentChatPanel` | empty state, suggested prompts, thinking indicator, close button, error banner (hook mocked) |

Aim for **one assertion per behavior**, not one test per assertion. Group related cases into `describe` blocks.

---

## 2. E2E Testing with Playwright

### Setup

**`nextjs-app/playwright.config.ts`:**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Key points:

- **`webServer`** auto-starts `next dev` so `npm run test:e2e` works in CI and dev. If a dev server is already running locally, Playwright reuses it.
- **`reporter: 'github'`** on CI produces annotations directly on PR diffs.
- **No FastAPI backend dependency** — every spec mocks `/api/*` via `page.route()`. More on that below.

**Install browsers once:**

```bash
npx playwright install chromium
```

### Writing user-flow tests

Use locators like a user would:

```ts
await page.getByRole('button', { name: /open ai agent panel/i }).click();
await page.getByRole('textbox', { name: /message the agent/i }).fill('Hello');
await expect(page.getByText(/Found 3 failed tests/)).toBeVisible({ timeout: 5000 });
```

Avoid:

- `page.waitForTimeout(1000)` — flakes and slows the suite. Use `expect(locator).toBeVisible({ timeout })` instead.
- CSS selectors tied to layout (`.absolute.top-0.right-4`) — they break when styling changes.
- Asserting on pixel values, fonts, or CSS — those belong in visual regression tests (Section 3).

### Data-dependent pages: mock the API

The dashboard page fetches `/api/stats`, `/api/stats/trends`, and `/api/tests`. In E2E, we mock those calls rather than run the FastAPI backend:

```ts
test.beforeEach(async ({ page }) => {
  await page.route('**/api/stats', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STATS_FIXTURE),
    }),
  );
  // ...
});
```

**Why mock instead of running FastAPI:**

1. **Determinism** — fixture data means assertions can check exact KPI numbers (`"527"`, `"78.4"`). Live data would change between runs.
2. **Speed** — no Python process boot, no SQLite seeding, no LLM call latency. Our suite runs in ~2.5s.
3. **Hermeticity** — CI doesn't need to install Python, run migrations, or manage process lifetimes.
4. **Isolation of concerns** — E2E verifies the frontend + client-side data flow. Backend contracts are verified separately (Python unit tests against Pydantic schemas).

The `**/api/stats` glob matches any origin, so the same spec works whether the app calls `http://localhost:8000/api/stats` (via `NEXT_PUBLIC_API_URL`) or a relative URL.

### Walkthrough: `chat-flow.spec.ts` and synthesising SSE

The agent chat panel posts to `/api/chat` and expects a `text/event-stream` response with `AgentEvent` frames. We build the stream in the test:

```ts
function sseFrame(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

const SSE_BODY = [
  sseFrame({ type: 'thinking', message: 'Looking up failed runs.' }),
  sseFrame({ type: 'tool_call', tool_call_id: 'tc_1', tool_name: 'query_tests', args: {} }),
  sseFrame({ type: 'tool_result', tool_call_id: 'tc_1', status: 'success', preview: { row_count: 3 } }),
  sseFrame({ type: 'text', delta: 'Found 3 failed tests. ' }),
  sseFrame({ type: 'text', delta: 'Camera had the highest rate.' }),
  sseFrame({ type: 'done', duration_ms: 1420, tool_calls: 1 }),
].join('');

await page.route('**/api/chat', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: SSE_BODY,
  }),
);
```

The two `text` deltas exercise the hook's reducer concatenation — the final bubble should contain `"Found 3 failed tests. Camera had the highest rate."`. The `done` event triggers rendering of the `doneMeta` footer (`"1 tool call · 1.4s"`).

**Gotcha: the Next.js dev overlay.** `next dev` injects a `<nextjs-portal>` custom element that can intercept pointer events on fixed-position UI. The test suite neutralises it via an init script:

```ts
await page.addInitScript(() => {
  const neutralize = () => {
    document.querySelectorAll('nextjs-portal').forEach((el) => {
      (el as HTMLElement).style.pointerEvents = 'none';
      (el as HTMLElement).style.display = 'none';
    });
  };
  new MutationObserver(neutralize).observe(document.documentElement, {
    subtree: true, childList: true,
  });
  neutralize();
});
```

In production builds this overlay does not exist, so the code path is dev-only.

### CI Integration

```yaml
# .github/workflows/e2e.yml
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: nextjs-app/playwright-report/
```

The `trace: 'on-first-retry'` config dumps a full trace on retries — download the artefact and open with `npx playwright show-trace trace.zip` to debug flakes.

---

## 3. Visual Regression Testing

Visual regression catches unintended pixel diffs — things that logic tests miss, like a broken border-radius, a shifted icon, or a color token regression.

### Playwright snapshot matching

Playwright ships `toHaveScreenshot()` out of the box:

```ts
// nextjs-app/__tests__/e2e/visual.spec.ts
test('dashboard looks right', async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto('/');
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixelRatio: 0.01,   // allow <1% drift for font antialias
    fullPage: true,
  });
});
```

**Baselines** live at `__tests__/e2e/__screenshots__/` and are committed to git.

**Thresholds:** `maxDiffPixelRatio: 0.01` (1%) absorbs subtle OS-level antialiasing differences without letting real regressions through. For critical components, tighten to `0.005`. Avoid `0` — fonts rendered by different Chromium versions almost never match exactly.

**Updating baselines:**

```bash
npx playwright test visual.spec.ts --update-snapshots
```

### CI workflow

1. Run visual tests on every PR in a dedicated job.
2. Fail the job if diff exceeds threshold — the PR author inspects the diff image (Playwright produces a side-by-side actual/expected/diff).
3. To accept intentional visual changes: run `--update-snapshots` locally, commit the new baselines.

**Tip:** disable animations and stabilise time with a global setup:

```ts
await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
await page.clock.setFixedTime(new Date('2026-04-01T12:00:00Z'));
```

### Alternative: Chromatic

For teams heavily invested in Storybook (we have 9 stories in Phase 8), [Chromatic](https://www.chromatic.com/) captures screenshots of every story automatically. It's a zero-config visual regression pipeline for component-level coverage. Playwright screenshots complement this by covering full-page layouts.

---

## 4. AI-Assisted Test Generation

> This is the differentiator. Every team claims to "use AI for productivity" — few articulate how.

LLMs write decent test skeletons but fail at domain knowledge. Frontend engineers provide the component spec and behavior contract; the AI fills in the boilerplate. **The project's own AI agent can be turned inward — used to generate tests for its own UI.**

### The 4-step workflow

#### 1. Specify

Paste the component into the prompt. Include:

- The **props interface** (exact TypeScript).
- The **rendered JSX** (so the AI sees what DOM nodes exist).
- A **behavior contract** in plain English: states, transitions, edge cases, callbacks.
- The **testing conventions** you use (Vitest + RTL + `user-event@14`, not Jest + Enzyme).

#### 2. Prompt

Ask for test cases covering: happy path, edge cases, error states, accessibility, and callback assertions. Request the specific framework and syntax you want.

#### 3. Review

Check the output against these criteria:

- Does it test **behavior**, not implementation?
- Does it use `getByRole` and `getByLabelText` over `getByTestId`?
- Does it use `userEvent` over `fireEvent`?
- Are callbacks verified with `expect(mockFn).toHaveBeenCalledWith(...)`?
- Are assertions on what the **user** sees, not on internal state?

#### 4. Refine

Run the tests. Fix what's wrong. Delete redundant assertions. Add edge cases the AI missed. Swap brittle queries.

### Example: generating `approval-button.test.tsx`

**Prompt (reproducible — copy into any capable LLM):**

```
Here is a React component `ApprovalButton` with these props:

interface ApprovalButtonProps {
  testId: string;
  onApprove?: (testId: string) => void;
  onReject?: (testId: string) => void;
  status?: 'approved' | 'rejected' | null;
  onStatusChange?: (testId: string, next: 'approved' | 'rejected' | null) => void;
}

Two modes:
  - Uncontrolled: internal state pending → approved/rejected. Undo returns to pending.
  - Controlled: parent owns state via `status` prop. Transitions reported via `onStatusChange`.

Design contract: users CANNOT go directly from approved to rejected — they must
press Undo first. This is enforced by only rendering the opposite button in
pending state.

Generate Vitest + React Testing Library tests covering:
  - initial pending render (both buttons visible)
  - approve click → approved pill, onApprove(testId) fires once
  - reject click → rejected pill, onReject(testId) fires once
  - undo returns to pending, does NOT re-fire callbacks
  - the no-direct-transition guarantee
  - controlled-mode: onStatusChange(testId, 'approved'|'rejected'|null) fires
  - parent-integration via useState harness

Use user-event@14, vi.fn() for spies, and getByRole/getByText — not testIds.
Render imports from '@testing-library/react'. The component imports from
'@/components/approval-button'.
```

**What the AI typically gets wrong on first pass:**

1. **Uses `fireEvent.click` instead of `userEvent.click`** — `fireEvent` doesn't simulate focus/blur/pointer events, so it misses focus-management bugs. Always swap to `userEvent`.
2. **Misses the Undo transition** — AI often treats the component as "approve or reject, done." You must explicitly request the Undo round-trip.
3. **Asserts `onApprove` is NOT called in controlled mode** — in this codebase, `onApprove` fires in both modes (it's a side-effect hook; `onStatusChange` is the source of truth). AI guesses the wrong contract without reading the component.
4. **Uses `getByTestId('approve-button')`** — AI defaults to brittle selectors. Rewrite as `getByRole('button', { name: /approve/i })`.
5. **Ships tests that don't run** — imports a helper that doesn't exist, invents a prop name. Always run the tests.

### Meta-workflow: generate tests from Storybook stories

If you already have Storybook stories, they are nearly ideal test specs — each story is already a named variant with known props. Feed the story file to the LLM:

```
Here is my Storybook file `KpiCard.stories.tsx`. Generate a Vitest + RTL
test file that covers each story as a test case. For each story, assert the
props render as described in the story's meta.parameters.docs.description.
```

This approach produces tests aligned with the documented variants, not arbitrary edge cases the AI imagines.

### Using our own agent for this

The ADAS Test Agent's chat panel (`components/agent-chat-panel.tsx`) is itself a capable LLM harness with tool calling. Point it at a component spec and it will generate tests. The project dogfoods its own tooling: the same agent that answers "show me failed tests this week" can answer "generate tests for ConfidenceBadge."

In a real co-op setting you'd extend this with a `generate_component_tests` tool that reads a component file, infers its prop interface, and emits a test scaffold into the `__tests__/` directory. That's a natural Phase 11.

### Limits

- **AI can't see your rendered DOM.** It guesses roles and labels. Always run the generated tests and fix broken queries.
- **AI doesn't know your mock strategy.** It might invent a `MockProvider` that doesn't exist in your codebase. Explicitly list your mocking patterns in the prompt.
- **AI tends to over-test.** Delete redundant assertions — they slow the suite and obscure intent.
- **Never merge AI-generated tests without running them.** The cost of a broken test is lower than the cost of a false positive masking a real bug.

---

## 5. Accessibility Testing

### Why automate a11y

Automated tools catch roughly **30% of accessibility issues** — missing labels, insufficient contrast, broken ARIA patterns. The other 70% (logical tab order, meaningful focus indicators, screen-reader narrative) still requires manual audits. Combine both.

### `jest-axe` in component tests

We wire [`jest-axe`](https://github.com/nickcolley/jest-axe) into Vitest in `vitest.setup.ts`:

```ts
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
```

Assert on any rendered component:

```tsx
import { axe } from 'jest-axe';

it('has no axe-detectable accessibility violations', async () => {
  const { container } = render(<TestResultsTable {...props} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

Add this as the **last test** of every component test file. See `__tests__/components/kpi-card.test.tsx` and `__tests__/components/test-results-table.test.tsx` for working examples.

### Common WCAG violations in dashboards

| Violation | What to look for |
|-----------|------------------|
| **Color contrast** | Status badges on white backgrounds — amber/warning often fails 4.5:1 contrast ratio. Test with actual rendered hex values, not design tokens. |
| **Missing table headers** | Use `<th scope="col">` not `<th>`. Sortable columns need `aria-sort="ascending"\|"descending"\|"none"`. |
| **Icon-only buttons** | Every icon button needs `aria-label`. Our close button: `<button aria-label="Close chat panel">`. |
| **Focus traps in panels** | When a modal/panel opens, focus should move into it. When closed, focus returns to the invoking button. |
| **Non-keyboard interactions** | Clickable divs without `role`, `tabIndex`, and key handlers. Our table rows: `role="button" tabIndex={0}` + Enter/Space handler. |

### Automated checks in CI

1. Run `npm test` — axe assertions fail the build on new violations.
2. Baseline existing violations to avoid breaking CI on day 1: use `axe.configure({ rules: [{ id: 'color-contrast', enabled: false }] })` temporarily while fixing incrementally.
3. For production builds: integrate `@axe-core/react` in dev mode to log violations during development — devs see feedback immediately without needing to run tests.

### Keyboard-only navigation checklist

For this specific app, the user should be able to traverse the entire UI with just Tab / Shift+Tab / Enter / Escape:

1. **Sidebar:** Tab through nav items (Dashboard, Test Results, Test Generator) → AI Agent toggle.
2. **Main content:** Tab into KPI cards (decorative, no tab stop) → chart "view data" buttons (if present) → table headers (sort) → table rows (expand).
3. **Chat panel (open):** Tab from toggle → close button → message list → input → Send/Stop.
4. **Chat panel (closed):** `tabIndex={-1}` on body elements so focus doesn't enter hidden UI. We enforce this in `AgentChatPanel`.
5. **Escape key** should close the chat panel (future enhancement — not yet implemented).

### Tooling

- **[axe DevTools](https://www.deque.com/axe/devtools/)** browser extension — manual audits, same ruleset as `jest-axe`.
- **Storybook `@storybook/addon-a11y`** — already installed in Phase 8. Runs axe per-story in the preview iframe. Check the "Accessibility" tab on any story.
- **macOS VoiceOver** / **NVDA (Windows)** — the only way to catch issues tools can't see. Budget 30 minutes per sprint for manual screen-reader walkthroughs.
- **Lighthouse** (Chrome DevTools) — end-to-end audit including a11y, performance, and best practices.

---

## Running the full suite

```bash
cd nextjs-app

# Component tests (Vitest)
npm test                      # 53 tests, ~2s
npm run test:watch            # watch mode

# E2E (Playwright)
npx playwright install chromium   # one-time
npm run test:e2e              # 4 tests, ~3s
npm run test:e2e:ui           # interactive UI mode for debugging

# Type check + lint
npm run type-check
npm run lint
```

---

## Further reading

- [Testing Library guiding principles](https://testing-library.com/docs/guiding-principles)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [axe-core rules](https://dequeuniversity.com/rules/axe/)
- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)
