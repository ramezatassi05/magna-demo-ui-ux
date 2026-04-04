# The demo project that lands the Magna AI co-op

**Build an "ADAS Test Agent" — a side-by-side Streamlit prototype and Next.js production app that lets R&D engineers chat with an AI agent to query sensor test results, generate test cases, and visualize quality metrics.** This single project demonstrates every skill in the job description: Streamlit-to-Next.js refactoring, reusable UI components, agentic AI integration, testing awareness, and direct relevance to Magna's core ADAS and manufacturing AI work. No other project concept maps this precisely to what the AI & SW Technologies team actually builds day-to-day.

---

## What Magna's AI & SW Technologies team actually does

The **AI & SW Technologies team** sits within Magna Corporate R&D in Toronto, Ontario. Based on the job posting (R00233555) and a companion "Agentic AI Tester Co-op" role, this small team builds **internal R&D software tools powered by agentic AI** — think LLM-backed applications that help Magna's engineers work faster. Their workflow follows a clear pattern: **rapid Streamlit prototyping in Python → production-grade Next.js (TypeScript) apps**. The work environment includes both a standard office and a **Robotics/Cobot Lab**, confirming the tools interface with physical systems.

Magna's broader AI portfolio provides critical context for what these internal tools likely support. The company deploys AI across **five manufacturing pillars**: vision inspection for quality control, condition-based predictive maintenance, autonomous mobile robots, a Smart Sustainability energy platform, and unified factory orchestration. On the product side, Magna is deep in **ADAS sensor fusion** (camera-radar, thermal-radar, LiDAR), integrating **NVIDIA DRIVE AGX Thor** for L2+ through L4 autonomy, and building autonomous delivery vehicles enhanced by **NVIDIA Cosmos Reason VLMs**. SVP of Corporate R&D Sharath Reddy has stated that incorporating LLMs and VLMs into software tools has delivered a **20–30% efficiency improvement** in development workflows.

The internal tools this team builds almost certainly include: test result analysis dashboards, AI agents for generating test descriptions from requirements (matching a McKinsey case study of a Tier-1 supplier achieving **50% time reduction** using LangGraph agents), quality inspection interfaces, and engineering workflow assistants. The co-op's deliverables confirm this — the role explicitly requires refactoring Streamlit prototypes to Next.js, building reusable UI components, and developing an **AI-supported testing guide for frontend QA**.

---

## The recommended demo project: "ADAS Test Agent"

The single most impressive demo project is an **Agentic AI Test Management Dashboard** for ADAS sensor data — delivered as both a Streamlit prototype and a Next.js production app in the same repository. Here is exactly what to build, why each piece matters, and what it should look like.

### Core concept

An internal R&D tool where engineers interact with an AI agent to analyze ADAS sensor test results, auto-generate test cases from requirements, and visualize quality metrics across test campaigns. The project ships as two apps — a Python/Streamlit MVP and a TypeScript/Next.js production frontend — with a shared backend API, a documented component library, and a testing guide.

### Why this concept wins

Every feature maps directly to a line item in the job description:

- **Streamlit prototype → Next.js refactoring**: The dual-app structure demonstrates the exact migration workflow the team performs daily. The interviewer sees both the "before" and "after" in one repo.
- **Reusable UI/UX building blocks**: The Next.js app uses a custom component library (data tables, chart cards, chat interface, status badges) documented in Storybook — directly matching the deliverable of "identifying reusable UI/UX building blocks for consistent and scalable R&D interfaces."
- **Agentic AI integration**: The chat-with-your-data agent uses tool calling (query database, generate charts, write test cases) and shows the agent's reasoning steps — demonstrating understanding of agentic AI application patterns.
- **AI-supported testing guide**: A markdown testing guide shipped with the repo, covering how to use AI-generated test cases, visual regression testing with Playwright, and component testing with React Testing Library.
- **Domain relevance**: ADAS sensor testing is the heart of Magna's growth strategy (**$3B+ in ADAS sales** post-Veoneer acquisition), making this immediately legible to the hiring manager.

---

## Detailed feature specification

### Feature 1: AI agent chat panel

Build a persistent side panel where engineers type natural language queries like "Show me all failed thermal camera tests from last week" or "Generate test cases for the new forward collision warning requirement." The agent responds with text, dynamically generated charts, and structured data tables.

**Implementation details:**
- Use the **Vercel AI SDK** with Next.js App Router for streaming responses
- Backend: a Python FastAPI server with **LangGraph** orchestrating a ReAct agent that has tools for querying a SQLite database of mock test results, generating Recharts-compatible JSON, and producing test case markdown
- Show a **"thinking" indicator** with expandable reasoning steps (the thought-log pattern Microsoft recommends for agent UX)
- Include **confidence badges** on AI-generated test cases (High/Medium/Low) with a human approval button — demonstrating human-in-the-loop design
- The Streamlit version uses `st.chat_message` and `st.status` for the same interaction pattern

**Why it impresses:** This is the exact type of agentic AI application the team builds. Showing streaming tool execution, transparent reasoning, and human-in-the-loop controls demonstrates sophisticated understanding of enterprise agent UX — the 21 agentic design patterns (progressive disclosure, confidence visualization, agent status, mixed-initiative interface) that define state-of-the-art agent interfaces.

