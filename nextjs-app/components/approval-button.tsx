'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ApprovalStatus } from '@/lib/types';

type InternalState = 'pending' | 'approved' | 'rejected';

interface ApprovalButtonProps {
  /** Opaque identifier forwarded to callbacks; not displayed. */
  testId: string;
  onApprove?: (testId: string) => void;
  onReject?: (testId: string) => void;
  /**
   * Optional controlled status. When provided, the component is controlled
   * and calls `onStatusChange` on transitions. When omitted, the component
   * manages its own internal state (backward-compatible with chat usage).
   */
  status?: ApprovalStatus;
  onStatusChange?: (testId: string, next: ApprovalStatus) => void;
}

/**
 * Human-in-the-loop control attached to each AI-generated test case.
 *
 * Uncontrolled mode: toggles local state between pending/approved/rejected.
 * Controlled mode: delegates state to parent via `status` + `onStatusChange`,
 * letting the page track per-card approvals for export filtering.
 */
export function ApprovalButton({
  testId,
  onApprove,
  onReject,
  status,
  onStatusChange,
}: ApprovalButtonProps) {
  const isControlled = status !== undefined;
  const [internal, setInternal] = useState<InternalState>('pending');

  const resolved: InternalState = isControlled
    ? (status ?? null) === 'approved'
      ? 'approved'
      : status === 'rejected'
        ? 'rejected'
        : 'pending'
    : internal;

  const setResolved = (next: InternalState) => {
    if (isControlled) {
      const mapped: ApprovalStatus = next === 'pending' ? null : next;
      onStatusChange?.(testId, mapped);
    } else {
      setInternal(next);
    }
  };

  if (resolved === 'approved' || resolved === 'rejected') {
    const approved = resolved === 'approved';
    return (
      <div className="flex items-center justify-between pt-1">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-medium',
            approved
              ? 'bg-status-pass/15 text-status-pass'
              : 'bg-status-fail/15 text-status-fail',
          )}
        >
          {approved ? (
            <Check className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <X className="h-3 w-3" strokeWidth={2.5} />
          )}
          {approved ? 'Approved' : 'Rejected'}
        </span>
        <button
          type="button"
          onClick={() => setResolved('pending')}
          className="font-mono text-[10px] uppercase tracking-wider text-ink-muted transition-colors hover:text-ink-on-dark focus-visible:outline-none focus-visible:text-ink-on-dark"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={() => {
          setResolved('approved');
          onApprove?.(testId);
        }}
        className={cn(
          'flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm border border-status-pass/40 px-2 py-1.5 text-[11px] font-medium text-status-pass transition-colors',
          'hover:bg-status-pass hover:text-white',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-status-pass',
        )}
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Approve
      </button>
      <button
        type="button"
        onClick={() => {
          setResolved('rejected');
          onReject?.(testId);
        }}
        className={cn(
          'flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm border border-status-fail/40 px-2 py-1.5 text-[11px] font-medium text-status-fail transition-colors',
          'hover:bg-status-fail hover:text-white',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-status-fail',
        )}
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
        Reject
      </button>
    </div>
  );
}
