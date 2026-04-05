'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TestCase, TestCasePriority } from '@/lib/types';
import { ApprovalButton } from '@/components/approval-button';
import { ConfidenceBadge } from '@/components/confidence-badge';

interface TestCaseCardProps {
  testCase: TestCase;
}

const PRIORITY_STYLES: Record<TestCasePriority, string> = {
  high: 'bg-status-fail/15 text-status-fail',
  medium: 'bg-status-warning/15 text-status-warning',
  low: 'bg-status-info/15 text-status-info',
};

/** One AI-generated test case, with collapsibles and approval buttons. */
export function TestCaseCard({ testCase }: TestCaseCardProps) {
  return (
    <div className="space-y-2 rounded-lg border border-white/5 bg-surface-elevated p-3 animate-fade-in">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] text-agent-thinking">
            {testCase.test_id}
          </div>
          <div className="mt-0.5 text-[12px] font-medium leading-snug text-ink-on-dark">
            {testCase.title}
          </div>
        </div>
        <ConfidenceBadge level={testCase.confidence} size="sm" />
      </header>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex h-5 items-center rounded-sm px-1.5 font-mono text-[9px] font-medium uppercase tracking-wide',
            PRIORITY_STYLES[testCase.priority],
          )}
        >
          {testCase.priority}
        </span>
        <span className="font-mono text-[10px] text-ink-muted">
          {testCase.estimated_duration_min} min
        </span>
      </div>

      <CollapsibleSection title="Preconditions" items={testCase.preconditions} />
      <CollapsibleSection title="Steps" items={testCase.steps} ordered />
      <CollapsibleSection
        title="Expected Result"
        text={testCase.expected_result}
      />
      <CollapsibleSection
        title="Pass Criteria"
        text={testCase.pass_criteria}
      />

      <ApprovalButton testId={testCase.test_id} />
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  items?: string[];
  text?: string;
  ordered?: boolean;
}

function CollapsibleSection({
  title,
  items,
  text,
  ordered = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/5 pt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left focus-visible:outline-none focus-visible:text-ink-on-dark"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 text-ink-muted transition-transform',
            open && 'rotate-90',
          )}
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {title}
        </span>
      </button>
      {open && (
        <div className="mt-1 pl-[18px] text-[11px] leading-relaxed text-ink-on-dark/85">
          {items ? (
            ordered ? (
              <ol className="ml-4 list-decimal space-y-0.5">
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul className="ml-4 list-disc space-y-0.5">
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )
          ) : (
            <p>{text}</p>
          )}
        </div>
      )}
    </div>
  );
}
