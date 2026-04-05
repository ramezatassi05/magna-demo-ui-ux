# Magna Industrial AI Refactor

> This is a second build pass applied **after** the base Next.js app (Phases 1–10
> in `CLAUDE.md`) was completed. Goal: transform the "vibe-coded modern dashboard" aesthetic
> into Magna's actual internal R&D tool feel — **Bloomberg Terminal meets Linear**,
> with industrial AI trust components (confidence meters, "why" rationale,
> manual overrides, anomaly alerts, scoping presets, parameter sliders).
>
> **Source plan**: `/Users/ramezatassi/.claude/plans/zazzy-coalescing-crayon.md`
>
> **Work is split across 7 phases (A–G)**. Each phase is self-contained and can
> be executed in a fresh context window. When the user says "do Phase X", read
> this section, check the completion status below, and execute only that phase.

## Completion Status

- ✅ **Phase A — Foundation (tokens, deps, IndustrialIcon)** — COMPLETE
- ✅ **Phase B — Primitives (MotionPrimitives, ConfidenceMeter, AnomalyAlertBadge, WhyPopover, EngineeringMetadata)** — COMPLETE
- ✅ **Phase C — Data layer (operations, simulations, build-trace, stores)** — COMPLETE
- ✅ **Phase D — Composite components (ScopingPresets, ParameterSliderPanel, DynamicTaskCard, DecisionTrace, ManualOverrideControl, SimulatedRibbon)** — COMPLETE
- ✅ **Phase E — Visual refresh of existing components** — COMPLETE
- ⬜ **Phase F — Page integration (Dashboard, Results, Test Generator, Chat)** — TODO
- ⬜ **Phase G — Test + polish (Playwright, a11y, reduced-motion, bundle, screenshots)** — TODO

## General Rules for All Phases

1. **Before starting a phase**: read this enhancement section AND the source plan file. Check the Completion Status. Do NOT redo completed phases.
2. **Verification gates**: after each phase, run `npm run type-check`, `npm run lint`, and `npm run test`. All must pass before marking the phase complete.
3. **Token discipline**: never use raw `slate-*` or hardcoded hex values. Use the design tokens in `tailwind.config.ts` (`state-*`, `status-*`, `ink-*`, `hairline`, `surface-*`, `magna-red`, `agent-*`).
4. **Icon discipline**: in `components/industrial/**`, always use `IndustrialIcon` from `@/components/industrial/industrial-icon`. Raw lucide imports are blocked by ESLint in that directory. Outside the industrial dir, raw lucide is still OK (existing components use it).
5. **Motion discipline**: every animation must gate on `useReducedMotion()` (for framer-motion) or be listed in the `prefers-reduced-motion` media query at the bottom of `globals.css`.
6. **Coexistence**: keep `ConfidenceBadge` alongside new `ConfidenceMeter` (Badge in table cells, Meter in hero contexts). Keep `ThinkingIndicator` as fallback for when `toolCalls` are empty. Keep CSS `animate-fade-in` until Phase F migrates consumers.
7. **Testing**: new tests live under `__tests__/industrial/**`, `__tests__/lib/**`, or `__tests__/stores/**` (all auto-included via `vitest.config.ts`).
8. **Stories**: new Storybook stories live under `stories/industrial/**`.

---

## Phase A — Foundation (COMPLETE — reference only)

**What was done**:

1. **Dependencies installed**:
   - `framer-motion`, `zustand`, `tailwindcss-animate`
   - `@radix-ui/react-popover/tooltip/slider/dialog/alert-dialog/slot` (via shadcn CLI)

2. **shadcn components installed**: `popover tooltip slider dialog alert-dialog` then all refactored from slate → Magna tokens (`hairline`, `ink-*`, `surface-card`, `magna-red`). The shadcn CLI also overwrote `components/ui/button.tsx` — I restored custom Magna variants (primary, secondary, ghost, destructive, outline) AND added a new `override` variant + the `asChild`/Slot pattern.

3. **Design tokens added to `nextjs-app/app/globals.css`**:
   - State Rules: `--state-critical`, `--state-anomaly`, `--state-override`, `--state-nominal` (+ bg + border variants)
   - Motion: `--motion-instant/quick/standard/emphasis/attention`, `--ease-standard/emphasis/decelerate/accelerate`
   - Meter: `--meter-track`, `--meter-fill-high/med/low`
   - Keyframes: `anomaly-pulse`, `confirmation-flash` (gated by `prefers-reduced-motion`)
   - `.metadata-strip` utility class

