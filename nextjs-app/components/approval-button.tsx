'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';

type ApprovalState = 'pending' | 'approved' | 'rejected';

interface ApprovalButtonProps {
  /** Opaque identifier forwarded to callbacks; not displayed. */
  testId: string;
  onApprove?: (testId: string) => void;
  onReject?: (testId: string) => void;
}

/**
 * Human-in-the-loop control attached to each AI-generated test case.
 * Toggles between a two-button prompt and a single resolved chip with
 * an Undo affordance. State is local — persistence is out of scope
 * for Phase 6.
 */
export function ApprovalButton({
  testId,
  onApprove,
  onReject,
}: ApprovalButtonProps) {
  const [state, setState] = useState<ApprovalState>('pending');

  if (state === 'approved' || state === 'rejected') {
    const approved = state === 'approved';
    return (
      <div className="flex items-center justify-between pt-1">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium',
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
          onClick={() => setState('pending')}
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
          setState('approved');
          onApprove?.(testId);
        }}
        className={cn(
          'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-status-pass/40 px-2 py-1.5 text-[11px] font-medium text-status-pass transition-colors',
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
          setState('rejected');
          onReject?.(testId);
        }}
        className={cn(
          'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-status-fail/40 px-2 py-1.5 text-[11px] font-medium text-status-fail transition-colors',
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
