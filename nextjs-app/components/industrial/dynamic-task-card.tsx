'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { OperationalTask, TaskSeverity } from '@/lib/operations';
import type { TestFilters } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AnomalyAlertBadge } from './anomaly-alert-badge';
import { EngineeringMetadata } from './engineering-metadata';
import {
  IndustrialIcon,
  type IndustrialIconName,
  type IndustrialIconTone,
} from './industrial-icon';
import { SlideUp } from './motion-primitives';
import { WhyPopover } from './why-popover';

/**
 * DynamicTaskCard — ranked operational triage card for the Dashboard.
 *
 * Renders a single `OperationalTask` (derived by `deriveTasks` in
 * lib/operations.ts) with a severity-accented left bar, title + metric,
 * context line, optional WhyPopover with rationale, and an action link
 * deep-linking to /results filtered by the task's anomaly scope.
 *
 * Critical severity gets a pulsing accent bar (one-shot attention draw).
 */

interface DynamicTaskCardProps {
  task: OperationalTask;
  className?: string;
}

const SEVERITY_META: Record<
  TaskSeverity,
  {
    icon: IndustrialIconName;
    tone: IndustrialIconTone;
    accentBg: string;
  }
> = {
  critical: {
    icon: 'Critical',
    tone: 'critical',
    accentBg: 'bg-state-critical',
  },
  anomaly: {
    icon: 'Warning',
    tone: 'anomaly',
    accentBg: 'bg-state-anomaly',
  },
  watch: {
    icon: 'Threshold',
    tone: 'muted',
    accentBg: 'bg-status-info',
  },
  nominal: {
    icon: 'Safety',
    tone: 'nominal',
    accentBg: 'bg-state-nominal',
  },
};

function buildResultsHref(filters: Partial<TestFilters>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `/results?${qs}` : '/results';
}

export function DynamicTaskCard({ task, className }: DynamicTaskCardProps) {
  const meta = SEVERITY_META[task.severity];
  const hasRationale = task.rationale && task.rationale.length > 0;
  const hasAction = !!task.filterLink;
  // AnomalyAlertBadge doesn't accept 'nominal' — downgrade to 'watch' visually.
  const badgeSeverity = task.severity === 'nominal' ? 'watch' : task.severity;

  return (
    <SlideUp distance={8} className="h-full">
      <article
        className={cn(
          'relative overflow-hidden rounded-card border border-hairline bg-surface-card p-4 pl-5 h-full',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1',
            meta.accentBg,
            task.severity === 'critical' && 'animate-anomaly-pulse',
          )}
        />
        <header className="flex items-start gap-2">
          <IndustrialIcon
            name={meta.icon}
            size="sm"
            tone={meta.tone}
            className="mt-0.5"
          />
          <h3 className="flex-1 text-sm font-semibold leading-snug text-ink-primary">
            {task.title}
          </h3>
          <AnomalyAlertBadge
            severity={badgeSeverity}
            value={task.metric}
            pulsing={false}
          />
        </header>
        <div className="mt-2 pl-6">
          <EngineeringMetadata
            items={[{ value: task.context, valueOnly: true }]}
          />
        </div>
        {(hasRationale || hasAction) && (
          <footer className="mt-3 flex items-center gap-2 pl-6">
            {hasRationale && (
              <WhyPopover
                title="Why this task?"
                subtitle={`Severity · ${task.severity}`}
                dataPoints={task.rationale}
              />
            )}
            {hasAction && (
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="ml-auto"
              >
                <Link href={buildResultsHref(task.filterLink!)}>
                  {task.actionLabel ?? 'Inspect'}
                  <IndustrialIcon
                    name="ChevronRight"
                    size="sm"
                    tone="inherit"
                  />
                </Link>
              </Button>
            )}
          </footer>
        )}
      </article>
    </SlideUp>
  );
}
