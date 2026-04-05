'use client';

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  ApprovalStatus,
  TestCase,
  TestCaseConfidence,
  TestCasePriority,
} from '@/lib/types';
import { ApprovalButton } from '@/components/approval-button';
import { ConfidenceMeter } from '@/components/industrial/confidence-meter';
import { EngineeringMetadata } from '@/components/industrial/engineering-metadata';
import {
  WhyPopover,
  type RationaleDataPoint,
} from '@/components/industrial/why-popover';

interface TestCaseCardLightProps {
  testCase: TestCase;
  approvalStatus: ApprovalStatus;
  onApprovalChange: (testId: string, next: ApprovalStatus) => void;
  /** Called when the user saves inline edits. Returns the updated case. */
  onEdit: (updated: TestCase) => void;
}

const CONFIDENCE_TO_SCORE: Record<TestCaseConfidence, number> = {
  low: 0.5,
  medium: 0.75,
  high: 0.92,
};

const PRIORITY_STYLES: Record<TestCasePriority, string> = {
  high: 'bg-status-fail/10 text-status-fail border-status-fail/20',
  medium: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  low: 'bg-status-info/10 text-status-info border-status-info/20',
};

const STATUS_BORDER: Record<Exclude<ApprovalStatus, null>, string> = {
  approved: 'border-status-pass/40',
  rejected: 'border-status-fail/40 opacity-75',
};

/**
 * Light-themed card for the Test Generator page (contrasts with the dark
 * TestCaseCard used in the chat panel). All sections expanded by default
 * since this view is review-focused. Supports inline edit mode.
 */
