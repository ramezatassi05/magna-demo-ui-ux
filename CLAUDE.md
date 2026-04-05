# CLAUDE.md — ADAS Test Agent Build Guide

## Project Overview

Build **"ADAS Test Agent"** — a dual Streamlit/Next.js internal R&D tool for Magna International's AI & SW Technologies team. This is a portfolio demo for the **Agentic AI Application UI/UX Co-op** position. The tool lets automotive engineers chat with an AI agent to query ADAS sensor test results, auto-generate test cases, and visualize quality metrics.

**The deliverable is two apps in one repo:**
1. A **Streamlit MVP** (the "before" — quick prototype)
2. A **Next.js 14+ production app** (the "after" — polished, production-grade)

Both share a Python FastAPI backend with a LangGraph-powered AI agent.

---

## Architecture

```
adas-test-agent/
├── streamlit-app/              # Streamlit MVP prototype
│   ├── app.py                  # Main entry — multi-page app
│   ├── pages/
│   │   ├── 1_dashboard.py      # Test results dashboard
│   │   ├── 2_test_generator.py # AI test case generator
│   │   └── 3_agent_chat.py     # Chat with AI agent
│   ├── components/             # Reusable Streamlit components
│   ├── utils/                  # Shared helpers
│   └── requirements.txt
│
├── api/                        # Shared FastAPI backend
│   ├── main.py                 # FastAPI app with CORS
│   ├── agent.py                # LangGraph ReAct agent
│   ├── tools.py                # Agent tools (query DB, generate charts, write test cases)
│   ├── mock_data.py            # Realistic ADAS test data generator
│   ├── database.py             # SQLite setup + seed
│   └── requirements.txt
│
├── nextjs-app/                 # Production Next.js app
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # Root layout with sidebar
│   │   ├── page.tsx            # Dashboard (home)
│   │   ├── test-generator/
│   │   │   └── page.tsx        # AI test case generator page
│   │   ├── results/
│   │   │   └── page.tsx        # Detailed test results table
│   │   └── api/
│   │       └── chat/
│   │           └── route.ts    # Proxy to FastAPI agent
│   ├── components/             # Reusable component library
│   │   ├── ui/                 # Base components (shadcn/ui)
│   │   ├── agent-chat-panel.tsx
│   │   ├── kpi-card.tsx
│   │   ├── test-results-table.tsx
│   │   ├── chart-card.tsx
│   │   ├── confidence-badge.tsx
│   │   ├── status-indicator.tsx
│   │   ├── approval-button.tsx
│   │   ├── scenario-filter.tsx
│   │   └── sidebar-nav.tsx
│   ├── lib/
│   │   ├── api.ts              # API client for FastAPI
│   │   ├── types.ts            # TypeScript types
│   │   └── utils.ts            # Helpers
│   ├── __tests__/              # Tests
│   │   ├── components/         # Component tests (React Testing Library)
│   │   └── e2e/                # E2E tests (Playwright)
│   ├── .storybook/             # Storybook config
│   ├── stories/                # Component stories
│   ├── tailwind.config.ts
│   ├── next.config.mjs
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── testing-guide.md        # AI-supported testing guide
│   ├── migration-notes.md      # Streamlit → Next.js decisions
│   └── component-library.md    # Component documentation
│
└── README.md                   # Project overview with screenshots
```

---

## Tech Stack

### Streamlit App
- Python 3.11+
- Streamlit 1.x
- Plotly Express for charts
- Pandas for data manipulation

### Next.js App
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui as component base
- Recharts for data visualization
- Vercel AI SDK (`ai` package) for streaming chat
- React Testing Library + Vitest for component tests
- Playwright for E2E tests
- Storybook 8 for component documentation

### API Backend
- Python 3.11+
- FastAPI with uvicorn
- LangGraph for agent orchestration
- LangChain for LLM tool calling
- SQLite for test data storage
- Pydantic for data validation

---

## Design System

