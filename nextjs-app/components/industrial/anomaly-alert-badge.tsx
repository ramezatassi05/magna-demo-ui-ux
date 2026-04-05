'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { IndustrialIcon, type IndustrialIconName } from './industrial-icon';

/**
 * AnomalyAlertBadge — state-rule alert indicator.
 *
 * Three variants:
 *  - standalone: pill with icon + label, used in task cards + above charts
 *  - inline-row: 4px left strip for table rows (absolute-positioned)
 *  - kpi-corner: top-right dot on KpiCard (absolute-positioned)
 *
 * Pulsing animation is restricted to `critical` severity (restraint) and
 * disabled under prefers-reduced-motion via globals.css media query.
 */

export type AnomalySeverity = 'critical' | 'anomaly' | 'watch';

type AnomalyVariant = 'standalone' | 'inline-row' | 'kpi-corner';

interface AnomalyAlertBadgeProps {
  severity: AnomalySeverity;
  /** Required for standalone variant; optional tooltip for inline-row / kpi-corner. */
  label?: string;
  /** Optional secondary value (e.g., "+0.8pp"). */
  value?: string | number;
  variant?: AnomalyVariant;
  /** Default pulsing behaviour: only critical pulses. */
  pulsing?: boolean;
  /** Hover reveal text (used when variant doesn't show label inline). */
  tooltip?: string;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { icon: IndustrialIconName; barBg: string; pillClasses: string; dotBg: string; defaultLabel: string }
> = {
  critical: {
    icon: 'Critical',
    barBg: 'bg-state-critical',
    pillClasses: 'bg-state-critical-bg text-state-critical border-state-critical-border',
    dotBg: 'bg-state-critical',
    defaultLabel: 'CRITICAL',
  },
  anomaly: {
    icon: 'Warning',
    barBg: 'bg-state-anomaly',
    pillClasses: 'bg-state-anomaly-bg text-state-anomaly border-state-anomaly-border',
    dotBg: 'bg-state-anomaly',
    defaultLabel: 'ANOMALY',
  },
  watch: {
    icon: 'Warning',
    barBg: 'bg-status-info',
    pillClasses: 'bg-status-info/10 text-status-info border-status-info/30',
    dotBg: 'bg-status-info',
    defaultLabel: 'WATCH',
  },
};

export function AnomalyAlertBadge({
  severity,
  label,
  value,
  variant = 'standalone',
  pulsing,
  tooltip,
  className,
}: AnomalyAlertBadgeProps) {
  const cfg = SEVERITY_CONFIG[severity];
  const shouldPulse = pulsing ?? severity === 'critical';

  if (variant === 'inline-row') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="status"
              aria-live="polite"
              aria-label={tooltip ?? label ?? cfg.defaultLabel}
              className={cn(
                'absolute left-0 top-0 h-full w-1',
                cfg.barBg,
                shouldPulse && 'animate-anomaly-pulse',
                className,
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="right">{tooltip ?? label ?? cfg.defaultLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'kpi-corner') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="status"
              aria-live="polite"
              aria-label={tooltip ?? label ?? cfg.defaultLabel}
              className={cn(
                'absolute right-3 top-3 inline-flex h-2 w-2 items-center justify-center rounded-full',
                cfg.dotBg,
                shouldPulse && 'animate-anomaly-pulse',
                className,
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="left">{tooltip ?? label ?? cfg.defaultLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // standalone
  const displayLabel = label ?? cfg.defaultLabel;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest',
        cfg.pillClasses,
        shouldPulse && 'animate-anomaly-pulse',
        className,
      )}
    >
      <IndustrialIcon name={cfg.icon} size="xs" tone="inherit" />
      <span>{displayLabel}</span>
      {value !== undefined && (
        <span className="font-normal opacity-80">· {value}</span>
      )}
    </span>
  );
}