4. **`nextjs-app/tailwind.config.ts`** extended with `state.*` colors, `meter.track`, `transitionDuration.{instant,quick,standard,emphasis}`, `transitionTimingFunction.{standard,emphasis,decelerate}`, `fontSize.code`. `borderRadius.card` tightened from 12px → 8px. Added `stories/**` to content glob. Added `tailwindcss-animate` plugin.

5. **Files created**:
   - `nextjs-app/lib/motion-tokens.ts` — JS mirror of CSS motion vars for framer-motion
   - `nextjs-app/lib/hooks/use-throttled-value.ts` — rAF-throttled value for slider→recompute
   - `nextjs-app/components/industrial/industrial-icon.tsx` — icon enforcement wrapper with 22 semantic aliases, `size` (xs/sm/md/lg → 12/14/16/20px), `tone` (critical/anomaly/override/nominal/brand/muted/on-dark/inherit)

6. **ESLint rule added** in `.eslintrc.json`: restricts raw `lucide-react` imports in `components/industrial/**` (excluding `industrial-icon.tsx` itself).

7. **Test config expanded**: `vitest.config.ts` now includes `__tests__/industrial/**`, `__tests__/lib/**`, `__tests__/stores/**`.

**Verification (already passing)**: type-check ✓, lint ✓, 55 existing tests ✓.

---

## Phase B — Primitives (COMPLETE — reference only)

**What was done**: 5 stateless primitive components built, each with Storybook story + unit tests.

1. **`components/industrial/motion-primitives.tsx`** — Exports `FadeIn`, `SlideUp`, `InsightPulse`, `StaggerGroup`, `ConfirmationFlash`. All gate on `useReducedMotion()` and short-circuit to plain containers under reduced-motion. Reads durations/easings from `lib/motion-tokens.ts`.

2. **`components/industrial/confidence-meter.tsx`** — SVG arc gauge (270° sweep). Props: `score` (0-1), `size` (sm/md/lg → 48/72/96px), `label`, `showValue`, `thresholds`, `animate`. Animates via framer-motion `strokeDashoffset`. ARIA: `role="meter"` + `aria-valuenow/valuetext`. Maps score → level via `confidenceLevel()` in `lib/aggregations.ts`.

3. **`components/industrial/anomaly-alert-badge.tsx`** — 3 variants: `standalone` (pill), `inline-row` (4px left strip), `kpi-corner` (dot). Props: `severity` (critical/anomaly/watch), `label`, `value`, `pulsing`, `tooltip`. Only critical pulses by default. Uses Radix Tooltip for `inline-row` and `kpi-corner` variants.

4. **`components/industrial/why-popover.tsx`** — Wraps Radix Popover. Props: `trigger` (optional, default renders "Why?" icon button), `title`, `subtitle`, `dataPoints` (structured evidence with weight + tone), `logic` (rule bullets), `rationale` (free-form). Auto-renders empty-state copy when no content provided.

5. **`components/industrial/engineering-metadata.tsx`** — Mono 10px uppercase-tracked metadata strip. Props: `items: MetadataItem[]` (each with `label?` + `value` + `tone` + `valueOnly`), `align` (start/center/end/between). Renders label:value pairs with middle-dot separators.

**Stories created** (in `nextjs-app/stories/industrial/`): `IndustrialIcon.stories.tsx`, `ConfidenceMeter.stories.tsx`, `AnomalyAlertBadge.stories.tsx`, `WhyPopover.stories.tsx`, `EngineeringMetadata.stories.tsx`.

**Tests created** (in `nextjs-app/__tests__/industrial/`): `industrial-icon.test.tsx` (7), `confidence-meter.test.tsx` (10), `anomaly-alert-badge.test.tsx` (11), `why-popover.test.tsx` (7), `engineering-metadata.test.tsx` (7).

**Verification (already passing)**: type-check ✓, lint ✓, 97 tests total ✓.

---

## Phase C — Data Layer (TODO)

**Goal**: pure functions and Zustand stores that power the composite components in Phase D. No React components in this phase.

### C1. Create `nextjs-app/lib/operations.ts`

Anomaly detection + task derivation for the dashboard.

