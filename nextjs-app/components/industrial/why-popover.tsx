'use client';

import { useId, type ReactNode } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { IndustrialIcon } from './industrial-icon';

/**
 * WhyPopover — rationale overlay explaining what data/logic drove a
 * recommendation. Structured: Title → Key evidence (dataPoints) →
 * Decision logic (bullets) → free-form rationale.
 *
 * Renders via Radix Portal with focus trap + Escape + outside-click
 * handling. For long evidence lists (>6 items), prefer wrapping
 * consumers in a Dialog instead.
 *
 * Accessibility: trigger is a normal button when using the default
 * icon variant; consumers may supply `trigger` for custom affordances.
 */

export type RationaleDataTone = 'critical' | 'anomaly' | 'nominal' | 'override';

export interface RationaleDataPoint {
  label: string;
  value: string | number;
  /** Primary evidence is bolded; secondary is regular weight. */
  weight?: 'primary' | 'secondary';
  /** Tints the indicator dot next to the label. */
  tone?: RationaleDataTone;
}

interface WhyPopoverProps {
  /** Custom trigger. If omitted, renders a default "Why?" icon button. */
  trigger?: ReactNode;
  /** Popover header text (e.g., "Why confidence: Medium"). */
  title: string;
  /** Optional short subtitle under title. */
  subtitle?: string;
  /** Structured evidence — rendered as a list with tone dots. */
  dataPoints?: RationaleDataPoint[];
  /** Decision-rule bullets — short strings describing how the system decided. */
  logic?: string[];
  /** Free-form explanation (plain text; consumers may pass markdown nodes). */
  rationale?: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Aria label for the default trigger. */
  triggerAriaLabel?: string;
}

const TONE_DOT: Record<RationaleDataTone, string> = {
  critical: 'bg-state-critical',
  anomaly: 'bg-state-anomaly',
  nominal: 'bg-state-nominal',
  override: 'bg-state-override',
};

export function WhyPopover({
  trigger,
  title,
  subtitle,
  dataPoints,
  logic,
  rationale,
  align = 'end',
  side = 'bottom',
  triggerAriaLabel = 'Show rationale',
}: WhyPopoverProps) {
  const hasContent =
    (dataPoints && dataPoints.length > 0) || (logic && logic.length > 0) || rationale;

  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={triggerAriaLabel}
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-sm border border-hairline bg-surface-card px-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-secondary transition-colors',
              'hover:border-magna-red hover:text-magna-red',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-1',
            )}
          >
            <IndustrialIcon name="Why" size="xs" tone="inherit" />
            <span>Why</span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        aria-labelledby={titleId}
        className="w-96 max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="border-b border-hairline px-4 py-3">
          <div className="flex items-start gap-2">
            <IndustrialIcon name="Reasoning" size="sm" tone="brand" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4
                id={titleId}
                className="font-mono text-[13px] font-semibold leading-tight text-ink-primary"
              >
                {title}
              </h4>
              {subtitle && (
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {hasContent ? (
          <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
            {dataPoints && dataPoints.length > 0 && (
              <section>
                <h5 className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  Key evidence
                </h5>
                <ul className="space-y-1.5">
                  {dataPoints.map((dp, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                          dp.tone ? TONE_DOT[dp.tone] : 'bg-ink-muted/50',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-ink-secondary">{dp.label}: </span>
                        <span
                          className={cn(
                            'font-mono tabular-nums text-ink-primary',
                            dp.weight === 'primary' ? 'font-semibold' : 'font-normal',
                          )}
                        >
                          {dp.value}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {logic && logic.length > 0 && (
              <section className={cn(dataPoints && dataPoints.length > 0 && 'mt-4')}>
                <h5 className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  Decision logic
                </h5>
                <ul className="space-y-1 text-[12px] leading-snug text-ink-primary">
                  {logic.map((rule, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true" className="mt-[7px] h-px w-2 shrink-0 bg-ink-muted" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {rationale && (
              <section
                className={cn(
                  ((dataPoints && dataPoints.length > 0) || (logic && logic.length > 0)) && 'mt-4',
                )}
              >
                <h5 className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  Rationale
                </h5>
                <div className="text-[12px] leading-relaxed text-ink-primary">{rationale}</div>
              </section>
            )}
          </div>
        ) : (
          <div className="px-4 py-4 text-[12px] text-ink-muted">
            No rationale recorded for this recommendation.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
