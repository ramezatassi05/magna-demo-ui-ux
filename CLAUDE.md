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
A premium, data-dense internal tool aesthetic. Think Bloomberg Terminal meets Linear meets Vercel Dashboard — clean but information-rich, dark-mode-forward, with surgical precision in typography and spacing. Feel free to use available frontend design skills and mcps. 

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

## Follow-up: Magna Industrial AI Refactor

A second build pass (Phases A–G) transforms the base app into Magna's industrial R&D tool aesthetic — confidence meters, anomaly alerts, scoping presets, parameter sliders, decision traces, manual overrides.

**Full spec + phase-by-phase instructions**: [`docs/magna-industrial-refactor.md`](docs/magna-industrial-refactor.md)

**Current status**: Phases A–D complete. Phase E (visual refresh) is next.