```ts
import type { TestRecord, TestStats, TrendPoint, SensorType } from './types';

export interface AnomalyDetectionResult {
  passRateBreached: boolean;        // pass_rate < 0.88
  fprBreached: boolean;             // mean_false_positive_rate > 0.03
  passRateDelta: number;            // percentage points, signed (last 7d vs prior 7d)
  fprDelta: number;                 // percentage points, signed
  trendRegression: boolean;         // recent trend worse than baseline
  sensorHotspots: Array<{ sensor: SensorType; failRate: number }>; // sorted desc, failRate > 0.1
}

export type TaskSeverity = 'critical' | 'anomaly' | 'watch' | 'nominal';

export interface OperationalTask {
  id: string;
  severity: TaskSeverity;
  title: string;           // "Thermal AEB fail rate spiked 8.4%"
  metric: string;          // "12 failures · 24h"
  context: string;         // "Normally 2-3/day"
  filterLink?: Partial<import('./types').TestFilters>; // deep-link to /results
  actionLabel?: string;    // "Inspect failures"
  rationale?: import('@/components/industrial/why-popover').RationaleDataPoint[];
}

/** Compute per-KPI anomaly state. Pure — memo-friendly. */
export function detectAnomalies(
  stats: TestStats,
  trends: TrendPoint[],
  tests: TestRecord[],
): AnomalyDetectionResult;

/**
 * Rank failures by operational risk.
 *   score = severity×0.5 + recency×0.3 + clusteredness×0.2
 * "Clusteredness" = 3+ similar failures (same sensor+feature) within 24h.
 * Returns at most `limit` tasks (default 5).
 */
export function deriveTasks(
  tests: TestRecord[],
  trends: TrendPoint[],
  limit?: number,
): OperationalTask[];

/** Build a WhyPopover rationale from a task's source failures. */
export function explainTask(
  task: OperationalTask,
  tests: TestRecord[],
): import('@/components/industrial/why-popover').RationaleDataPoint[];

/** Build a WhyPopover rationale for a single failed row. */
export function explainRow(
  row: TestRecord,
): import('@/components/industrial/why-popover').RationaleDataPoint[];

/**
 * Decide if a single row crosses an anomaly threshold.
 *  - critical: result='fail' AND (confidence_score < 0.5 OR notes contains "regression")
 *  - anomaly:  result='fail' OR false_positive_rate > 0.05
 *  - watch:    confidence_score < 0.7 AND result !== 'pass'
 *  - null:     nominal
 */
export function isRowAnomaly(row: TestRecord): 'critical' | 'anomaly' | 'watch' | null;
```

Thresholds (used inside `detectAnomalies`):
- `passRateBreached`: stats.pass_rate < 0.88
- `fprBreached`: stats.mean_false_positive_rate > 0.03
- `trendRegression`: average daily pass count in last 7d < average in prior 7d by ≥ 5%
- `sensorHotspots`: per-sensor fail rate ≥ 0.10, sorted descending

### C2. Create `nextjs-app/lib/simulations.ts`

Client-side threshold simulation over existing test data.

```ts
import type { TestRecord, TestStats } from './types';

export interface SimulationParams {
  min_confidence: number;  // 0–1 ; test kept if confidence_score >= this
  max_fpr: number;         // 0–1 ; test kept if false_positive_rate <= this
  min_distance: number;    // meters; test kept if detection_distance_m >= this
}

export const DEFAULT_SIM_PARAMS: SimulationParams = {
  min_confidence: 0.0,
  max_fpr: 1.0,
  min_distance: 0.0,
};

/** Pure filter over test records. */
export function simulateFiltered(
  tests: TestRecord[],
  params: SimulationParams,
): TestRecord[];

/**
 * Re-derive TestStats from a subset (mirrors api/main.py stats endpoint logic
 * so the dashboard KPI cards can render simulated values without a backend call).
 */
export function simulateStats(subset: TestRecord[]): TestStats;
```

### C3. Create `nextjs-app/lib/chat/build-trace.ts`

Merge agent thinking messages + tool calls into a tree structure for `DecisionTrace` (Phase D).

