'use client';

import { cn } from '@/lib/utils';
import type { TableColumn, TableData, TestResult } from '@/lib/types';

interface InlineTableProps {
  data: TableData;
}

const RESULT_COLORS: Record<TestResult, string> = {
  pass: 'bg-status-pass/15 text-status-pass',
  fail: 'bg-status-fail/15 text-status-fail',
  warning: 'bg-status-warning/15 text-status-warning',
};

/**
 * Compact scrollable table rendered inline in a chat bubble. Sticky
 * header, status-colored result pill, column-aware formatting.
 */
export function InlineTable({ data }: InlineTableProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-white/5 bg-surface-elevated animate-fade-in">
      <div className="border-b border-white/5 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {data.title}
        </div>
      </div>
      <div className="max-h-[240px] overflow-auto dark-scroll">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-surface-elevated">
            <tr>
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-white/5 transition-colors hover:bg-white/[0.02]"
              >
                {data.columns.map((col) => (
                  <Cell key={col.key} col={col} value={row[col.key]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.truncated && (
        <div className="border-t border-white/5 px-3 py-1.5 text-center font-mono text-[10px] text-ink-muted">
          Showing {data.rows.length} of {data.total_rows}
        </div>
      )}
    </div>
  );
}

function Cell({ col, value }: { col: TableColumn; value: unknown }) {
  // Result column gets a colored pill.
  if (col.key === 'result' && isTestResult(value)) {
    return (
      <td className="px-2.5 py-1.5">
        <span
          className={cn(
            'inline-flex h-4 items-center rounded-sm px-1.5 font-mono text-[9px] font-medium uppercase',
            RESULT_COLORS[value],
          )}
        >
          {value}
        </span>
      </td>
    );
  }

  const mono =
    col.key === 'test_id' ||
    col.format === 'number' ||
    col.format === 'percent';

  return (
    <td
      className={cn(
        'px-2.5 py-1.5 text-ink-on-dark/90',
        mono && 'font-mono tabular-nums',
      )}
    >
      {formatCellValue(value, col.format)}
    </td>
  );
}

function isTestResult(v: unknown): v is TestResult {
  return v === 'pass' || v === 'fail' || v === 'warning';
}

function formatCellValue(
  value: unknown,
  format?: 'number' | 'percent' | 'date',
): string {
  if (value === null || value === undefined) return '—';
  if (format === 'percent' && typeof value === 'number') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === 'number' && typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(2);
  }
  if (format === 'date' && typeof value === 'string') {
    // Parse ISO; show date + hh:mm in 24h.
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
    }
  }
  return String(value);
}
