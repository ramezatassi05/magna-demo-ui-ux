# Migration Notes — Streamlit → Next.js

A decision log from rebuilding the ADAS Test Agent's frontend. The goal of this doc is not to argue Next.js is "better" than Streamlit — it isn't, in every dimension. It's to record the **specific tradeoffs** made on this project, so the same decisions don't have to be re-litigated on the next Streamlit-to-Next.js migration.

---

## 1. Why migrate at all?

Streamlit's sweet spot is **validating a workflow in hours, not weeks**. The Streamlit MVP for this project (three pages, one API client, four utilities) went from empty folder to working chat interface in under a day. For an R&D team that needs to answer "does this UX even make sense?" before committing engineering effort, Streamlit is unbeatable.

Streamlit breaks down when an internal tool needs to live two or more years:

1. **Styling ceiling.** Streamlit's defaults are fine for engineers; they're not fine for a dashboard that will be demoed to leadership. Customizing beyond the defaults means `st.markdown("<style>…")` hacks that fight the framework.
2. **No testability story.** There's no component layer to unit-test and no browser automation path that feels native. "Did I break the dashboard?" is answered by clicking through the app.
3. **Component reuse is awkward.** Streamlit pages are scripts, not composable components. A "KPI card" in Streamlit is `col1.metric(...)` with whatever formatting you inline; using the same metric styling on two pages means copy-paste.
4. **`session_state` is a global mutable god-object.** It grows organically, becomes the de-facto state container, and makes every page's behavior depend on every other page's history.

For Magna's AI & SW Technologies team — a Tier-1 automotive supplier's R&D group where internal tools feed into larger engineering platforms and are maintained by many engineers across multiple years — item 2 alone justifies the migration. Item 4 justifies it twice.

---

## 2. Architecture decisions

### App Router over Pages Router

Next.js 15's App Router was the default choice:

- **Co-located loading/error UI.** A route's `loading.tsx` and `error.tsx` live next to its `page.tsx`. In Pages Router, loading states were ad-hoc per component.
- **Server components by default.** Any component that doesn't need interactivity renders on the server, ships zero JS. (This project is client-heavy because of SWR + SSE streaming, but server components are there when needed.)
- **Metadata API.** `export const metadata` and `generateMetadata()` replace the Pages Router `<Head>` pattern. Per-route SEO metadata is declarative, not imperative.
- **Streaming.** Built-in support for React Suspense and streaming HTML. Our agent chat uses SSE at the API boundary; this aligns with the framework's direction.

### Python backend retained

The FastAPI + LangGraph backend did **not** migrate. Reasons:

- **Same stack Magna's AI/ML engineers use.** Rewriting the agent in TypeScript would fragment the team's expertise.
- **LangGraph's Python ecosystem is ahead.** LangChain tool calling, graph-based agents, streaming dispatch — all more mature in Python.
- **Decoupling reduces migration risk.** A frontend rewrite that doesn't touch the backend has a known blast radius.

The API (`api/main.py`) explicitly allows both frontend origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8501"],
    ...
)
```

Both apps consume identical endpoints (`/api/tests`, `/api/stats`, `/api/stats/trends`, `/api/chat`, `/api/test-cases`). The migration doesn't require any backend churn — a pattern this team can apply to their other Streamlit prototypes.

---

## 3. State management

### Before — `st.session_state` (global, imperative)

Streamlit's `session_state` is a dict that persists across script re-runs. Every page mutates it directly:

```python
# streamlit-app/pages/3_agent_chat.py
if "chat_messages" not in st.session_state:
    st.session_state.chat_messages = []

# …later, on every user prompt…
st.session_state.chat_messages.append(
    {"role": "user", "content": prompt, "attachments": []}
)
```

This works, but three problems surface as the app grows:

1. **Initialization is defensive.** Every page starts with `if key not in st.session_state` guards.
2. **Mutations are untyped.** `st.session_state.chat_messages` is a `list[dict]` — the shape is whatever the last mutation made it.
3. **No dependency tracking.** Streamlit re-runs the entire script on any widget interaction. There's no way to say "only re-render this card if `stats` changed."

### After — React state + SWR + URL state + reducer

Next.js state is split across four surfaces, each with a clear job:

| State kind | Where it lives | Example |
|---|---|---|
| Local UI state | `useState` in the component | sort direction in `TestResultsTable` |
| Server cache | SWR hooks | `useStats()`, `useTests()`, `useTrends()` |
| URL state | `useSearchParams` + custom hook | filters on `/results` (`useFiltersUrlSync`) |
| Streaming state | dedicated reducer | SSE frames in `useAgentChat` |

**Concrete win:** filters on the `/results` page are reflected in the URL. An engineer can copy the URL `…/results?sensor=radar&result=fail&page=3`, paste it in Slack, and the recipient lands on the exact same filtered view. Browser back/forward navigates through filter history. This is impossible in Streamlit without hijacking query params manually.

---

## 4. Data fetching

### Before — synchronous re-run model

Streamlit re-runs the entire page script on every interaction. A filter change on `/dashboard` means the KPI fetch, the trends fetch, AND the 500-row paginated test fetch all re-execute:

```python
# streamlit-app/pages/1_dashboard.py
try:
    with st.spinner("Loading test data..."):
        stats = get_stats()
        trends = get_trends()
        df = fetch_all_tests()  # paginates through /api/tests
