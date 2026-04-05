'use client';

import { AlertCircle, ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/lib/hooks/use-count-up';
import { Skeleton } from './skeleton';

type Accent = 'pass' | 'fail' | 'warning' | 'info' | 'magna';

interface KpiCardProps {
  label: string;
  value: number;
  unit?: string;
  /** Signed percentage-point delta vs prior period (+ improved, − regressed). */
  trend?: number;
  accentColor: Accent;
  loading?: boolean;
  /** If set (and not loading), the value is replaced by an error glyph + tooltip. */
  error?: Error | null;
  icon?: LucideIcon;
  decimals?: number;
  /** Inverts trend coloring for metrics where "down" is good (e.g. FPR). */
  invertTrend?: boolean;
}

const ACCENT_BORDERS: Record<Accent, string> = {
  pass: 'border-l-status-pass',
  fail: 'border-l-status-fail',
  warning: 'border-l-status-warning',
  info: 'border-l-status-info',
  magna: 'border-l-magna-red',
};

export function KpiCard({
  label,
  value,
  unit,
  trend,
  accentColor,
  loading = false,
  error = null,
  icon: Icon,
  decimals = 0,
  invertTrend = false,
}: KpiCardProps) {
  const animated = useCountUp(value, 800, decimals);

  const trendPositive =
    typeof trend === 'number' && (invertTrend ? trend < 0 : trend > 0);
  const trendNegative =
    typeof trend === 'number' && (invertTrend ? trend > 0 : trend < 0);
  const TrendIcon = (trend ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        'h-[100px] rounded-card bg-surface-card border-l-4 border border-hairline shadow-card',
        'transition-shadow duration-200 hover:shadow-card-hover',
        'flex flex-col justify-between px-5 py-3',
        ACCENT_BORDERS[accentColor],
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-ink-muted" aria-hidden />}
      </div>

      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : error ? (
        <div
          className="flex items-center gap-2"
          role="alert"
          title={error.message}
        >
          <AlertCircle
            className="h-5 w-5 text-status-fail"
            aria-label="Metric unavailable"
          />
          <span className="font-mono text-[28px] font-bold leading-none text-ink-secondary tabular-nums">
            —
          </span>
        </div>
      ) : (
        <div className="flex items-baseline">
          <span className="font-mono text-[28px] font-bold leading-none text-ink-primary tabular-nums">
            {animated.toLocaleString('en-US', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}
          </span>
          {unit && (
            <span className="ml-1 text-sm font-medium text-ink-secondary">{unit}</span>
          )}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-3 w-16" />
      ) : error ? (
        <div className="text-[11px] font-medium text-status-fail">
          Failed to load
        </div>
      ) : typeof trend === 'number' ? (
        <div
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-medium',
            trendPositive && 'text-status-pass',
            trendNegative && 'text-status-fail',
            !trendPositive && !trendNegative && 'text-ink-secondary',
          )}
        >
          <TrendIcon className="h-3 w-3" aria-hidden />
          <span className="font-mono tabular-nums">
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}
          </span>
          <span className="text-ink-secondary">vs prior 7d</span>
        </div>
      ) : (
        <div className="h-3" aria-hidden />
      )}
    </div>
  );
}
