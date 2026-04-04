'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { TestRecord } from '@/lib/types';
import { formatDateShort, formatDistance } from '@/lib/format';
import { Button } from './ui/button';
import { ResultBadge } from './result-badge';
import { ConfidenceBadge } from './confidence-badge';
import { Skeleton } from './skeleton';

type SortableKey =
  | 'test_id'
  | 'sensor_type'
  | 'feature'
  | 'result'
  | 'confidence_score'
  | 'detection_distance_m'
  | 'timestamp';

interface TestResultsTableProps {
  rows: TestRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sortKey?: SortableKey;
  sortDir?: 'asc' | 'desc';
  onSort: (key: SortableKey) => void;
  onPageChange: (page: number) => void;
  onRowClick: (id: string) => void;
  expandedRowId?: string | null;
  renderExpanded?: (row: TestRecord) => ReactNode;
  onClearFilters?: () => void;
}

interface Column {
  key: SortableKey | 'scenario';
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  mono?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'test_id', label: 'Test ID', sortable: true, mono: true, width: 'w-[130px]' },
  { key: 'sensor_type', label: 'Sensor', sortable: true, width: 'w-[90px]' },
  { key: 'feature', label: 'Feature', sortable: true, mono: true, width: 'w-[80px]' },
  { key: 'scenario', label: 'Scenario', sortable: false },
  { key: 'result', label: 'Result', sortable: true, align: 'center', width: 'w-[90px]' },
  { key: 'confidence_score', label: 'Confidence', sortable: true, align: 'center', width: 'w-[120px]' },
  { key: 'detection_distance_m', label: 'Distance', sortable: true, align: 'right', mono: true, width: 'w-[95px]' },
  { key: 'timestamp', label: 'Date', sortable: true, align: 'right', mono: true, width: 'w-[80px]' },
];

const COLUMN_COUNT = COLUMNS.length;

export function TestResultsTable({
  rows,
  loading = false,
  page,
  pageSize,
  total,
  totalPages,
  sortKey,
  sortDir,
  onSort,
  onPageChange,
  onRowClick,
  expandedRowId,
  renderExpanded,
  onClearFilters,
}: TestResultsTableProps) {
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface-card shadow-card">
      <div className="max-h-[calc(100vh-280px)] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-surface-card">
            <tr className="border-b border-hairline">
              {COLUMNS.map((col) => {
                const isActive = col.sortable && sortKey === col.key;
                const SortIcon = !col.sortable
                  ? null
                  : isActive
                    ? sortDir === 'asc'
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'h-10 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-secondary',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.align !== 'right' && col.align !== 'center' && 'text-left',
                      col.width,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key as SortableKey)}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-ink-primary transition-colors',
                          col.align === 'right' && 'flex-row-reverse',
                          isActive && 'text-ink-primary',
                        )}
                      >
                        {col.label}
                        {SortIcon && (
                          <SortIcon
                            className={cn(
                              'h-3 w-3',
                              isActive ? 'text-magna-red' : 'text-ink-muted',
                            )}
                            aria-hidden
                          />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-hairline-subtle">
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="h-10 px-3">
                        <Skeleton className="h-3 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="h-[200px] text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Inbox className="h-6 w-6 text-ink-muted" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-ink-primary">
                        No validation runs match these filters
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-secondary">
                        Try broadening the sensor, result, or date range.
                      </p>
                    </div>
                    {onClearFilters && (
                      <Button variant="secondary" size="sm" onClick={onClearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => {
                const isExpanded = expandedRowId === row.test_id;
                return (
                  <FragmentRow
                    key={row.test_id}
                    row={row}
                    isExpanded={isExpanded}
                    onRowClick={onRowClick}
                    renderExpanded={renderExpanded}
                  />
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5 text-xs">
        <span className="text-ink-secondary">
          {total === 0 ? (
            '0 results'
          ) : (
            <>
              Showing{' '}
              <span className="font-mono font-medium text-ink-primary">
                {showingFrom.toLocaleString()}–{showingTo.toLocaleString()}
              </span>{' '}
              of{' '}
              <span className="font-mono font-medium text-ink-primary">
                {total.toLocaleString()}
              </span>
            </>
          )}
          <span className="ml-2 text-ink-muted">· Sort applies to current page</span>
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            Prev
          </Button>
          <span className="font-mono text-ink-secondary tabular-nums">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

interface FragmentRowProps {
  row: TestRecord;
  isExpanded: boolean;
  onRowClick: (id: string) => void;
  renderExpanded?: (row: TestRecord) => ReactNode;
}

function FragmentRow({ row, isExpanded, onRowClick, renderExpanded }: FragmentRowProps) {
  const handleKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row.test_id);
    }
  };

  return (
    <>
      <tr
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        onClick={() => onRowClick(row.test_id)}
        onKeyDown={handleKey}
        className={cn(
          'h-10 cursor-pointer border-b border-hairline-subtle transition-colors duration-150',
          'hover:bg-hairline-subtle focus-visible:outline-none focus-visible:bg-hairline-subtle',
          isExpanded
            ? 'bg-magna-red/5'
            : 'odd:bg-surface-card even:bg-[#F9FAFB]',
        )}
      >
        <td className="px-3 font-mono text-[12px] text-ink-primary">{row.test_id}</td>
        <td className="px-3 text-ink-primary capitalize">{row.sensor_type}</td>
        <td className="px-3 font-mono text-[12px] text-ink-primary">{row.feature}</td>
        <td className="px-3 text-ink-primary truncate max-w-0" title={row.scenario}>
          {row.scenario}
        </td>
        <td className="px-3 text-center">
          <ResultBadge result={row.result} size="sm" />
        </td>
        <td className="px-3 text-center">
          <ConfidenceBadge score={row.confidence_score} size="sm" />
        </td>
        <td className="px-3 text-right font-mono text-[12px] text-ink-primary tabular-nums">
          {formatDistance(row.detection_distance_m)}
        </td>
        <td className="px-3 text-right font-mono text-[12px] text-ink-secondary tabular-nums">
          {formatDateShort(row.timestamp)}
        </td>
      </tr>
      {renderExpanded && (
        <tr className="border-b border-hairline-subtle">
          <td colSpan={COLUMN_COUNT} className="p-0">
            <div className="expand-row-wrapper" data-open={isExpanded}>
              <div>{renderExpanded(row)}</div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