except APIError as exc:
    st.error(f"{exc}")
    st.stop()
```

`@st.cache_data` helps, but caches are coarse (keyed on function args) and invalidation requires explicit `.clear()` calls.

### After — SWR per-resource + SSE reducer

Each data source has its own hook with its own cache key:

```typescript
// nextjs-app/lib/hooks/use-stats.ts (conceptual)
export function useStats() {
  return useSWR<TestStats>('/api/stats', fetcher);
}
```

Components that need stats call `useStats()` and get cached data immediately on subsequent renders. Revalidation happens on focus, on reconnect, and on manual `mutate()` calls. A filter change on `/results` only re-fetches `/api/tests` — `useStats()` and `useTrends()` don't fire.

### What was tricky — the SSE custom event schema

The FastAPI `/api/chat` endpoint emits eight distinct SSE event types:

```
thinking → tool_call → tool_result → text | chart | table | test_cases → done | error
```

The Vercel AI SDK's `useChat` hook assumes plain text streams. To handle tool calls and structured attachments, we built a custom reducer in `nextjs-app/hooks/use-agent-chat.ts` that:

1. Maintains `UiAssistantMessage` objects with slots for text, reasoning trace, tool calls, and attachments.
2. Accumulates `text` deltas by concatenation, but `tool_call` and `tool_result` events as distinct list items.
3. Renders structured attachments (charts, tables, test case cards) via switch on `attachment.type`.

The Next.js `/api/chat` route is a thin pass-through proxy that forwards the stream without re-serialization:

```typescript
// nextjs-app/app/api/chat/route.ts (conceptual)
export async function POST(req: Request) {
  const upstream = await fetch(`${API_URL}/api/chat`, { method: 'POST', body: await req.text() });
  return new Response(upstream.body, { headers: { 'content-type': 'text/event-stream' } });
}
```

This preserves framework-agnostic streaming semantics — the same backend serves Streamlit and Next.js without any per-frontend encoding.

---

## 5. Component decomposition

### Before — monolithic page scripts

`streamlit-app/pages/1_dashboard.py` is ~120 lines of top-to-bottom script: data fetch, four KPI columns (`col1.metric(...)`, `col2.metric(...)`, …), a Plotly stacked bar, a Plotly donut, a time-series line, and a 25-row dataframe. No reusable parts.

If a second page needs KPI cards with the same styling, it's copy-paste.

### After — 14+ single-responsibility components

The dashboard (`nextjs-app/app/page.tsx`) orchestrates pieces, it doesn't define them:

```
app/page.tsx (orchestrator)
├── <KpiCard />           × 6 instances
├── <ChartCard>
│     <PassFailByScenario />
├── <ChartCard>
│     <DefectSeverityDonut />
├── <ChartCard>
│     <FailuresTrendLine />
└── <RecentFailuresMini />
```

**Primitive vs. composite thinking:**

- **Primitives** (used anywhere): `KpiCard`, `ChartCard`, `ConfidenceBadge`, `StatusIndicator`, `Skeleton`, `ResultBadge`, `ApprovalButton`.
- **Composites** (own their own sub-tree): `TestResultsTable` (sorting + pagination + row-expand), `AgentChatPanel` (fourteen sub-components in `components/chat/`), `ScenarioFilter` (multi-select + date range + search).

**Benefits that compound:**

- Each component gets its own Storybook story (`nextjs-app/stories/*.stories.tsx`).
- Each primitive has a unit test in `__tests__/components/`.
- The same `KpiCard` renders on the dashboard, could render in a future email digest, could render inside the chat panel as an inline attachment — with zero duplication.

This **is** the "reusable UI/UX building blocks" deliverable the Magna job description calls out.

---

## 6. Styling

### Before — Streamlit defaults + inline Plotly colors

Streamlit's chrome (sidebar, header, padding) is uncustomizable without CSS injection. Chart colors are hand-coded at every call site:

```python
# streamlit-app/pages/1_dashboard.py
fig = px.bar(
    sensor_result, x="sensor_type", y=["pass", "fail", "warning"],
    color_discrete_map={"pass": "#10B981", "fail": "#EF4444", "warning": "#F59E0B"},
)
```

Three Plotly charts, three copies of the same color map. Changing the status-fail red from `#EF4444` to something else is a find-and-replace across every page.

### After — CSS custom properties + Tailwind semantic tokens

20 CSS variables in `app/globals.css` are the canonical source. `tailwind.config.ts` mirrors them into utility classes grouped by meaning, not appearance:

```typescript
// nextjs-app/tailwind.config.ts
colors: {
  surface: { dark, elevated, base, card },
  magna:   { red, 'red-hover' },
  status:  { pass, fail, warning, info },
  agent:   { thinking, idle, success },
  ink:     { primary, secondary, muted, 'on-dark' },
  hairline:{ DEFAULT, subtle },
}
```

A component uses `text-status-fail` or `bg-surface-dark`. The hex value is never referenced at a use site. Changing the brand red:

```diff
- magna: { red: '#C4161C', 'red-hover': '#A01218' },
+ magna: { red: '#D62828', 'red-hover': '#B0171F' },
```

One diff. Done. Every component updates on rebuild.

Typography is tokenized too: `font-mono` (JetBrains Mono) for numerics (KPI values, table columns, timestamps), `font-sans` (DM Sans) for UI. Loaded once via `next/font` in the root layout with `display: 'swap'`.

---

## 7. Testing

### Before — no story

Streamlit has no built-in testing story. "Did I break the chat page?" is answered by running `streamlit run app.py` and clicking through. `streamlit-app/components/` is an empty directory because there were no components to test.

### After — the pyramid

The Next.js app ships with:

- **5 component tests** (Vitest 2.1 + React Testing Library 16.3 + @testing-library/user-event 14.6) in `__tests__/components/`:
  - `kpi-card.test.tsx` — animation handling, trend color, inverted-trend mode
  - `confidence-badge.test.tsx` — variant rendering
  - `approval-button.test.tsx` — state transitions
  - `test-results-table.test.tsx` — sort + filter behavior
  - `agent-chat-panel.test.tsx` — message submission
- **2 E2E specs** (Playwright 1.59) in `__tests__/e2e/`:
  - `dashboard.spec.ts` — dashboard loads, charts render
  - `chat-flow.spec.ts` — mocked SSE stream, message flow
- **Accessibility testing** via jest-axe 9.0 integrated into the Vitest suite.
- **Storybook 9.1** for visual isolation of every component.

`npm test` runs the full component suite in ~4 seconds. `npm run test:e2e` spins up Playwright with a webServer auto-start. Both run in CI.

Full walkthrough: [`docs/testing-guide.md`](./testing-guide.md). This is one of the three core co-op deliverables, and it's shipped.

---

## 8. Performance

### Before — whole-script re-runs

Every widget interaction in Streamlit re-executes the entire page script from top to bottom. Move a `st.slider`, the whole page re-runs. `@st.cache_data` helps when fetch functions are slow, but React-style fine-grained re-rendering isn't possible.

### After — targeted re-renders

React reconciles only changed subtrees. SWR de-dupes concurrent requests to the same key. On `/results`:

- Change the "sensor" filter → only `<TestResultsTable />` re-renders. The sidebar, KPI header, chat panel, filter chrome are untouched.
- Change the page number → the table re-renders with the new data, but `useStats()` doesn't refire because its cache key didn't change.

**SSE streaming renders tokens as they arrive.** The chat panel shows text progressively, not as a single blocking "response" payload. Tool call cards appear in real-time as the agent executes them. This is impossible in Streamlit's synchronous re-run model without hacky `st.empty()` placeholders (which the prototype uses — see `streamlit-app/pages/3_agent_chat.py:117`).

---

## 9. What was gained

| Dimension | Gain |
|---|---|
| **Reusability** | 14+ components, each with its own Storybook story; same `KpiCard` usable anywhere |
| **Testability** | 5 component tests + 2 E2E + a11y; `npm test` ≈ 4s |
| **Accessibility** | Focus management, aria-* attributes, keyboard nav, jest-axe in CI |
| **Performance** | Targeted re-renders, SWR cache, SSE streaming render |
| **Design consistency** | 20 CSS tokens + 7 Tailwind color groups; change-the-brand-red is a one-line diff |
| **Developer experience** | TypeScript strict mode, Storybook hot reload, URL-synced filters |

---

## 10. What was challenging

- **TypeScript learning curve.** If the team is coming from untyped Python, there's a ramp. Strict mode + `any`-free codebase + Pydantic-mirrored types in `lib/types.ts` is worth it, but it's not free.
- **Initial setup overhead.** Next.js config, Tailwind, shadcn/ui primitives, Vitest, Playwright, Storybook, jest-axe — seven tools to configure before writing a single component. Streamlit gives all of this for free (no Storybook equivalent, but there's no component model to document).
- **Losing Streamlit's rapid-prototyping speed.** "Change one line, see it in the browser" is Streamlit's superpower. Next.js Turbopack HMR closes most of the gap, but component libraries and type errors sometimes require a rebuild.
- **SSE custom event schema.** The Vercel AI SDK's `useChat` hook assumes text-only streams. Our tool-call-rich protocol required a hand-rolled reducer. Not hard, but not a library one-liner either.

---

## Should the next prototype skip Streamlit entirely?

No. The Streamlit prototype validated the UX (three pages, chat + dashboard + generator) in under a day. That validation shaped every Next.js component decision — and it's a cheap investment compared to the cost of six weeks of Next.js work in the wrong direction.

The pattern worth repeating: **Streamlit for validation, Next.js for production.** Treat the Streamlit prototype as a throwaway, not a foundation. Throw it away, keep the lessons.