### Feature 2: Test results dashboard

A main dashboard view displaying ADAS sensor test campaign data with interactive charts and filterable data tables.

**What to visualize (using realistic mock data):**
- **Test pass/fail rates** by sensor type (camera, radar, thermal, LiDAR) in a stacked bar chart
- **Defect severity distribution** as a donut chart with drill-down capability
- **Time-series trend** of test failures over the last 30 days
- **Filterable data table** of individual test results with columns: Test ID, Sensor Type, Scenario (e.g., "Pedestrian crossing, rainy, night"), Result, Confidence Score, Timestamp
- **KPI cards** at the top: Total Tests, Pass Rate, Mean Detection Distance, False Positive Rate

**Implementation details:**
- Use **Recharts** or **Tremor** for charts in Next.js; **Plotly** in Streamlit
- Implement server-side filtering with Next.js Server Components for the data table
- Add a **scenario search** powered by the AI agent ("Find all night-time pedestrian detection failures")
- The Streamlit version uses `st.dataframe`, `st.metric`, and `plotly.express`

**Why it impresses:** This shows the applicant can build data-dense R&D interfaces — the bread and butter of internal tooling at a Tier-1 automotive supplier managing petabytes of sensor test data.

### Feature 3: AI-powered test case generator

A dedicated page where engineers paste a requirement (e.g., "The AEB system shall detect pedestrians at ≥50m in daylight conditions with ≤0.1% false positive rate") and the AI agent generates structured test cases.

**Output format per test case:**
- Test ID, Description, Preconditions, Steps, Expected Result, Pass Criteria, Priority, Estimated Duration
- A "Regenerate" button and inline editing capability
- Export to CSV/JSON

**Why it impresses:** This directly mirrors the McKinsey-documented use case of a Tier-1 automotive supplier using LangGraph agents for R&D test case generation — the exact same problem space Magna's team is likely tackling. It also connects to the job's deliverable of developing an "AI-supported testing guide."

### Feature 4: Reusable component library

Extract **8–12 components** from the dashboard into a standalone library documented with **Storybook**:

- `<AgentChatPanel />` — streaming chat with tool-call visualization
- `<KpiCard />` — metric display with trend indicator
- `<TestResultsTable />` — sortable, filterable data table with pagination
- `<ChartCard />` — wrapper for any chart type with title, description, and loading states
- `<ConfidenceBadge />` — High/Medium/Low with color coding
- `<StatusIndicator />` — agent thinking/idle/error states
- `<ApprovalButton />` — human-in-the-loop approve/reject control
- `<ScenarioFilter />` — multi-select filter for test scenarios