### Visual Direction: "Precision Engineering Dashboard"
A premium, data-dense internal tool aesthetic. Think Bloomberg Terminal meets Linear meets Vercel Dashboard — clean but information-rich, dark-mode-forward, with surgical precision in typography and spacing.

### Color Tokens (CSS Variables)
```css
:root {
  /* Base — dark sidebar, light content */
  --bg-primary: #0F1117;        /* Sidebar / dark surfaces */
  --bg-secondary: #1A1D27;      /* Cards on dark bg */
  --bg-content: #F8F9FB;        /* Main content area */
  --bg-card: #FFFFFF;            /* Cards on light bg */

  /* Magna brand accent */
  --magna-red: #C4161C;
  --magna-red-hover: #A01218;

  /* Status colors */
  --status-pass: #10B981;       /* Emerald green */
  --status-fail: #EF4444;       /* Red */
  --status-warning: #F59E0B;    /* Amber */
  --status-info: #3B82F6;       /* Blue */

  /* Agent states */
  --agent-thinking: #8B5CF6;    /* Purple pulse */
  --agent-idle: #6B7280;        /* Gray */
  --agent-success: #10B981;

  /* Text */
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;
  --text-on-dark: #F3F4F6;

  /* Borders */
  --border-default: #E5E7EB;
  --border-subtle: #F3F4F6;
}
```

### Typography
- **Display/Headings**: `"JetBrains Mono"` or `"Space Mono"` — monospaced for engineering feel
- **Body/UI**: `"DM Sans"` — clean, modern, highly legible at small sizes
- **Data/Tables**: `"JetBrains Mono"` at 13px — monospaced for aligned numbers
- Import via Google Fonts

### Layout Rules
- Fixed left sidebar: 260px wide, dark (`--bg-primary`)
- Top KPI bar: 80px height, spans full content width
- Main content: padding 24px, max-width 1440px
- Right chat panel: 400px wide, slides in from right, overlays content
- Card border-radius: 12px
- Card shadow: `0 1px 3px rgba(0,0,0,0.06)`
- Spacing unit: 4px base (use multiples: 8, 12, 16, 24, 32, 48)

### Component Design Specs

**KPI Card**: 
- Height: 100px
- Contains: label (12px, muted), value (28px, bold, mono), trend arrow + percentage
- Subtle left border accent (4px) using status color
- Hover: slight lift shadow

**Chart Card**:
- White card with 16px padding
- Title (16px, semibold) + description (13px, muted) header
- Chart fills remaining space
- Loading skeleton state