```ts
import type { ToolCall } from '@/lib/types'; // existing type

export type TraceStepKind = 'reasoning' | 'tool' | 'finding';

export interface TraceStep {
  id: string;
  kind: TraceStepKind;
  label: string;
  toolName?: string;
  status?: 'running' | 'ok' | 'error';
  timestampMs?: number;
  children?: TraceStep[];
}

/**
 * Interleave thinking[] and toolCalls[] by insertion order. Each tool call
 * becomes a parent step; its `preview` (if present) becomes a nested
 * "finding" child. This gives the DecisionTrace a real reasoning tree
 * instead of a flat list.
 */
export function buildTrace(thinking: string[], toolCalls: ToolCall[]): TraceStep[];
```

Look at `nextjs-app/components/chat/use-agent-chat.ts` (or similar) for the exact shape of `ToolCall` — it has `{id, name, args, status, preview, ...}`.

### C4. Create Zustand stores

**`nextjs-app/lib/stores/scoping-presets-store.ts`** — persisted to localStorage.

```ts
import type { TestFilters } from '@/lib/types';

export interface ScopingPreset {
  id: string;
  name: string;
  description?: string;
  filters: Partial<TestFilters>;
  iconName?: import('@/components/industrial/industrial-icon').IndustrialIconName;
  builtin?: boolean;
}

// Seeded built-ins (builtin: true, cannot be deleted):
const BUILTIN_PRESETS: ScopingPreset[] = [
  { id: 'builtin-thermal-rain-night', name: 'Rainy night thermal fails',
    filters: { sensor_type: 'thermal', result: 'fail', search: 'rain night' },
    iconName: 'Sensor', builtin: true },
  { id: 'builtin-aeb-regressions', name: 'AEB distance regressions',
    filters: { feature: 'AEB', result: 'fail' },
    iconName: 'Warning', builtin: true },
  { id: 'builtin-camera-warnings-24h', name: 'Last 24h camera warnings',
    filters: { sensor_type: 'camera', result: 'warning' /* date_from computed at apply time */ },
    iconName: 'Chart', builtin: true },
  { id: 'builtin-lca-false-positives', name: 'LCA false positives',
    filters: { feature: 'LCA', search: 'false positive' },
    iconName: 'Critical', builtin: true },
];

// Store state + actions:
//   presets: ScopingPreset[]     (seeded with BUILTIN_PRESETS on first load)
//   activePresetId: string | null
//   addPreset: (preset: Omit<ScopingPreset, 'id' | 'builtin'>) => void
//   deletePreset: (id: string) => void   // no-op for builtins
//   applyPreset: (id: string) => void    // sets activePresetId; consumers read filters
//   clearActive: () => void
// Persist middleware key: 'scoping-presets-v1'
```

**`nextjs-app/lib/stores/simulation-store.ts`** — NOT persisted (session-local).

```ts
import { SimulationParams, DEFAULT_SIM_PARAMS } from '@/lib/simulations';

// State + actions:
//   params: SimulationParams      (default DEFAULT_SIM_PARAMS)
//   isActive: boolean             (false initially)
//   setParam: (key: keyof SimulationParams, value: number) => void
//   reset: () => void             (returns params to DEFAULT_SIM_PARAMS, isActive = false)
//   activate: () => void          (sets isActive = true)
//   deactivate: () => void
```

### C5. Tests

Create tests in `__tests__/lib/operations.test.ts`, `__tests__/lib/simulations.test.ts`, `__tests__/lib/build-trace.test.ts`, `__tests__/stores/scoping-presets.test.ts`, `__tests__/stores/simulation.test.ts`. Focus on edge cases:

- `isRowAnomaly`: all four severity branches
- `deriveTasks`: ranking correctness, cluster detection, limit respected
- `detectAnomalies`: threshold edges (0.88 pass rate, 0.03 FPR)
- `simulateFiltered`: all 3 predicates combined, boundary inclusions
- `simulateStats`: matches backend stats logic for a subset
- `buildTrace`: interleaving preserves insertion order, findings nest under tools
- `scoping-presets-store`: persistence, builtin deletion no-op, apply/clear
- `simulation-store`: reset restores defaults, activate/deactivate toggles

**Verification**: `npm run type-check`, `npm run lint`, `npm run test` all pass. Expected test count: ~97 previous + ~40–50 new = ~140 tests.

**Mark Phase C complete** when all verifications pass.

---

## Phase D — Composite Components (TODO)

**Goal**: 6 stateful/composite components consuming the data layer + stores from Phase C. Each gets Storybook story + unit tests.

### D1. `components/industrial/scoping-presets.tsx`

