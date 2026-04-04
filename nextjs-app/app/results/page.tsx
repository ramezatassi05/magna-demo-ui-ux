import { Table2 } from 'lucide-react';

export default function ResultsPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          Data
        </div>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
          Test Results
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          Browse, filter, and inspect individual ADAS sensor test records
          across cameras, radar, thermal, and LiDAR runs.
        </p>
      </header>

      <div className="rounded-card border border-hairline bg-surface-card p-12 shadow-card">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hairline-subtle">
            <Table2 className="h-5 w-5 text-ink-secondary" strokeWidth={2} />
          </div>
          <div className="font-mono text-sm font-semibold text-ink-primary">
            Filterable test results table
          </div>
          <div className="mt-1 max-w-md text-xs text-ink-secondary">
            Coming in Phase 5 — sortable columns, sensor/feature/date filters,
            expandable row detail, pagination.
          </div>
        </div>
      </div>
    </div>
  );
}
