'use client';

import { Clock, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Feature, TestCasesData } from '@/lib/types';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  requirement: string;
  feature: Feature;
  count: number;
  batch: TestCasesData;
}

interface GenerationHistoryProps {
  entries: HistoryEntry[];
  activeId: string | null;
  onSelect: (entry: HistoryEntry) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
}

/** Session-scoped list of previously generated batches. No persistence. */
export function GenerationHistory({
  entries,
  activeId,
  onSelect,
}: GenerationHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-card border border-hairline bg-surface-card shadow-card">
      <header className="flex items-center gap-2 border-b border-hairline-subtle px-4 py-3">
        <Clock className="h-3.5 w-3.5 text-ink-muted" strokeWidth={2} aria-hidden />
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          Session History
        </h2>
        <span className="ml-auto font-mono text-[10px] text-ink-muted">
          {entries.length} {entries.length === 1 ? 'batch' : 'batches'}
        </span>
      </header>
      <ul className="divide-y divide-hairline-subtle">
        {entries.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                  'hover:bg-surface-base',
                  'focus-visible:outline-none focus-visible:bg-surface-base',
                  isActive && 'bg-magna-red/5',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-5 shrink-0 items-center rounded-sm bg-magna-red/10 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-magna-red',
                  )}
                >
                  {entry.feature}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-ink-primary">
                    {entry.requirement}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 font-mono text-[10px] text-ink-muted">
                    <span>{entry.count} cases</span>
                    <span>·</span>
                    <span>{formatRelativeTime(entry.timestamp)}</span>
                  </div>
                </div>
                {isActive ? (
                  <span className="font-mono text-[9px] uppercase tracking-wide text-magna-red">
                    active
                  </span>
                ) : (
                  <RotateCcw
                    className="h-3 w-3 shrink-0 text-ink-muted"
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
