'use client';

import { Suspense, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ScenarioFilter } from '@/components/scenario-filter';
import { TestResultsTable } from '@/components/test-results-table';
import { TestResultsRowDetail } from '@/components/test-results-row-detail';
import { useFiltersUrlSync } from '@/lib/hooks/use-filters-url-sync';
import { useTests } from '@/lib/hooks/use-tests';
import type { TestRecord } from '@/lib/types';

type SortableKey =
  | 'test_id'
  | 'sensor_type'
  | 'feature'
  | 'result'
  | 'confidence_score'
  | 'detection_distance_m'
  | 'timestamp';

function ResultsPageInner() {
  const { filters, updateFilters, resetFilters, activeCount } = useFiltersUrlSync();
  const { data, error, isLoading, refetch } = useTests(filters);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortableKey>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedRows = useMemo<TestRecord[]>(() => {
    if (!data?.items) return [];
    const out = [...data.items];
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null || bv == null) return 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [data, sortKey, sortDir]);

  const handleSort = (key: SortableKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleRowClick = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  const handlePageChange = (page: number) => {
    setExpandedId(null);
    updateFilters({ page });
  };

  return (
    <div className="space-y-4">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          Data
        </div>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
          Test Results
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-secondary">
          {data ? (
            <>
              <span className="font-mono font-medium text-ink-primary">
                {data.total.toLocaleString()}
              </span>{' '}
              sensor validation records — filter, sort, and expand any row for
              full run metadata.
            </>
          ) : (
            'Loading validation records…'
          )}
        </p>
      </header>

      <ScenarioFilter
        filters={filters}
        onChange={updateFilters}
        onClear={resetFilters}
        activeCount={activeCount}
      />

      {error && (
        <div className="flex items-start gap-3 rounded-card border border-status-fail/20 bg-status-fail/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-fail" aria-hidden />
          <div className="flex-1 text-xs">
            <p className="font-medium text-ink-primary">Failed to load validation records</p>
            <p className="mt-0.5 text-ink-secondary">{error.message}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-medium text-magna-red hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      <TestResultsTable
        rows={sortedRows}
        loading={isLoading}
        page={filters.page ?? 1}
        pageSize={filters.page_size ?? 25}
        total={data?.total ?? 0}
        totalPages={data?.total_pages ?? 1}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onRowClick={handleRowClick}
        expandedRowId={expandedId}
        renderExpanded={(row) => <TestResultsRowDetail row={row} />}
        onClearFilters={activeCount > 0 ? resetFilters : undefined}
      />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-ink-secondary">Loading filters…</div>
      }
    >
      <ResultsPageInner />
    </Suspense>
  );
}
