/**
 * ManualOverrideControl tests.
 *
 * Verifies Stop visibility by status, AlertDialog confirmation flow,
 * Scope injection popover, Override-recommendation popover, and the
 * aria-live announce region.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ManualOverrideControl } from '@/components/industrial/manual-override-control';

describe('ManualOverrideControl', () => {
  it('Stop button is hidden when status is idle', () => {
    render(<ManualOverrideControl status="idle" onStop={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /stop agent/i }),
    ).not.toBeInTheDocument();
  });

  it('Stop button is visible when status is streaming', () => {
    render(<ManualOverrideControl status="streaming" onStop={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /stop agent/i }),
    ).toBeInTheDocument();
  });

  it('clicking Stop opens AlertDialog and confirming calls onStop', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<ManualOverrideControl status="streaming" onStop={onStop} />);

    await user.click(screen.getByRole('button', { name: /stop agent/i }));
    expect(
      await screen.findByText(/stop agent mid-run\?/i),
    ).toBeInTheDocument();

    // There are now two "Stop agent" buttons: the trigger AND the dialog action.
    // Click the one inside the dialog (AlertDialogAction).
    const dialogActions = screen.getAllByRole('button', {
      name: /stop agent/i,
    });
    const dialogAction = dialogActions[dialogActions.length - 1]!;
    await user.click(dialogAction);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('clicking Cancel in the dialog does NOT call onStop', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<ManualOverrideControl status="streaming" onStop={onStop} />);

    await user.click(screen.getByRole('button', { name: /stop agent/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onStop).not.toHaveBeenCalled();
  });

  it('scope popover submit calls onInjectFilter with typed value', async () => {
    const user = userEvent.setup();
    const onInjectFilter = vi.fn();
    render(
      <ManualOverrideControl
        status="idle"
        onStop={vi.fn()}
        onInjectFilter={onInjectFilter}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^scope$/i }));
    const input = await screen.findByLabelText(
      /inject scope into next message/i,
    );
    await user.type(input, 'thermal night fails');
    await user.click(screen.getByRole('button', { name: /^apply$/i }));

    expect(onInjectFilter).toHaveBeenCalledWith('thermal night fails');
  });

  it('Override button is hidden when no lastRecommendation', () => {
    render(<ManualOverrideControl status="idle" onStop={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /^override$/i }),
    ).not.toBeInTheDocument();
  });

  it('Override button is visible when lastRecommendation set', () => {
    render(
      <ManualOverrideControl
        status="idle"
        onStop={vi.fn()}
        lastRecommendation={{ id: 'r1', summary: 'Re-run thermal suite' }}
      />,
    );
    expect(
      screen.getByRole('button', { name: /^override$/i }),
    ).toBeInTheDocument();
  });

  it('Override Reject calls onOverrideRecommendation', async () => {
    const user = userEvent.setup();
    const onOverrideRecommendation = vi.fn();
    render(
      <ManualOverrideControl
        status="idle"
        onStop={vi.fn()}
        onOverrideRecommendation={onOverrideRecommendation}
        lastRecommendation={{ id: 'r1', summary: 'Re-run thermal suite' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^override$/i }));
    expect(
      await screen.findByText(/re-run thermal suite/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^reject$/i }));

    expect(onOverrideRecommendation).toHaveBeenCalledTimes(1);
  });

  it('has an aria-live polite status region', () => {
    render(<ManualOverrideControl status="idle" onStop={vi.fn()} />);
    const regions = screen.getAllByRole('status');
    // At least one should be aria-live="polite"
    expect(
      regions.some((r) => r.getAttribute('aria-live') === 'polite'),
    ).toBe(true);
  });
});