**Test Results Table**:
- Compact rows (40px height)
- Alternating row backgrounds (white / #F9FAFB)
- Status badge in Result column (pill shape, status color)
- Sortable column headers with arrow indicators
- Sticky header on scroll
- Pagination at bottom

**Agent Chat Panel**:
- Dark theme panel (#0F1117 background) — contrasts with light main content
- Fixed to right side, 400px wide
- Input at bottom with send button
- Messages: user (right-aligned, blue bg), agent (left-aligned, dark card bg)
- "Thinking" state: purple pulsing dot + collapsible reasoning trace
- Tool execution: shows tool name + params in a subtle code block
- Inline charts: rendered directly in chat bubbles
- Inline data: mini table in chat

**Confidence Badge**:
- Pill shape, 3 variants: High (green bg/text), Medium (amber), Low (red)
- Small icon before text (checkmark, warning, x)

**Approval Button**:
- Two-button group: Approve (green outline) / Reject (red outline)
- Click triggers state change with subtle animation
- Shows "Approved" or "Rejected" chip after action

**Sidebar Navigation**:
- Logo area at top (Magna-style, use text "ADAS Test Agent" with red accent)
- Nav items: icon + label, 44px height
- Active state: left red border + slightly lighter bg
- Sections: "Overview", "Test Results", "Test Generator"
- Bottom: collapsible agent chat toggle button

---

## Mock Data Specification

Generate realistic ADAS sensor test data. Seed the SQLite database with 500+ test records.

### Test Record Schema
```python
{
    "test_id": "TC-2026-00142",
    "sensor_type": "camera" | "radar" | "thermal" | "lidar",
    "scenario": "Pedestrian crossing, rainy, night",
    "scenario_tags": ["pedestrian", "rain", "night", "urban"],
    "feature": "AEB" | "FCW" | "LCA" | "BSD" | "ACC" | "TSR",
    "result": "pass" | "fail" | "warning",
    "confidence_score": 0.0-1.0,
    "detection_distance_m": 10.0-150.0,
    "false_positive_rate": 0.0-0.05,
    "execution_time_ms": 50-5000,
    "timestamp": "2026-01-15T14:30:00Z",
    "vehicle_model": "SUV-X1" | "Sedan-M3" | "Truck-T7",
    "firmware_version": "v4.2.1",
    "notes": "Missed detection at 45m in heavy rain"
}
```

### Feature Abbreviations
- AEB: Autonomous Emergency Braking
- FCW: Forward Collision Warning
- LCA: Lane Change Assist
- BSD: Blind Spot Detection
- ACC: Adaptive Cruise Control
- TSR: Traffic Sign Recognition

### Data Distribution
- ~78% pass, ~15% fail, ~7% warning
- Camera tests: highest volume (~40%)
- Radar: ~25%, Thermal: ~20%, LiDAR: ~15%
- Failure rates higher for: night scenarios, rain, thermal sensors at long range
- Timestamps spanning last 90 days
- Generate realistic scenario descriptions combining: weather (clear, rain, snow, fog), time (day, dusk, night), subject (pedestrian, vehicle, cyclist, animal), environment (urban, highway, intersection, parking)

---

## Build Phases

### Phase 1: Foundation (API + Database + Mock Data)
1. Set up the `api/` directory with FastAPI
2. Create `mock_data.py` — generate 500+ realistic test records
3. Create `database.py` — SQLite schema + seed function
4. Build basic API endpoints:
   - `GET /api/tests` — list tests with filters (sensor_type, result, date range, feature)
   - `GET /api/tests/{test_id}` — single test detail
   - `GET /api/stats` — aggregate stats (pass rate, counts by sensor, trend data)
   - `GET /api/stats/trends` — daily pass/fail counts for time series
5. Test all endpoints work

### Phase 2: LangGraph Agent
1. Create the ReAct agent in `agent.py` using LangGraph
2. Define tools in `tools.py`:
   - `query_tests` — SQL query builder from natural language (filters, aggregations)
   - `generate_chart_data` — returns Recharts-compatible JSON for a requested visualization
   - `generate_test_cases` — takes a requirement string, returns structured test cases
   - `summarize_results` — statistical summary of a filtered result set
3. Add streaming endpoint: `POST /api/chat` — accepts messages array, streams agent responses with tool call visibility
4. Handle tool call results as structured JSON that the frontend can render (charts, tables, test cases)

### Phase 3: Streamlit MVP
1. Build `app.py` as multi-page Streamlit app
2. **Dashboard page**: KPI metrics (`st.metric`), Plotly charts (bar, donut, time series), data table (`st.dataframe`)
3. **Test Generator page**: text area for requirement input, button to generate, display results as expandable cards
4. **Agent Chat page**: `st.chat_message` interface, `st.status` for thinking states, inline chart rendering with `st.plotly_chart`
5. Keep it functional but intentionally "prototype-looking" — default Streamlit styling, minimal custom CSS. This is the "before" that makes the Next.js version shine.

### Phase 4: Next.js App — Layout & Navigation
1. Initialize Next.js 14 with App Router, TypeScript, Tailwind
2. Install shadcn/ui, Recharts, Vercel AI SDK
3. Build root layout with:
   - Fixed dark sidebar (260px) with navigation
   - Main content area
   - Collapsible right chat panel (400px)
4. Build `sidebar-nav.tsx` component
5. Build `agent-chat-panel.tsx` shell (functional chat comes in Phase 6)
6. Set up design tokens in `tailwind.config.ts` and `globals.css`
7. Import fonts (JetBrains Mono, DM Sans)

### Phase 5: Next.js Dashboard & Results Pages
1. **Dashboard page** (`app/page.tsx`):
   - Top row: 4 KPI cards (Total Tests, Pass Rate, Mean Detection Distance, False Positive Rate)
   - Row 2: Stacked bar chart (pass/fail/warning by sensor type) + Donut chart (defect severity)
   - Row 3: Time series line chart (failures over 30 days) + Scenario breakdown table
   - All data fetched from FastAPI via server components or SWR
2. **Results page** (`app/results/page.tsx`):
   - Full-page filterable data table
   - Filter bar: sensor type, result, feature, date range, search
   - Sortable columns, pagination
   - Click row to expand detail panel
3. Build all reusable components during this phase:
   - `kpi-card.tsx`, `chart-card.tsx`, `test-results-table.tsx`, `scenario-filter.tsx`, `confidence-badge.tsx`, `status-indicator.tsx`

### Phase 6: Next.js Agent Chat
1. Build the streaming chat interface in `agent-chat-panel.tsx`
2. Use Vercel AI SDK `useChat` hook connected to `/api/chat` route
3. The `/api/chat` Next.js route proxies to the FastAPI agent endpoint
4. Implement:
   - Streaming text responses
   - Tool call visualization (show tool name, params, result in collapsible blocks)
   - Inline chart rendering (when agent returns chart data, render a Recharts chart in the chat)
   - Inline data table (when agent returns test data, render a mini table)
   - "Thinking" state with purple pulsing indicator
   - Expandable reasoning trace
5. The chat panel should be accessible from any page (it's in the root layout)

### Phase 7: Next.js Test Generator Page
1. Build `app/test-generator/page.tsx`
2. Left side: textarea for requirement input + "Generate" button
3. Right side: generated test cases displayed as cards
4. Each test case card shows: ID, description, preconditions, steps, expected result, pass criteria, priority
5. Each card has: `ConfidenceBadge`, `ApprovalButton` (approve/reject), inline edit capability
6. "Regenerate" button, "Export CSV" and "Export JSON" buttons
7. Loading state: skeleton cards with shimmer animation

### Phase 8: Storybook + Component Documentation
1. Set up Storybook 8 in `nextjs-app/`
2. Write stories for all 8+ components:
   - Each story shows: default state, variants/props, interactive controls
   - Include accessibility annotations
3. Write `docs/component-library.md` documenting the design system

### Phase 9: Testing Suite + Guide
1. Write **5+ component tests** with React Testing Library + Vitest:
   - KpiCard renders value and trend correctly
   - ConfidenceBadge shows correct color for each level
   - TestResultsTable sorts and filters
   - ApprovalButton state transitions
   - AgentChatPanel sends messages
2. Write **2+ E2E tests** with Playwright:
   - Dashboard loads with data and charts render
   - Chat flow: send message → see thinking state → receive response
3. Write `docs/testing-guide.md`:
   - Section 1: Component testing approach with React Testing Library
   - Section 2: E2E testing with Playwright
   - Section 3: Visual regression testing setup
   - Section 4: AI-assisted test generation (how to use the agent to generate test cases for frontend components)
   - Section 5: Accessibility testing with axe-core

### Phase 10: Documentation + Polish
1. Write `docs/migration-notes.md`:
   - Why Next.js App Router over Pages Router
   - State management: Streamlit session_state vs React state + SWR
   - Component decomposition decisions
   - Data fetching: Streamlit's synchronous model vs Next.js server components
   - Styling: Streamlit's default CSS vs Tailwind design system
   - What was gained in the migration (performance, reusability, testability, accessibility)
2. Write `README.md`:
   - Project overview with purpose statement
   - Screenshots of both apps side-by-side
   - Architecture diagram
   - Setup instructions (local dev)
   - Links to live demos
   - Links to Storybook
   - Tech stack summary
3. Final polish pass:
   - Responsive behavior (tablet + desktop, not mobile — this is an internal tool)
   - Loading states and skeletons everywhere
   - Error states with helpful messages
   - Smooth transitions and micro-interactions
   - Consistent spacing and alignment audit

---

## Critical Quality Standards

### UI/UX Non-Negotiables
- **No empty states without messaging.** Every component that loads data must have: loading skeleton, empty state with illustration/message, error state with retry button.
- **No layout shift.** Charts and tables must have fixed dimensions or proper skeletons.
- **Consistent spacing.** Use the 4px grid religiously. No magic numbers.
- **Color contrast.** All text meets WCAG AA (4.5:1 for body text, 3:1 for large text).
- **Keyboard navigation.** All interactive elements are focusable and operable with keyboard.

### Code Non-Negotiables
- **TypeScript strict mode.** No `any` types except in genuinely dynamic contexts.
- **All components are typed.** Props interfaces exported alongside components.
- **No inline styles in Next.js.** Tailwind classes only.
- **API responses are typed** with Pydantic (Python) and Zod or TypeScript interfaces (Next.js).
- **Error handling everywhere.** Try/catch on all API calls, user-facing error messages.

### Agent UX Non-Negotiables
- **Never show raw JSON to the user.** Agent responses are always rendered as formatted text, charts, or structured cards.
- **Always show agent state.** The user must know if the agent is thinking, executing a tool, or idle.
- **Tool calls are transparent.** Users can expand to see what tool was called and what data was returned.
- **Human-in-the-loop on generated test cases.** Every AI-generated test case has approve/edit/reject controls.

---

## LLM Integration Notes

### For the FastAPI Agent
- Use **OpenAI-compatible API** (the user will provide their own API key via environment variable `OPENAI_API_KEY`)
- Default model: `gpt-4o-mini` (fast, cheap for demo purposes)
- If no API key is available, implement a **mock agent mode** that returns pre-scripted responses for common queries. This ensures the demo works without an API key.
- The mock agent should handle: "show me failed tests", "generate test cases for AEB", "what's the pass rate for radar", and a few other canned queries with realistic responses including chart data.

### For Streaming in Next.js
- Use Vercel AI SDK's `useChat` hook
- The `/api/chat/route.ts` proxies to FastAPI's `/api/chat` endpoint
- Stream format: Server-Sent Events (SSE)
- Include tool call events in the stream so the frontend can render them progressively

---

## Environment Variables

```env
# API
OPENAI_API_KEY=sk-...          # Optional — mock mode if absent
DATABASE_URL=sqlite:///./test_data.db

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## What "Done" Looks Like

The project is complete when:
1. ✅ `api/` starts with `uvicorn main:app` and serves all endpoints
2. ✅ `streamlit-app/` runs with `streamlit run app.py` showing dashboard, generator, and chat
3. ✅ `nextjs-app/` runs with `npm run dev` showing polished dashboard, results, generator, and chat
4. ✅ The AI agent responds to natural language queries (mock mode or real LLM)
5. ✅ Storybook runs with `npm run storybook` showing all components
6. ✅ Tests pass: `npm test` (component tests) and `npx playwright test` (E2E)
7. ✅ All three docs exist: testing-guide.md, migration-notes.md, component-library.md
8. ✅ README.md has setup instructions and screenshots
9. ✅ The Next.js app looks dramatically better than the Streamlit app — the contrast should be obvious and impressive

---
---

# ENHANCEMENT: Magna Industrial AI Refactor

> This is a second build pass applied **after** the base Next.js app (Phases 1–10
> above) was completed. Goal: transform the "vibe-coded modern dashboard" aesthetic
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
- ⬜ **Phase E — Visual refresh of existing components** — TODO
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
