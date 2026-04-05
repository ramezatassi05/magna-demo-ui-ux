import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * EngineeringMetadata — mono, uppercase-tracked, muted metadata strip.
 *
 * This is the signature visual that separates "enterprise" from "consumer"
 * surfaces. Used on KpiCard footers, ToolCallCard headers, DynamicTaskCard
 * trailer rows, agent done events, etc. — wherever we want to surface
 * run_id · duration · row_count · timestamp context.
 *
 * Items are rendered as `label: value` pairs separated by a middle-dot
 * divider. Values can be inline React nodes (e.g., formatted timestamps).
 */

export interface MetadataItem {
  /** Required unless valueOnly=true (then label may be omitted). */
  label?: string;
  value: ReactNode;
  /** Render value only (no "label:" prefix). Useful for IDs. */
  valueOnly?: boolean;
  /** Optional highlight (used for simulated/override state). */
  tone?: 'default' | 'override' | 'nominal' | 'critical';
}

interface EngineeringMetadataProps {
  items: MetadataItem[];
  className?: string;
  /** Visual alignment: inline (flex row) or block (stacked on narrow). */
  align?: 'start' | 'center' | 'end' | 'between';
}

const TONE_CLASS: Record<NonNullable<MetadataItem['tone']>, string> = {
  default: 'text-ink-muted',
  override: 'text-state-override',
  nominal: 'text-state-nominal',
  critical: 'text-state-critical',
};

const ALIGN_CLASS: Record<NonNullable<EngineeringMetadataProps['align']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export function EngineeringMetadata({
  items,
  className,
  align = 'start',
}: EngineeringMetadataProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-ink-muted',
        ALIGN_CLASS[align],
        className,
      )}
    >
      {items.map((item, i) => {
        const toneClass = TONE_CLASS[item.tone ?? 'default'];
        return (
          <Fragment key={`${item.label ?? 'item'}-${i}`}>
            {i > 0 && (
              <span aria-hidden="true" className="text-ink-muted/50">
                ·
              </span>
            )}
            <span className={toneClass}>
              {!item.valueOnly && (
                <>
                  <span className="opacity-60">{item.label}</span>
                  <span className="opacity-60">: </span>
                </>
              )}
              <span className="font-medium">{item.value}</span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
