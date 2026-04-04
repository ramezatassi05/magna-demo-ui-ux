'use client';

import { AlertCircle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Skeleton } from './skeleton';

interface ChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  minHeight?: number;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** White card wrapper used for every dashboard chart + mini-table. */
export function ChartCard({
  title,
  description,
  loading = false,
  error = null,
  onRetry,
  minHeight = 280,
  headerRight,
  children,
  className,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        'rounded-card border border-hairline bg-surface-card p-4 shadow-card',
        className,
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink-primary">{title}</h3>
          {description && (
            <p className="mt-0.5 text-[13px] text-ink-secondary">{description}</p>
          )}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </header>

      <div style={{ minHeight }} className="relative">
        {loading && (
          <div className="flex h-full flex-col gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-full min-h-[200px] w-full" />
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-6 w-6 text-status-fail" aria-hidden />
            <div>
              <p className="text-sm font-medium text-ink-primary">
                Failed to load data
              </p>
              <p className="mt-0.5 text-[12px] text-ink-secondary">
                {error.message}
              </p>
            </div>
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={() => onRetry()}>
                <RotateCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        )}

        {!loading && !error && children}
      </div>
    </section>
  );
}
