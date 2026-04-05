'use client';

import { AlertCircle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Skeleton } from './skeleton';
import {
  EngineeringMetadata,
  type MetadataItem,
} from './industrial/engineering-metadata';

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
  /** Optional uppercase category tag rendered above the title. */
  overline?: string;
  /** Optional engineering metadata rendered at the card footer. */
  footerMetadata?: MetadataItem[];
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
  overline,
  footerMetadata,
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
          {overline && (
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              {overline}
            </p>
          )}
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

      {footerMetadata && footerMetadata.length > 0 && (
        <EngineeringMetadata
          items={footerMetadata}
          align="between"
          className="mt-3 border-t border-hairline-subtle pt-2"
        />
      )}
    </section>
  );
}
