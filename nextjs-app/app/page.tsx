import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          Overview
        </div>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          Aggregate ADAS test metrics, sensor-level pass rates, and detection
          trends over the last 90 days.
        </p>
      </header>

      <div className="rounded-card border border-hairline bg-surface-card p-12 shadow-card">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hairline-subtle">
            <LayoutDashboard className="h-5 w-5 text-ink-secondary" strokeWidth={2} />
          </div>
          <div className="font-mono text-sm font-semibold text-ink-primary">
            KPI cards · charts · trends
          </div>
          <div className="mt-1 max-w-md text-xs text-ink-secondary">
            Coming in Phase 5 — dashboard widgets fetching live data from the
            FastAPI backend.
          </div>
        </div>
      </div>
    </div>
  );
}
