'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';
import type { TestRecord } from '@/lib/types';
import { formatDateShort } from '@/lib/format';
import { Skeleton } from '../skeleton';

interface RecentFailuresMiniProps {
  rows: TestRecord[] | undefined;
  loading?: boolean;
}

export function RecentFailuresMini({ rows, loading = false }: RecentFailuresMiniProps) {
  if (loading) {
    return (
      <ul className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex h-9 items-center gap-3 border-b border-hairline-subtle">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-12" />
          </li>
        ))}
      </ul>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
        <Inbox className="h-5 w-5 text-ink-muted" aria-hidden />
        <p className="text-xs text-ink-secondary">No recent failures.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-hairline-subtle">
      {rows.map((row) => (
        <li key={row.test_id}>
          <Link
            href={`/results?search=${encodeURIComponent(row.test_id)}`}
            className="group flex h-[38px] items-center gap-3 text-xs transition-colors hover:bg-hairline-subtle -mx-2 px-2 rounded"
          >
            <span className="font-mono font-medium text-ink-primary w-[104px] shrink-0">
              {row.test_id}
            </span>
            <span className="flex-1 truncate text-ink-secondary group-hover:text-ink-primary" title={row.scenario}>
              {row.scenario}
            </span>
            <span className="font-mono text-ink-secondary tabular-nums shrink-0">
              {formatDateShort(row.timestamp)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
