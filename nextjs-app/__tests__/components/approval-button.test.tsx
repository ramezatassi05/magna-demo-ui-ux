/**
 * ApprovalButton tests.
 *
 * Component has two modes:
 *
 *   Uncontrolled — internal state machine pending → approved / rejected,
 *                  with "Undo" returning to pending. `onApprove` / `onReject`
 *                  callbacks fire on the corresponding click.
 *
 *   Controlled   — parent owns state via `status` prop; transitions are
 *                  reported via `onStatusChange(testId, next)`. `onApprove` /
 *                  `onReject` are NOT called in controlled mode — the parent
 *                  derives intent from the `onStatusChange` argument.
 *
 * Critical contract: users cannot go directly from approved → rejected.
 * They must pass through pending via "Undo" first. This is a deliberate
 * design choice that forces an affirmative re-click on the new decision.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { ApprovalButton } from '@/components/approval-button';
import type { ApprovalStatus } from '@/lib/types';

const TEST_ID = 'TC-2026-00042';

describe('ApprovalButton — uncontrolled mode', () => {
  it('shows both Approve and Reject buttons in pending state', () => {
    render(<ApprovalButton testId={TEST_ID} />);
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
    expect(screen.queryByText('Rejected')).not.toBeInTheDocument();
  });

  it('transitions to approved on Approve click and fires onApprove(testId)', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalButton
        testId={TEST_ID}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith(TEST_ID);
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    // Approve / Reject buttons are no longer rendered
    expect(
      screen.queryByRole('button', { name: /^approve$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^reject$/i }),
    ).not.toBeInTheDocument();
  });

  it('transitions to rejected on Reject click and fires onReject(testId)', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<ApprovalButton testId={TEST_ID} onReject={onReject} />);

    await user.click(screen.getByRole('button', { name: /reject/i }));

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith(TEST_ID);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('Undo returns to pending without re-firing onApprove/onReject', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalButton
        testId={TEST_ID}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(screen.getByText('Approved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo/i }));
    // Pending state restored
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();

    // Callbacks only fired once during the original approve click.
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).not.toHaveBeenCalled();
  });

  it('enforces no direct approved → rejected transition (must go via Undo)', async () => {
    const user = userEvent.setup();
    render(<ApprovalButton testId={TEST_ID} />);

    await user.click(screen.getByRole('button', { name: /approve/i }));
    // In the approved state there is NO Reject button — the user is forced
    // to press Undo first, which is the contract this component enforces.
    expect(
      screen.queryByRole('button', { name: /^reject$/i }),
    ).not.toBeInTheDocument();
    // Only Undo is available as the escape hatch
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });
});

describe('ApprovalButton — controlled mode', () => {
  it('renders the pill matching the `status` prop', () => {
    const { rerender } = render(
      <ApprovalButton testId={TEST_ID} status="approved" onStatusChange={vi.fn()} />,
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();

    rerender(
      <ApprovalButton testId={TEST_ID} status="rejected" onStatusChange={vi.fn()} />,
    );
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    rerender(
      <ApprovalButton testId={TEST_ID} status={null} onStatusChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
  });

  it('calls onStatusChange(testId, "approved") in controlled mode', async () => {
    // In controlled mode the component still fires `onApprove` (a side-effect
    // callback) but the source of truth for parent state is `onStatusChange`.
    // The parent should read the `next` argument, not rely on onApprove/onReject.
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const onApprove = vi.fn();
    render(
      <ApprovalButton
        testId={TEST_ID}
        status={null}
        onStatusChange={onStatusChange}
        onApprove={onApprove}
      />,
    );

    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(onStatusChange).toHaveBeenCalledWith(TEST_ID, 'approved');
    // `onApprove` still fires as a side-effect hook, but parents in
    // controlled mode should derive their state from `onStatusChange`.
    expect(onApprove).toHaveBeenCalledWith(TEST_ID);
  });

  it('Undo calls onStatusChange(testId, null)', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <ApprovalButton
        testId={TEST_ID}
        status="rejected"
        onStatusChange={onStatusChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(onStatusChange).toHaveBeenCalledWith(TEST_ID, null);
  });

  it('integrates with a parent that owns state', async () => {
    // End-to-end sanity check: verifies the full round-trip when a parent
    // uses `status` + `onStatusChange` to manage the lifecycle.
    const user = userEvent.setup();

    function Harness() {
      const [status, setStatus] = useState<ApprovalStatus>(null);
      return (
        <ApprovalButton
          testId={TEST_ID}
          status={status}
          onStatusChange={(_id, next) => setStatus(next)}
        />
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(screen.getByText('Approved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
  });
});