Horizontal chip rack. Consumes `scoping-presets-store`. Props:
```ts
interface ScopingPresetsProps {
  /** Called when a preset is applied. Receives the preset's filters. */
  onApply: (filters: Partial<TestFilters>) => void;
  /** Current active filters — used to enable "save current" form. */
  currentFilters: Partial<TestFilters>;
  className?: string;
}
```
- Renders as `role="toolbar" aria-label="Saved filter scopes"`.
- Each preset: `role="button" aria-pressed={active}` chip with IndustrialIcon + name.
- "+" chip at end opens small Popover with name input → calls `addPreset(name, currentFilters)`.
- Kebab menu on user-created presets (not builtins) → delete.
- Active chip: magna-red border + subtle bg tint.

### D2. `components/industrial/parameter-slider-panel.tsx`

Collapsible card with 3 sliders. Props:
```ts
interface ParameterSliderPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}
```
- Consumes `simulation-store` internally (no param props needed).
- 3 Radix Sliders (from `components/ui/slider.tsx`):
  - `min_confidence`: 0–1, step 0.01, formatter: `${(v*100).toFixed(0)}%`
  - `max_fpr`: 0–0.1, step 0.001, formatter: `${(v*100).toFixed(1)}%`
  - `min_distance`: 0–100, step 1, formatter: `${v}m`
- Each slider has: label, current-value readout, min/max markers, `aria-valuetext` with formatted value + unit.
- Reset button: calls `store.reset()` + `ConfirmationFlash` on the whole panel.
- When store becomes "dirty" (any param != default), automatically call `store.activate()`.
- Uses `useThrottledValue` on slider values before emitting to store.

### D3. `components/industrial/simulated-ribbon.tsx`

Thin top banner rendered when `simulation-store.isActive`. Props: none (reads store).
- Full-width horizontal strip, `state-override` tokens.
- Content: IndustrialIcon "Override" + "SIMULATED" label + formatted params + "Exit simulation" button.
- Button calls `store.deactivate()` + `store.reset()`.

### D4. `components/industrial/dynamic-task-card.tsx`

Single task card. Props:
```ts
interface DynamicTaskCardProps {
  task: OperationalTask;
  className?: string;
}
```
- Left 4px accent bar using `state-*` token by severity.
- Row: IndustrialIcon (by severity) + title + `AnomalyAlertBadge` for metric + `WhyPopover` trigger (if `rationale` provided) + action button (Next.js `Link` when `filterLink` set, href `/results?sensor_type=...&result=...`).
- Critical severity: `animate-anomaly-pulse` on the accent bar only.
- Entrance via `SlideUp` from MotionPrimitives.
- Uses `EngineeringMetadata` for the context line.

### D5. `components/industrial/decision-trace.tsx`

