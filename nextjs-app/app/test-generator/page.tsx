'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Wand2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GenerationHistory } from '@/components/test-generator/generation-history';
import type { HistoryEntry } from '@/components/test-generator/generation-history';
import {
  RequirementForm,
} from '@/components/test-generator/requirement-form';
import type { RequirementFormValues } from '@/components/test-generator/requirement-form';
import { TestCaseCardLight } from '@/components/test-generator/test-case-card-light';
import { TestCaseSkeletonList } from '@/components/test-generator/test-case-skeleton';
import { generateTestCases } from '@/lib/api';
import {
  exportTestCasesAsCsv,
  exportTestCasesAsJson,
} from '@/lib/test-case-export';
import { cn } from '@/lib/utils';
import type {
  ApprovalStatus,
  Feature,
  TestCase,
  TestCasesData,
} from '@/lib/types';

type Status = 'idle' | 'generating' | 'loaded' | 'error';
type ExportScope = 'all' | 'approved';

const INITIAL_FORM: RequirementFormValues = {
  requirement: '',
  feature: 'auto',
  count: 5,
};

export default function TestGeneratorPage() {
  const [form, setForm] = useState<RequirementFormValues>(INITIAL_FORM);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const [currentBatch, setCurrentBatch] = useState<TestCasesData | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // test_id -> ApprovalStatus | undefined (undefined = pending)
  const [approvals, setApprovals] = useState<Record<string, ApprovalStatus>>({});
  // test_id -> edited TestCase (overlays currentBatch)
  const [edits, setEdits] = useState<Record<string, TestCase>>({});

  const batchSeq = useRef(0);

  const handleGenerate = useCallback(async () => {
    if (!form.requirement.trim()) return;
    setStatus('generating');
    setError(null);

    try {
      const body = {
        requirement: form.requirement.trim(),
        feature: form.feature === 'auto' ? undefined : (form.feature as Feature),
        count: form.count,
      };
      const result = await generateTestCases(body);

      const batchId = `batch-${++batchSeq.current}`;
      const entry: HistoryEntry = {
        id: batchId,
        timestamp: Date.now(),
        requirement: result.requirement,
        feature: result.feature,
        count: result.cases.length,
        batch: result,
      };

      setCurrentBatch(result);
      setActiveBatchId(batchId);
      setHistory((prev) => [entry, ...prev]);
      setApprovals({});
      setEdits({});
      setStatus('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
    }
  }, [form]);

  const handleRegenerate = useCallback(() => {
    // Re-run with current form values — creates a new batch
    handleGenerate();
  }, [handleGenerate]);

  const handleApprovalChange = useCallback(
    (testId: string, next: ApprovalStatus) => {
      setApprovals((prev) => ({ ...prev, [testId]: next }));
    },
    [],
  );

  const handleEdit = useCallback((updated: TestCase) => {
    setEdits((prev) => ({ ...prev, [updated.test_id]: updated }));
  }, []);

  const handleSelectHistory = useCallback((entry: HistoryEntry) => {
    setCurrentBatch(entry.batch);
    setActiveBatchId(entry.id);
    setApprovals({});
    setEdits({});
    setStatus('loaded');
  }, []);

  /** Effective cases = backend cases overlaid with inline edits. */
  const effectiveCases: TestCase[] = useMemo(() => {
    if (!currentBatch) return [];
    return currentBatch.cases.map((c) => edits[c.test_id] ?? c);
  }, [currentBatch, edits]);

  const approvedCount = useMemo(
    () =>
      effectiveCases.filter((c) => approvals[c.test_id] === 'approved').length,
    [effectiveCases, approvals],
  );
  const rejectedCount = useMemo(
    () =>
      effectiveCases.filter((c) => approvals[c.test_id] === 'rejected').length,
    [effectiveCases, approvals],
  );

  const handleExport = (fmt: 'csv' | 'json', scope: ExportScope) => {
    const cases =
      scope === 'approved'
        ? effectiveCases.filter((c) => approvals[c.test_id] === 'approved')
        : effectiveCases;
    if (cases.length === 0) return;
    const prefix =
      scope === 'approved' ? 'approved-test-cases' : 'test-cases';
    if (fmt === 'csv') exportTestCasesAsCsv(cases, prefix);
    else exportTestCasesAsJson(cases, prefix);
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-widest text-ink-secondary">
          Agent
        </div>
        <h1 className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
          Test Generator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
          Write an ADAS feature requirement and the agent drafts structured
          test cases you can approve, edit, or reject — then export to CSV or
          JSON for your validation harness.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEFT — form (40%) */}
        <div className="lg:col-span-2">
          <RequirementForm
            values={form}
            onChange={setForm}
            onSubmit={handleGenerate}
            disabled={status === 'generating'}
          />
        </div>

        {/* RIGHT — results (60%) */}
        <div className="space-y-4 lg:col-span-3">
          {/* Top bar */}
          {(status === 'loaded' || status === 'generating') && currentBatch && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-surface-card px-4 py-3 shadow-card">
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="font-mono text-xl font-semibold text-ink-primary">
                    {effectiveCases.length}
                  </span>
                  <span className="ml-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-secondary">
                    test cases
                  </span>
                </div>
                <span className="text-ink-muted">·</span>
                <div className="flex items-center gap-2 font-mono text-[11px] text-ink-secondary">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-pass" aria-hidden />
                    {approvedCount} approved
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-fail" aria-hidden />
                    {rejectedCount} rejected
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={status === 'generating'}
                >
                  <RefreshCw
                    className={cn(
                      'h-3.5 w-3.5',
                      status === 'generating' && 'animate-spin',
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                  Regenerate
                </Button>
                <ExportMenu
                  onExport={handleExport}
                  approvedCount={approvedCount}
                  totalCount={effectiveCases.length}
                />
              </div>
            </div>
          )}

          {/* Error banner */}
          {status === 'error' && (
            <div className="flex items-start gap-3 rounded-card border border-status-fail/20 bg-status-fail/5 p-3">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-status-fail"
                aria-hidden
              />
              <div className="flex-1 text-xs">
                <p className="font-medium text-ink-primary">
                  Failed to generate test cases
                </p>
                <p className="mt-0.5 text-ink-secondary">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="text-xs font-medium text-magna-red hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Cards / loading / empty */}
          {status === 'generating' && <TestCaseSkeletonList count={form.count} />}

          {status !== 'generating' && currentBatch && (
            <div className="flex flex-col gap-3">
              {effectiveCases.map((tc) => (
                <TestCaseCardLight
                  key={tc.test_id}
                  testCase={tc}
                  approvalStatus={approvals[tc.test_id] ?? null}
                  onApprovalChange={handleApprovalChange}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}

          {status === 'idle' && <EmptyState />}

          {/* History */}
          <GenerationHistory
            entries={history}
            activeId={activeBatchId}
            onSelect={handleSelectHistory}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-card border border-dashed border-hairline bg-surface-card p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-agent-thinking/15">
        <Wand2 className="h-5 w-5 text-agent-thinking" strokeWidth={2} aria-hidden />
      </div>
      <div className="font-mono text-sm font-semibold text-ink-primary">
        Waiting for a requirement
      </div>
      <div className="mt-1 max-w-sm text-xs text-ink-secondary">
        Write or pick an example on the left, then click{' '}
        <span className="font-mono text-ink-primary">Generate Test Cases</span>{' '}
        to draft a structured validation batch.
      </div>
    </div>
  );
}

function ExportMenu({
  onExport,
  approvedCount,
  totalCount,
}: {
  onExport: (fmt: 'csv' | 'json', scope: ExportScope) => void;
  approvedCount: number;
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const noApproved = approvedCount === 0;
  const noCases = totalCount === 0;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        disabled={noCases}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        Export
      </Button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-hairline bg-surface-card shadow-card-hover"
          >
            <ExportMenuItem
              icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />}
              label="CSV — all cases"
              meta={`${totalCount}`}
              onClick={() => {
                onExport('csv', 'all');
                setOpen(false);
              }}
            />
            <ExportMenuItem
              icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />}
              label="CSV — approved only"
              meta={`${approvedCount}`}
              disabled={noApproved}
              onClick={() => {
                onExport('csv', 'approved');
                setOpen(false);
              }}
            />
            <div className="border-t border-hairline-subtle" />
            <ExportMenuItem
              icon={<FileJson className="h-3.5 w-3.5" aria-hidden />}
              label="JSON — all cases"
              meta={`${totalCount}`}
              onClick={() => {
                onExport('json', 'all');
                setOpen(false);
              }}
            />
            <ExportMenuItem
              icon={<FileJson className="h-3.5 w-3.5" aria-hidden />}
              label="JSON — approved only"
              meta={`${approvedCount}`}
              disabled={noApproved}
              onClick={() => {
                onExport('json', 'approved');
                setOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenuItem({
  icon,
  label,
  meta,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink-primary transition-colors',
        'hover:bg-surface-base',
        'focus-visible:outline-none focus-visible:bg-surface-base',
        disabled && 'cursor-not-allowed text-ink-muted hover:bg-transparent',
      )}
    >
      <span className="text-ink-secondary">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="font-mono text-[10px] text-ink-muted">{meta}</span>
    </button>
  );
}