export function TestCaseCardLight({
  testCase,
  approvalStatus,
  onApprovalChange,
  onEdit,
}: TestCaseCardLightProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TestCase>(testCase);

  const handleEnterEdit = () => {
    setDraft(testCase);
    setEditing(true);
  };

  const handleSave = () => {
    onEdit(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(testCase);
    setEditing(false);
  };

  const tc = editing ? draft : testCase;
  const borderClass =
    approvalStatus && approvalStatus in STATUS_BORDER
      ? STATUS_BORDER[approvalStatus as Exclude<ApprovalStatus, null>]
      : 'border-hairline';

  // Build the rationale payload from the TestCase fields that exist today.
  // The backend doesn't yet expose a `rationale` / `template` / `gen_id`
  // payload — so we synthesize dataPoints from the template output fields.
  const whyDataPoints: RationaleDataPoint[] = [
    {
      label: 'Confidence',
      value: tc.confidence,
      weight: 'primary',
      tone:
        tc.confidence === 'high'
          ? 'nominal'
          : tc.confidence === 'low'
          ? 'critical'
          : 'anomaly',
    },
    {
      label: 'Priority',
      value: tc.priority,
      weight: 'primary',
      tone: tc.priority === 'high' ? 'critical' : 'nominal',
    },
    {
      label: 'Est. duration',
      value: `${tc.estimated_duration_min} min`,
      weight: 'secondary',
    },
    {
      label: 'Preconditions',
      value: tc.preconditions.length,
      weight: 'secondary',
    },
    {
      label: 'Steps',
      value: tc.steps.length,
      weight: 'secondary',
    },
  ];

  return (
    <article
      className={cn(
        'rounded-card border bg-surface-card p-4 shadow-card transition-all animate-fade-in',
        borderClass,
      )}
    >
      {/* Header — id, title, confidence, priority, duration */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-agent-thinking">
            {tc.test_id}
          </div>
          {editing ? (
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 block w-full rounded border border-hairline bg-surface-base px-2 py-1 text-[13px] font-semibold text-ink-primary focus:border-magna-red focus:outline-none focus:ring-1 focus:ring-magna-red"
            />
          ) : (
            <h3 className="mt-1 text-[14px] font-semibold leading-snug text-ink-primary">
              {tc.title}
            </h3>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide',
                PRIORITY_STYLES[tc.priority],
              )}
            >
              {tc.priority} priority
            </span>
            <span className="font-mono text-[10px] text-ink-muted">
              ~{tc.estimated_duration_min} min
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-start gap-2">
            <ConfidenceMeter
              score={CONFIDENCE_TO_SCORE[tc.confidence]}
              size="sm"
              label="Confidence"
              showValue
            />
            <WhyPopover
              title="Why this test case?"
              subtitle={`Generated for ${tc.test_id}`}
              dataPoints={whyDataPoints}
              align="end"
              side="bottom"
              triggerAriaLabel="Show test case rationale"
            />
          </div>
          {!editing && (
            <button
              type="button"
              onClick={handleEnterEdit}
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-card px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-secondary transition-colors hover:border-magna-red/30 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-magna-red"
            >
              <Pencil className="h-3 w-3" strokeWidth={2} aria-hidden />
              Edit
            </button>
          )}
        </div>
      </header>

      {/* Sections — all expanded */}
      <div className="mt-3 space-y-3 border-t border-hairline-subtle pt-3">
        <Section title="Preconditions">
          {editing ? (
            <ListEditor
              items={draft.preconditions}
              onChange={(v) => setDraft({ ...draft, preconditions: v })}
              placeholder="Add precondition"
            />
          ) : (
            <ul className="list-disc space-y-0.5 pl-5 text-[12px] leading-relaxed text-ink-primary">
              {tc.preconditions.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Steps">
          {editing ? (
            <ListEditor
              items={draft.steps}
              onChange={(v) => setDraft({ ...draft, steps: v })}
              placeholder="Add step"
              ordered
            />
          ) : (
            <ol className="list-decimal space-y-0.5 pl-5 text-[12px] leading-relaxed text-ink-primary">
              {tc.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Expected Result">
          {editing ? (
            <textarea
              value={draft.expected_result}
              onChange={(e) =>
                setDraft({ ...draft, expected_result: e.target.value })
              }
              rows={2}
              className="block w-full resize-y rounded border border-hairline bg-surface-base px-2 py-1 text-[12px] text-ink-primary focus:border-magna-red focus:outline-none focus:ring-1 focus:ring-magna-red"
            />
          ) : (
            <p className="text-[12px] leading-relaxed text-ink-primary">
              {tc.expected_result}
            </p>
          )}
        </Section>

        <Section title="Pass Criteria">
          {editing ? (
            <textarea
              value={draft.pass_criteria}
              onChange={(e) =>
                setDraft({ ...draft, pass_criteria: e.target.value })
              }
              rows={2}
              className="block w-full resize-y rounded border border-hairline bg-surface-base px-2 py-1 text-[12px] text-ink-primary focus:border-magna-red focus:outline-none focus:ring-1 focus:ring-magna-red"
            />
          ) : (
            <p className="text-[12px] font-medium leading-relaxed text-ink-primary">
              {tc.pass_criteria}
            </p>
          )}
        </Section>
      </div>

      {/* Engineering metadata strip */}
      <EngineeringMetadata
        items={[
          { label: 'id', value: tc.test_id },
          { label: 'priority', value: tc.priority },
          { label: 'duration', value: `${tc.estimated_duration_min}m` },
          { label: 'confidence', value: tc.confidence },
        ]}
        align="between"
        className="mt-3 border-t border-hairline-subtle pt-2"
      />

      {/* Footer — edit save/cancel OR approval */}
      <div className="mt-3 border-t border-hairline-subtle pt-3">
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-ink-primary px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-magna-red"
            >
              <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[11px] font-medium text-ink-secondary transition-colors hover:border-hairline hover:bg-surface-base hover:text-ink-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-magna-red"
            >
              <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              Cancel
            </button>
          </div>
        ) : (
          <ApprovalButton
            testId={testCase.test_id}
            status={approvalStatus}
            onStatusChange={onApprovalChange}
          />
        )}
      </div>
    </article>
  );
}

/** Collapsible-header-style section label + body. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
        {title}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** Simple add/remove list editor for preconditions/steps in edit mode. */
function ListEditor({
  items,
  onChange,
  placeholder,
  ordered = false,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  ordered?: boolean;
}) {
  const handleItemChange = (i: number, value: string) => {
    const next = [...items];
    next[i] = value;
    onChange(next);
  };
  const handleRemove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };
  const handleAdd = () => onChange([...items, '']);

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-muted">
            {ordered ? `${i + 1}.` : '•'}
          </span>
          <input
            value={item}
            onChange={(e) => handleItemChange(i, e.target.value)}
            className="flex-1 rounded border border-hairline bg-surface-base px-2 py-1 text-[12px] text-ink-primary focus:border-magna-red focus:outline-none focus:ring-1 focus:ring-magna-red"
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            aria-label="Remove item"
            className="rounded p-1 text-ink-muted transition-colors hover:text-status-fail focus-visible:outline-none focus-visible:text-status-fail"
          >
            <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="font-mono text-[10px] uppercase tracking-wide text-ink-secondary transition-colors hover:text-magna-red focus-visible:outline-none focus-visible:text-magna-red"
      >
        + {placeholder}
      </button>
    </div>
  );
}