Structured reasoning tree. Props:
```ts
interface DecisionTraceProps {
  thinking: string[];
  toolCalls: ToolCall[];
  active: boolean;
  className?: string;
}
```
- Internally calls `buildTrace(thinking, toolCalls)` from Phase C.
- Renders as collapsible (same shell as existing `ThinkingIndicator`) when collapsed shows "Reasoning · N steps" summary.
- Expanded: tree with `role="tree"`, each item `role="treeitem"` + `aria-expanded`.
- Tool steps use `IndustrialIcon` "Database" / "Chart" / "TestCase" / etc. by tool name.
- Finding children indent 16px, use "Trace" icon.
- Arrow key navigation: ArrowDown/Up between siblings, ArrowRight to expand, ArrowLeft to collapse.
- If no tool calls, render the existing `ThinkingIndicator` as fallback (compose, don't duplicate).
- Styled to match the dark chat panel (uses `text-ink-on-dark`, `bg-surface-elevated`).

### D6. `components/industrial/manual-override-control.tsx`

Agent takeover strip. Props:
```ts
interface ManualOverrideControlProps {
  status: 'idle' | 'streaming' | 'error';
  onStop: () => void;
  onInjectFilter?: (filter: string) => void;
  onOverrideRecommendation?: () => void;
  lastRecommendation?: { id: string; summary: string };
  className?: string;
}
```
- Thin strip, dark theme (matches chat panel). `state-override` accent tokens.
- **Stop Agent button**: only visible when `status === 'streaming'`. Opens `AlertDialog` (from `components/ui/alert-dialog.tsx`) with destructive confirm. Title: "Stop agent mid-run?" Description: explains that current tool calls will be abandoned.
- **Inject filter button**: opens small popover with text input. On submit, calls `onInjectFilter(filter)` which prefixes next user message with `[scope: {filter}]`.
- **Override recommendation button**: visible when `lastRecommendation` set. Opens popover showing "Agent said: {summary}" + Reject + Replace buttons.
- Uses `aria-live="polite"` region to announce override events.

### D7. Stories + Tests

Each of the 6 components gets a Storybook story in `stories/industrial/*.stories.tsx` and unit tests in `__tests__/industrial/*.test.tsx`. Focus test coverage on:
- Keyboard navigation (arrow keys in DecisionTrace)
- AlertDialog confirm-before-stop in ManualOverrideControl
- ScopingPresets persistence + active state toggling
- ParameterSliderPanel emits throttled values + reset works
- DynamicTaskCard renders all severities correctly
- SimulatedRibbon shows/hides based on store state

**Verification**: `npm run type-check`, `npm run lint`, `npm run test` all pass. Expected test count: ~140 previous + ~40 new = ~180 tests.

---

## Phase E — Visual Refresh of Existing Components (TODO)

**Goal**: tighten typography, add engineering metadata, migrate to new tokens. No new features — purely cosmetic upgrades that make the existing components feel Magna-industrial.

### E1. `components/kpi-card.tsx`

- Reduce padding: top-level `p-6` → `p-5` (keeps 100px height)
- Add `EngineeringMetadata` footer row (below value + trend): e.g., `source · window · N runs`
- Add optional `anomaly?: 'critical' | 'anomaly' | 'watch' | null` prop → renders `<AnomalyAlertBadge variant="kpi-corner">` when set
- Value number: `tracking-tight` class on the mono span
- Wrap the value in `InsightPulse` from MotionPrimitives (keyed on the value itself) so it pulses when the value changes (e.g., sim updates)
- Accept new `metadata?: MetadataItem[]` prop to feed the footer

### E2. `components/test-results-table.tsx`

- Reduce row height from 40px → 36px (`h-10` → `h-9`)
- Numeric columns (confidence %, distance, FPR, exec time) → add `font-mono tabular-nums text-right`
- Column headers: `text-[10px] uppercase tracking-[0.08em] text-ink-muted`
- Add subtle column separators: `border-r border-hairline-subtle last:border-r-0` on header cells
- Add relative positioning to row `<tr>` + render `<AnomalyAlertBadge variant="inline-row" />` inside each row when `isRowAnomaly(row) !== null`
- Pagination controls: tighten typography, mono page numbers

### E3. `components/test-results-row-detail.tsx`

- Replace header `ConfidenceBadge score showScore` with `<ConfidenceMeter size="md" label="Detection confidence" />`
- Add `<WhyPopover>` trigger next to the engineering notes with `dataPoints={explainRow(row)}` (from Phase C)
- Add `EngineeringMetadata` strip at the bottom: `{ run: test_id }, { firmware }, { vehicle }, { ts }`

### E4. `components/chart-card.tsx`

- Add optional `overline?: string` prop (e.g., "TELEMETRY", "DIAGNOSTICS", "ANALYTICS") rendered above title as `font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted`
- Add optional `footerMetadata?: MetadataItem[]` prop → renders `<EngineeringMetadata>` at bottom of card
- Reduce `rounded-[12px]` references to `rounded-card` (which is now 8px via Phase A)

### E5. `components/sidebar-nav.tsx`

- Add engineering metadata block at the bottom above the chat toggle: `build · env · api` in `metadata-strip` CSS class
- Active nav item: replace full-bleed bg with 3px left red strip (`border-l-[3px] border-magna-red`)

### E6. `components/ui/button.tsx`

Already updated in Phase A with Magna variants + asChild. Only remaining tweak:
- Review uppercase tracking on primary variant — add `tracking-wide` to primary variant if it reads too bunched

### E7. `components/chat/tool-call-card.tsx`

- In the header row, add `<EngineeringMetadata items={[{label:'dur', value:'${ms}ms'}, {label:'rows', value:row_count}]} />` to the right of the tool name
- Tighten font sizes on JSON args/result preview

### E8. `components/chat/thinking-indicator.tsx`

- Restyle collapsible shell to match DecisionTrace (same dark background, border colors). Shared CSS via new utility class or direct tailwind.

### E9. `components/scenario-filter.tsx`

- Active filter count pill: `font-mono tabular-nums`
- Date inputs: narrower, aligned to 4px grid

### E10. Copy refresh (across pages)

- Dashboard header: add subtitle metadata strip "`campaign window 90d · updated {timestamp}`"
- Results page header: add metadata strip "`N records · {activeFilterCount} filters active`"
- Rename "Mean Detection Distance" → "Mean Detection Range · sensor-weighted"
- Add uppercase overlines to ChartCards: "TELEMETRY" (time series), "ANALYTICS" (distributions), "DIAGNOSTICS" (breakdowns)

### E11. Update existing tests

When refactoring components, update corresponding tests in `__tests__/components/*`:
- KpiCard tests may need updated padding assertions
- TestResultsTable tests may need updated row height assertions
- Tests should still pass without functional regressions

**Verification**: `npm run type-check`, `npm run lint`, `npm run test` — all 180+ tests still pass after refresh.

---

## Phase F — Page Integration (TODO)

**Goal**: wire the new Phase D components into the Dashboard, Results, Test Generator, and Chat Panel pages with the new information hierarchy.

### F1. Dashboard (`app/page.tsx`)

New structure (top to bottom):

1. **Header row**: add metadata strip subtitle (already in E10)
2. **Row 0 — DynamicTaskCard rack** (NEW): horizontal scroll container. Use `useMemo(() => deriveTasks(allTests, trends, 5), [allTests, trends])` from Phase C. Render each with `<SlideUp delay={i*0.08}>` wrapper. Empty state: "No anomalies — all sensors nominal."
3. **Row 0.5 — Simulated ribbon** (NEW): `<SimulatedRibbon />` — only renders when sim store is active
4. **Row 1 — KPI cards** (refreshed in E1): add `anomaly` prop based on `detectAnomalies(stats, trends, allTests)` result. When sim is active, feed KPIs values computed from `simulateStats(simulateFiltered(allTests, params))` instead of backend stats. Wrap values in `InsightPulse` keyed on the current value.
5. **Row 1.5 — ParameterSliderPanel** (NEW): `<ParameterSliderPanel open={open} onOpenChange={setOpen} />` with toggle button in page header: "Simulate thresholds" + IndustrialIcon "Threshold".
6. **Rows 2–3 — existing charts** (refreshed in E4): add `overline` prop. When sim is active, recompute chart data from simulated subset.
7. **Migrate stagger animations** from CSS `animate-fade-in` to `<StaggerGroup>` + `<FadeIn>` from MotionPrimitives.

### F2. Results page (`app/results/page.tsx`)

1. **Header metadata strip** (from E10)
2. **ScopingPresets rack** (NEW): above `ScenarioFilter`. `onApply` calls `setFilters(presetFilters)` which triggers URL sync. `currentFilters` prop passes current filter state for the "save current" flow.
3. **ScenarioFilter** (refreshed in E9): no structural change
4. **TestResultsTable** (refreshed in E2): inline-row anomaly strips wire up via `isRowAnomaly(row)`
5. **TestResultsRowDetail** (refreshed in E3): ConfidenceMeter + WhyPopover + metadata strip wired up

### F3. Test Generator (`app/test-generator/page.tsx`)

- `TestCaseCardLight` (in `components/test-generator/`): replace header `ConfidenceBadge` with `<ConfidenceMeter size="sm">` using level→score map `{low: 0.5, medium: 0.75, high: 0.92}`
- Add `<WhyPopover>` trigger next to meter, pulling from backend `rationale` field. Build dataPoints from: matched axes count, template name, confidence tag.
- Add `EngineeringMetadata` footer: `gen_id · template · priority · est_duration`

### F4. Chat Panel (`components/agent-chat-panel.tsx`)

- **Header metadata strip**: add `session_id · N messages · N tools` using EngineeringMetadata
- **`ManualOverrideControl`**: insert between `ChatMessages` and `ChatInput`. Wire `onStop` to `useAgentChat().stop()`. `onInjectFilter` prefixes the next user input with `[scope: ...]`.
- **`AssistantMessageBubble`** (`components/chat/assistant-message-bubble.tsx`): replace `<ThinkingIndicator />` with `<DecisionTrace thinking={msg.thinking} toolCalls={msg.toolCalls} active={active} />`. The DecisionTrace falls back to flat list when no tool calls.
- **WhyPopover on assistant bubbles**: when the last tool call in the message has an evidence preview (parseable JSON with structured fields), render a "Why?" trigger in the bubble footer.
- **`ToolCallCard`** (refreshed in E7): engineering metadata in header

### F5. Verify data flows

Run `npm run dev` + FastAPI backend:
- Dashboard: task cards appear, KPIs show anomaly corners when breached, slider panel opens and live-updates KPIs
- Results: preset chips apply filters, row anomaly strips visible on critical fails
- Test Generator: meters + WhyPopovers render
- Chat: send a prompt, verify DecisionTrace tree appears with tool calls nested; stop mid-stream via ManualOverrideControl

**Verification**: type-check ✓, lint ✓, all tests ✓, manual click-through of all 4 pages.

---

## Phase G — Test + Polish (TODO)

### G1. Playwright E2E flows

Create `__tests__/e2e/industrial/` with:
- `dashboard-task-cards.spec.ts`: task card renders → click "Inspect failures" → verify `/results` URL has expected filters
- `results-presets.spec.ts`: click "Rainy night thermal fails" chip → table filters → save current as new preset → reload → preset persists
- `results-anomaly-rows.spec.ts`: critical rows have left-strip indicator, tooltip shows on hover
- `parameter-sim.spec.ts`: open slider panel → drag min_confidence → KPI values change → SIMULATED ribbon appears → reset → values restore
- `chat-override.spec.ts`: submit prompt → while streaming, click Stop → AlertDialog opens → confirm → stream aborts, status returns to idle
- `chat-decision-trace.spec.ts`: submit prompt → trace expands as tools run → steps visible in order → Tab + arrow key navigation works
- `chat-why-popover.spec.ts`: agent response has "Why?" button → click → popover shows data points

### G2. a11y audit via jest-axe

Extend `__tests__/a11y.test.tsx` to render each new industrial component (all states from stories) and assert zero axe violations.

### G3. Reduced-motion audit

Set `document.querySelector('html').style.setProperty('--prefers-reduced-motion', 'reduce')` OR run tests under matchMedia mock that returns `reduce`. Verify:
- `anomaly-pulse` disabled
- `confirmation-flash` disabled
- `agent-pulse` disabled
- All framer-motion surfaces (MotionPrimitives) render children directly without motion wrappers

### G4. Bundle inspection

Run `npm run build`. Check `.next/analyze` or `next build` output for bundle size. Verify:
- framer-motion tree-shakes (target: ≤ 20KB gz additional)
- Radix primitives tree-shake per-import
- No unexpected duplicate copies

### G5. Visual screenshots

Run `npm run dev` + FastAPI, capture:
- `dashboard-full.png` (updated — now with task cards + KPI anomalies)
- `results-full.png` (updated — with presets + row strips)
- `results-detail.png` (new — row-detail with meter + WhyPopover open)
- `test-generator-full.png` (updated — with meters + WhyPopovers)
- `chat-trace-expanded.png` (new — DecisionTrace expanded with tool calls)
- `parameter-sim-active.png` (new — slider panel open with SIMULATED ribbon)
- `manual-override-dialog.png` (new — AlertDialog confirming agent stop)

Save to repo root. Update `README.md` to reference new screenshots.

### G6. Final verification

- `npm run type-check` ✓
- `npm run lint` ✓
- `npm run test` ✓ (expected: ~220+ tests)
- `npm run test:e2e` ✓
- `npm run build` ✓
- `npm run storybook` — visual QA all new + refreshed stories

**Mark Phase G complete** + **Mark entire Magna Industrial AI Refactor DONE** when all green.

---

## Cross-phase references

- **Source plan**: `/Users/ramezatassi/.claude/plans/zazzy-coalescing-crayon.md`
- **Design tokens**: `nextjs-app/app/globals.css` (CSS vars), `nextjs-app/tailwind.config.ts` (Tailwind classes)
- **Icon enforcement**: `nextjs-app/components/industrial/industrial-icon.tsx` (all aliases), `nextjs-app/.eslintrc.json` (no-restricted-imports rule)
- **Motion tokens**: `nextjs-app/lib/motion-tokens.ts` (JS) mirrors CSS `--motion-*`/`--ease-*` vars
- **Verification commands**: `npm run type-check`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`, `npm run storybook`