**Implementation details:**
- Build with **shadcn/ui** as the base (it's the most popular component framework for Next.js in 2025–2026)
- Use **Tailwind CSS** for styling with design tokens for Magna's brand colors
- Document each component in **Storybook** with usage examples, props table, and accessibility notes
- Include dark mode support

**Why it impresses:** The job description explicitly asks for "reusable UI/UX building blocks for consistent and scalable R&D interfaces." Delivering a Storybook-documented component library shows design systems thinking and production maturity far beyond what a typical co-op applicant demonstrates.

### Feature 5: Testing guide and test suite

Ship a `/docs/testing-guide.md` that covers:

- **Component testing** with React Testing Library (example tests included)
- **E2E testing** with Playwright (test the chat flow, dashboard filters, test case generator)
- **Visual regression testing** setup with Playwright screenshots
- **AI-assisted test generation** — a section explaining how to use the project's own AI agent to generate frontend test cases from component specifications
- **Accessibility testing** with axe-core

Include **actual test files** in the repo: at least 5 component tests and 2 E2E tests.

**Why it impresses:** One of the three core deliverables is "Develop an AI-supported testing guide for frontend quality assurance." Shipping a real testing guide with working tests shows the applicant can deliver this deliverable from day one.

---

## How to structure the repository

```
adas-test-agent/
├── streamlit-app/           # The "before" — Streamlit MVP
│   ├── app.py               # Main Streamlit app
│   ├── pages/               # Multi-page Streamlit app
│   ├── agent/               # Python agent with LangGraph
│   └── requirements.txt
├── nextjs-app/              # The "after" — Production Next.js
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable component library
│   ├── lib/                 # API clients, utilities
│   ├── __tests__/           # Component and E2E tests
│   └── .storybook/          # Storybook configuration
├── api/                     # Shared FastAPI backend
│   ├── main.py              # API routes
│   ├── agent.py             # LangGraph agent definition
│   └── mock_data.py         # Realistic ADAS test data
├── docs/
│   ├── testing-guide.md     # AI-supported testing guide
│   ├── migration-notes.md   # Streamlit → Next.js decisions
│   └── component-library.md # Component documentation
└── README.md                # Project overview + screenshots
```

The `migration-notes.md` file is a subtle but powerful touch — it documents the technical decisions made during the Streamlit-to-Next.js refactoring (state management approach, data fetching patterns, component decomposition). This shows the applicant thinks critically about migration architecture, not just code translation.

---

## Visual design direction

The UI should feel like a **premium internal engineering tool** — clean, data-dense, and professional. Reference these design principles:

- **Color palette**: Dark sidebar with light main content area. Use a blue-gray base (engineering/automotive feel) with accent colors for status: green (pass), red (fail), amber (warning), blue (info). Match Magna's brand red (#C4161C) for the logo/header accent.
- **Typography**: Inter or IBM Plex Sans — clean, highly legible at small sizes for data tables.
- **Layout**: Fixed left sidebar for navigation, top KPI bar, main content area with a collapsible right-side AI chat panel. The chat panel should slide in/out so it doesn't compete with the dashboard.
- **Data density**: Engineers value information density. Use compact table rows, small but readable chart labels, and multi-metric KPI cards rather than one-metric-per-card layouts.
- **Agent UX**: When the AI agent is "thinking," show a pulsing status indicator and a collapsible reasoning trace. When it generates a chart, render it inline in the chat. When it generates test cases, show them in a structured card format with approve/edit/reject actions.

Deploy the Next.js app to **Vercel** and the Streamlit app to **Streamlit Community Cloud** so the interviewer can click two live links and immediately compare the prototype vs. production experience.

---

## What makes this applicant a no-brainer hire

The hiring manager for this co-op role has a very specific problem: they have Streamlit prototypes that need to become production Next.js apps, they need someone who can identify reusable patterns across their tools, and they need a testing guide. Most co-op applicants will submit a resume listing "React" and "Python" as skills. This applicant walks in having **already solved the team's core problem** in a demo project.

Specifically, this demo signals five things:

1. **Zero ramp-up time on the core workflow.** The applicant has already done a Streamlit-to-Next.js migration and documented the decisions. They can start contributing in week one.

2. **Design systems maturity.** The Storybook component library shows they think in reusable patterns, not one-off implementations. This is exactly the "consistent and scalable R&D interfaces" the job description emphasizes.

3. **Agentic AI fluency.** The chat agent with tool calling, streaming, confidence indicators, and human-in-the-loop controls shows the applicant understands what the team is building — not just frontend code, but the UI layer for autonomous AI systems.

4. **Testing culture.** The testing guide with real test files shows the applicant takes quality seriously, which matters in an R&D environment where tools support engineering decisions.

5. **Domain awareness.** By grounding the demo in ADAS sensor testing rather than a generic to-do app, the applicant shows they've researched Magna's business. ADAS is Magna's **highest-growth technology segment** (bolstered by the $1.525B Veoneer acquisition and the NVIDIA DRIVE partnership), and sensor fusion testing is where the data volume and tooling challenges are most acute.

### The competitive edge over other applicants

Most co-op applicants will show generic portfolio projects — weather apps, e-commerce clones, or basic chat interfaces. This demo is differentiated because it is **specifically engineered for this exact role** at this exact company. The dual Streamlit/Next.js structure is unusual and immediately signals that the applicant read the job description carefully and built something targeted. The ADAS domain grounding shows research effort. The component library and testing guide show professional maturity. Combined, these elements make the applicant stand out as someone who doesn't just meet the requirements but has already started doing the job.

---

## Appendix: Magna's technology landscape for interview preparation

Understanding Magna's broader technology context will help the applicant speak intelligently in interviews. Key talking points:

- **Magna is the world's 4th-largest Tier-1 automotive supplier** (~$37B revenue, 156,000+ employees, 330+ factories, 100+ R&D centers in 28 countries). They describe themselves as a "mobility technology company."
- **ADAS is the growth engine.** Magna builds cameras, radar, thermal sensors, and LiDAR. Their sensor fusion work — particularly **early fusion of camera + radar** and **thermal + Doppler radar** — is industry-leading. The Veoneer Active Safety acquisition (closed 2023) added $3B+ in ADAS revenue.
- **NVIDIA is the key technology partner.** Magna is integrating NVIDIA DRIVE AGX Thor (1,000 TOPS AI compute) for L2+ through L4 autonomy, using NVIDIA Omniverse for digital twins, and deploying NVIDIA Cosmos Reason VLMs on their autonomous City Delivery platform.
- **Manufacturing AI operates at scale** across five areas: AI vision inspection for quality control, condition-based predictive maintenance, autonomous mobile robots, ML-powered energy optimization (Smart Sustainability platform), and unified factory orchestration.
- **The Corporate R&D team in Toronto** (where this co-op sits) also works with **Sanctuary AI's Phoenix humanoid robots** for manufacturing and partners with **Serve Robotics** to manufacture sidewalk delivery robots for Uber Eats.
- **The tech stack** across Magna includes Microsoft Azure, Microsoft Fabric, Power BI, Python, and in-house data pipelines. The AI & SW Technologies team specifically uses **Python, Streamlit, Next.js, TypeScript, React, and LLM/agentic AI frameworks**.
- **AI-assisted screening**: Magna's job postings disclose they use AI tools for initial resume screening through Workday. The applicant's resume should naturally include keywords: Streamlit, Next.js, TypeScript, React, Python, UI/UX, agentic AI, LLM, component library, testing, design system.