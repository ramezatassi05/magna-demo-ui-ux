# ADAS Test Agent — Component Library

> A documented design system for Magna's ADAS validation dashboards.
> All components are documented interactively in **Storybook** — run `npm run storybook` in `nextjs-app/` and open [http://localhost:6006](http://localhost:6006).

---

## Overview

**Design system name:** *Precision Engineering Dashboard*
**Target user:** automotive validation engineer (internal R&D tool — not mobile)
**Visual direction:** Bloomberg Terminal × Linear × Vercel Dashboard. Clean but data-dense. Monospaced numerics for aligned reading. Surgical spacing. Dark chrome around light content.

The app uses a **light content area** (dashboards, tables, charts) framed by **dark chrome** (left sidebar, right chat panel). This inversion separates workspace from workflow: the engineer reads data on a light surface, while the agent conversation and navigation live on a dark surface that doesn't compete for attention.

**Why a component library?** This tool is explicitly designed to prototype-then-productize. The Streamlit MVP was the "before"; the Next.js app is the "after." Extracting shared primitives (KPI card, chart card, result badge, confidence badge, approval button, status indicator) into a documented library is what makes the productized version **scalable** for the rest of the R&D org — any new internal dashboard can import the same primitives and inherit the same visual language.

---

## Design Tokens

Single source of truth: **CSS custom properties** in [`nextjs-app/app/globals.css`](../nextjs-app/app/globals.css) → mirrored as Tailwind utilities in [`nextjs-app/tailwind.config.ts`](../nextjs-app/tailwind.config.ts).

### Color tokens

| Token | Hex | Tailwind utility | Purpose |
|---|---|---|---|
| `--bg-primary` | `#0F1117` | `surface-dark` | Sidebar, chat panel |
| `--bg-secondary` | `#1A1D27` | `surface-elevated` | Cards on dark surface, active nav item |
| `--bg-content` | `#F8F9FB` | `surface-base` | Main content area |
| `--bg-card` | `#FFFFFF` | `surface-card` | Cards on light surface |
| `--magna-red` | `#C4161C` | `magna-red` | Brand accent, active markers, CTA hover targets |
| `--magna-red-hover` | `#A01218` | `magna-red-hover` | Primary button hover state |
| `--status-pass` | `#10B981` | `status-pass` | Pass badges, positive trend arrows |
| `--status-fail` | `#EF4444` | `status-fail` | Fail badges, error banners, destructive actions |
| `--status-warning` | `#F59E0B` | `status-warning` | Warning badges, amber indicators |
| `--status-info` | `#3B82F6` | `status-info` | Info accent on KPI cards |
| `--agent-thinking` | `#8B5CF6` | `agent-thinking` | Purple pulse while the agent reasons |
| `--agent-idle` | `#6B7280` | `agent-idle` | Neutral "not working" state |
| `--agent-success` | `#10B981` | `agent-success` | Successful tool execution, open chat indicator |
| `--text-primary` | `#111827` | `ink-primary` | Body copy, headings, table data |
| `--text-secondary` | `#6B7280` | `ink-secondary` | Labels, captions, meta text |
| `--text-muted` | `#9CA3AF` | `ink-muted` | Placeholder text, inactive states |
| `--text-on-dark` | `#F3F4F6` | `ink-on-dark` | Copy on dark surfaces |
| `--border-default` | `#E5E7EB` | `hairline` | Card borders, table dividers |
| `--border-subtle` | `#F3F4F6` | `hairline-subtle` | Zebra rows, faint separators |

> **Opacity modifiers** are applied at the call site: `bg-agent-thinking/20` → 20% alpha, `border-status-pass/40` → 40% alpha. Use these instead of pre-declaring every tint.

### Typography scale

- **Display / data / code** → `font-mono` → `JetBrains Mono`, fallback `ui-monospace`, `SF Mono`, `Menlo`
- **Body / UI** → `font-sans` → `DM Sans`, fallback system sans
- `body` has `font-feature-settings: 'cv11', 'ss01'` for DM Sans' alternate glyphs

| Size | Use |
|---|---|
| 10px | Uppercase section labels, tracked `tracking-wider`, always muted |
| 11px | Trend deltas, empty-state hints, status labels |
| 12px | Table meta, tooltips, chart axis ticks |
| 13px | Card descriptions, captions |
| 14px | Primary body copy, nav items |
| 16px | Card titles, section headings |
| 28px | KPI metric values (always `font-mono font-bold tabular-nums`) |

**Rule:** any numeric cell (KPI values, table numbers, trend deltas, dates) uses `font-mono tabular-nums`. This keeps columns aligned regardless of digit width.

### Spacing system

4px base grid. Allowed multiples: `4, 8, 12, 16, 24, 32, 48`. Use Tailwind spacing utilities directly (`p-4` = 16px, `gap-6` = 24px).

| Named dimension | Value | Utility | Purpose |
|---|---|---|---|
| Sidebar width | 260px | `w-sidebar` | Fixed left nav |
| Chat panel width | 400px | `w-chatpanel` | Slide-in right panel |
| KPI bar height | 80px | `h-kpibar` | Top metric row |
| Card corner radius | 12px | `rounded-card` | All surface-card containers |
| Content max-width | 1440px | `max-w-content` | Main area cap |

### Shadows

| Token | Use |
|---|---|
| `shadow-card` (`0 1px 3px rgba(0,0,0,0.06)`) | Default resting state on any white card |
| `shadow-card-hover` (`0 4px 12px rgba(0,0,0,0.08)`) | Hover state on interactive cards (KPI, chart) |
| `shadow-panel` (`-8px 0 24px rgba(0,0,0,0.12)`) | Chat panel slide-in shadow |

### Motion

- `animate-agent-pulse` (1.4s ease-in-out infinite) — purple status dot while agent is thinking
- `skeleton-shimmer` (1.6s linear infinite) — loading skeleton placeholders
- `animate-fade-in` (400ms ease-out) — staggered entrance for dashboard rows
- `.expand-row-wrapper[data-open='true']` (200ms grid-template-rows) — smooth table row expansion

---

## Component catalog

Each component below has a dedicated story in Storybook with interactive controls. The link refers to the folder path; the Storybook sidebar will show all variants.

### 1. `<KpiCard>`

**Purpose.** Fixed-height metric card with animated count-up, optional trend delta, and a colored left-border accent. Sits in the 4-card row at the top of the dashboard.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Uppercase small label (11px tracked) |
| `value` | `number` | — | Animated via `useCountUp` over 800ms |
| `unit` | `string?` | — | Trailing unit (e.g. `%`, `m`) |
| `trend` | `number?` | — | Signed percentage-point delta vs prior period |
| `accentColor` | `'pass' \| 'fail' \| 'warning' \| 'info' \| 'magna'` | — | Left-border color |
| `loading` | `boolean` | `false` | Shows skeleton bars |
| `icon` | `LucideIcon?` | — | Rendered in the top-right of the card |
| `decimals` | `number` | `0` | Formatted digits after decimal |
| `invertTrend` | `boolean` | `false` | For metrics where "down" is good (FPR, latency) |

**Usage**

```tsx
<KpiCard
  label="Pass Rate"
  value={78.4}
  unit="%"
  trend={2.3}
  accentColor="pass"
  decimals={1}
  icon={Target}
/>
```

**When to use.** Top-of-dashboard summary metrics. Anything you'd check at a glance before drilling in.

**When not to use.** Don't use for categorical breakdowns — use a bar chart. Don't use without a trend if the metric could ship alone (consider `<ChartCard>` with a sparkline instead).

**Accessibility.** Decorative icons use `aria-hidden`. Trend direction is conveyed by both color and arrow icon.

---

### 2. `<ChartCard>`

**Purpose.** White card wrapper for every dashboard chart and mini-table. Handles its own loading / error / empty states so the child chart can focus on rendering data.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Card heading (16px, semibold) |
| `description` | `string?` | — | Subheading (13px, muted) |
| `loading` | `boolean` | `false` | Replaces children with skeleton |
| `error` | `Error \| null` | `null` | Shows error state with `error.message` |
| `onRetry` | `() => void` | — | When present with `error`, renders a Retry button |
| `minHeight` | `number` | `280` | Reserved vertical space to prevent layout shift |
| `headerRight` | `ReactNode?` | — | Slot for pills, range toggles, export buttons |
| `children` | `ReactNode` | — | Chart / table content |

**Usage**

```tsx
<ChartCard title="Daily failures" description="Last 30 days" loading={isLoading} error={error} onRetry={mutate}>
  <DailyTrendLine trends={trends} />
</ChartCard>
```

**When to use.** Any chart, mini-table, or chart-adjacent visualization on the dashboard.

**When not to use.** Don't wrap KPI metrics (use `<KpiCard>`). Don't wrap full-page data tables (the results table has its own shell).

**Accessibility.** Title renders as `<h3>`. Error state uses `role="alert"` semantics via visible copy. Always set `minHeight` to prevent CLS.

---

### 3. `<TestResultsTable>`

**Purpose.** Sortable, paginated table of ADAS validation runs. Supports expandable rows with a `renderExpanded` callback for per-test detail drawers.

**Props** (abbreviated — see [`components/test-results-table.tsx`](../nextjs-app/components/test-results-table.tsx))

| Prop | Type | Description |
|---|---|---|
| `rows` | `TestRecord[]` | Current page of data |
| `loading` | `boolean?` | Shows 10 skeleton rows |
| `page`, `pageSize`, `total`, `totalPages` | `number` | Pagination state (parent-owned) |
| `sortKey`, `sortDir` | — | Current sort (optional) |
| `onSort`, `onPageChange`, `onRowClick` | callbacks | State updaters |
| `expandedRowId` | `string \| null?` | Which row (if any) to expand |
| `renderExpanded` | `(row) => ReactNode?` | Typically `<TestResultsRowDetail row={row} />` |
| `onClearFilters` | `() => void?` | Rendered in the empty state |

**Usage**

```tsx
<TestResultsTable
  rows={tests}
  page={page}
  pageSize={20}
  total={total}
  totalPages={totalPages}
  sortKey={sortKey}
  sortDir={sortDir}
  onSort={setSort}
  onPageChange={setPage}
  onRowClick={setExpandedId}
  expandedRowId={expandedId}
  renderExpanded={(row) => <TestResultsRowDetail row={row} />}
/>
```

**When to use.** The single full-page data browser at `/results`. Also inside chat when the agent returns structured records (via the dedicated chat variant).

**When not to use.** Don't use for agent tool output (use the lighter `<InlineTable>` instead). Don't use for summary grids (use `<KpiCard>` rows).

**Accessibility.** Rows are `role="button"` with `tabIndex=0`, Enter/Space triggers expansion, `aria-expanded` reflects state. Sortable headers are buttons with visible direction arrows. Sticky header stays readable on scroll.

---

### 4. `<ConfidenceBadge>`

**Purpose.** Pill that communicates model / detection confidence (High / Medium / Low). Accepts either a numeric `score` (0.0–1.0, mapped via `confidenceLevel()`) or an explicit `level`.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `score` | `number?` | — | 0.0–1.0, mapped via `confidenceLevel()` in `lib/aggregations.ts` |
| `level` | `'high' \| 'medium' \| 'low'?` | — | Explicit level, takes precedence |
| `showIcon` | `boolean` | `true` | Leading check / warning / x icon |
| `showScore` | `boolean` | `false` | Appends percentage (e.g. "92") |
| `size` | `'sm' \| 'md'` | `'md'` | 5px vs 6px height difference |

**Usage**

```tsx
<ConfidenceBadge score={0.92} showScore />
<ConfidenceBadge level="medium" size="sm" />
```

**When to use.** Next to any AI-generated content or model output — test case cards, detection results, chat attachments. Calibrates user trust.

**When not to use.** Don't use for non-model metrics (use `<ResultBadge>` or a KPI delta). Don't chain multiple badges per entity.

**Accessibility.** Hex color + icon + label → information is triply redundant. Tooltip (`title`) shows the raw score percentage when a score is provided.

---

### 5. `<StatusIndicator>`

**Purpose.** Colored dot (+ optional label) for agent runtime state. Thinking pulses purple, idle is gray, success is green, error is red.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` | `'thinking' \| 'idle' \| 'success' \| 'error'` | — | Runtime state |
| `label` | `string?` | — | Optional text rendered beside dot |
| `size` | `'sm' \| 'md'` | `'md'` | 1.5px vs 2px dot |

**Usage**

```tsx
<StatusIndicator state="thinking" label="Generating test cases…" />
```

**When to use.** Anywhere the user needs to know if the agent is working — chat headers, tool-call cards, sidebar toggles, inline bubbles.

**When not to use.** Don't use for per-row test results (use `<ResultBadge>`).

**Accessibility.** Dot is `aria-hidden` — the label carries semantic meaning. If no label, pair with an adjacent visible text label.

---

### 6. `<ApprovalButton>`

**Purpose.** Human-in-the-loop control attached to each AI-generated test case. Two modes: **uncontrolled** (internal pending → approved/rejected state machine) or **controlled** (parent tracks status for export filtering).

**Props**

| Prop | Type | Description |
|---|---|---|
| `testId` | `string` | Identifier forwarded to callbacks |
| `onApprove`, `onReject` | `(testId: string) => void?` | Fired on first transition |
| `status` | `ApprovalStatus?` | When present, component is controlled |
| `onStatusChange` | `(testId, next) => void?` | Required in controlled mode |

**Usage (controlled)**

```tsx
const [status, setStatus] = useState<ApprovalStatus>(null);
<ApprovalButton
  testId={tc.test_id}
  status={status}
  onStatusChange={(_id, next) => setStatus(next)}
/>
```

**When to use.** Every AI-generated artifact the user must audit: test case cards, data entries, suggested queries.

**When not to use.** Don't use for simple confirmations (use a primary button). Don't use in a mode where rejection has no downstream effect.

**Accessibility.** Both buttons have visible labels + lucide icons. Focus rings match the status color (`ring-status-pass` / `ring-status-fail`). Undo is keyboard-reachable.

---

### 7. `<AgentChatPanel>`

**Purpose.** Slide-out right-side panel (400px, dark theme) that hosts the full streaming chat experience. Always mounted so session state persists across close/reopen.

**Props**

| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Controls the slide-in transform |
| `onClose` | `() => void` | Fired when the user clicks the X |

**Internal state.** The panel owns messages / input / streaming status via `useAgentChat()` (see [`hooks/use-agent-chat.ts`](../nextjs-app/hooks/use-agent-chat.ts)). Storybook swaps the hook for a fixture-driven mock so stories stay deterministic.

**Usage**

```tsx
const [chatOpen, setChatOpen] = useState(false);
<AgentChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
```

**When to use.** One instance per app, mounted in the root layout. The sidebar AI Agent button toggles it.

**When not to use.** Don't use standalone — always mount in `<AppShell>`. Don't replicate it per page.

**Accessibility.** `aria-hidden` toggles with `open`. Panel's inner controls get `tabIndex=-1` when closed so tab order skips them. Close button has `aria-label`.

---

### 8. `<ScenarioFilter>`

**Purpose.** Filter bar for the Results page. Combines debounced search, three typed dropdowns (Sensor / Result / Feature), and a date range.

**Props**

| Prop | Type | Description |
|---|---|---|
| `filters` | `TestFilters` | Current state (URL-synced in production) |
| `onChange` | `(next: Partial<TestFilters>) => void` | Partial updates; parent merges |
| `onClear` | `() => void` | Resets all filters |
| `activeCount` | `number` | Drives the red "N active" pill |

**Usage**

```tsx
<ScenarioFilter
  filters={filters}
  onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
  onClear={() => setFilters({ page: 1 })}
  activeCount={countActive(filters)}
/>
```

**When to use.** Directly above `<TestResultsTable>` on the results page. URL-synced via `useFiltersUrlSync()`.

**When not to use.** Don't use for simple single-dropdown filters (use `<FilterDropdown>` directly).

**Accessibility.** Each control has `aria-label`. Search input is `type="search"` with a visible icon. Debounce (300ms) keeps typing responsive.

---

### 9. `<SidebarNav>`

**Purpose.** Fixed-width (260px) left navigation. Three primary routes + an AI Agent panel toggle pinned to the bottom.

**Props**

| Prop | Type | Description |
|---|---|---|
| `chatOpen` | `boolean` | Reflects the chat panel's current state |
| `onToggleChat` | `() => void` | Flips `chatOpen` upstream |

**Active state.** Driven by `usePathname()` — no prop needed. Storybook stories override via `parameters.nextjs.navigation.pathname`.

**Usage**

```tsx
<SidebarNav chatOpen={chatOpen} onToggleChat={() => setChatOpen((v) => !v)} />
```

**When to use.** Once, in the root `<AppShell>`.

**When not to use.** Don't add secondary navigation here — the IA is intentionally flat.

**Accessibility.** `aria-current="page"` on the active nav item, `aria-pressed` on the chat toggle. Red accent bar is `aria-hidden` (color isn't the only signal — the active item also has a lighter background).

---

## Composition patterns

### Dashboard grid (top-to-bottom)

See [`app/page.tsx`](../nextjs-app/app/page.tsx).

1. Row 1 — **4 KPI cards** in a `grid-cols-4 gap-4` grid (Total Tests, Pass Rate, Mean Detection Distance, False Positive Rate)
2. Row 2 — two chart cards side-by-side: `<SensorResultsBar>` + `<ResultDonut>` wrapped in `<ChartCard>`
3. Row 3 — full-width `<DailyTrendLine>` wrapped in `<ChartCard>`

Rationale: glance → compare → trend. Three rows, increasing detail.

### Filter + table pattern

See [`app/results/page.tsx`](../nextjs-app/app/results/page.tsx).

```tsx
<ScenarioFilter ... />
<TestResultsTable ... renderExpanded={(row) => <TestResultsRowDetail row={row} />} />
```

Filter bar above. Active filter count feeds the red pill. Pagination lives inside the table footer. Click-to-expand replaces a modal.

### Chat panel overlay

See [`components/app-shell.tsx`](../nextjs-app/components/app-shell.tsx).

```tsx
<SidebarNav chatOpen={chatOpen} onToggleChat={toggle} />
<main className={chatOpen ? 'mr-chatpanel' : ''}>{children}</main>
<AgentChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
```

Chat panel is **always mounted** and transitions via `translate-x-full` — this preserves message state across close/reopen. Main content reserves space for the panel when open.

### Human-in-the-loop test case review

See [`app/test-generator/page.tsx`](../nextjs-app/app/test-generator/page.tsx) + [`components/test-generator/test-case-card-light.tsx`](../nextjs-app/components/test-generator/test-case-card-light.tsx).

Each generated test case card combines:

- `<ConfidenceBadge>` — signals how much the engineer should trust the output
- `<ApprovalButton>` (controlled) — records an approve/reject decision the page uses for CSV export filtering
- Inline editing — the engineer can edit steps, criteria, or expected result before approving

Rationale: the agent drafts, the engineer reviews. Confidence + approval is the minimum viable accountability loop for AI-generated artifacts.

---

## Running Storybook

```bash
cd nextjs-app
npm install            # if deps aren't installed
npm run storybook      # dev server on :6006
npm run build-storybook # static build to storybook-static/
```

Each of the 9 components above has its own story file at [`nextjs-app/stories/*.stories.tsx`](../nextjs-app/stories). The Docs tab auto-generates a props table from the TypeScript interfaces. Interactive controls let you flip variants (accent colors, sizes, loading/error states) without touching code.
