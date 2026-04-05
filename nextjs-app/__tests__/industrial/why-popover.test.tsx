/**
 * WhyPopover tests.
 *
 * Verifies the default trigger renders correctly, the popover opens on
 * click, and structured content (dataPoints, logic, rationale) renders
 * in the expected sections. Empty-state copy appears when no content.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WhyPopover } from '@/components/industrial/why-popover';

describe('WhyPopover', () => {
  it('renders the default "Why" trigger', () => {
    render(<WhyPopover title="Why this failed" />);
    expect(screen.getByRole('button', { name: /show rationale/i })).toBeInTheDocument();
    expect(screen.getByText('Why')).toBeInTheDocument();
  });

  it('uses custom aria label when provided', () => {
    render(<WhyPopover title="x" triggerAriaLabel="Explain score" />);
    expect(screen.getByRole('button', { name: 'Explain score' })).toBeInTheDocument();
  });

  it('opens popover on trigger click and shows title', async () => {
    const user = userEvent.setup();
    render(<WhyPopover title="Why confidence: Medium" subtitle="sensor fusion heuristic" />);
    await user.click(screen.getByRole('button', { name: /show rationale/i }));
    expect(await screen.findByText('Why confidence: Medium')).toBeInTheDocument();
    expect(screen.getByText('sensor fusion heuristic')).toBeInTheDocument();
  });

  it('renders structured dataPoints in Key evidence section', async () => {
    const user = userEvent.setup();
    render(
      <WhyPopover
        title="Why"
        dataPoints={[
          { label: 'FPR', value: '4.2%', weight: 'primary', tone: 'critical' },
          { label: 'Range', value: '42m', weight: 'secondary' },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /show rationale/i }));
    expect(await screen.findByText('Key evidence')).toBeInTheDocument();
    expect(screen.getByText('FPR:')).toBeInTheDocument();
    expect(screen.getByText('4.2%')).toBeInTheDocument();
    expect(screen.getByText('Range:')).toBeInTheDocument();
  });

  it('renders logic bullets in Decision logic section', async () => {
    const user = userEvent.setup();
    render(
      <WhyPopover
        title="x"
        logic={['confidence below 0.7 threshold', 'scenario tagged rain + night']}
      />,
    );
    await user.click(screen.getByRole('button', { name: /show rationale/i }));
    expect(await screen.findByText('Decision logic')).toBeInTheDocument();
    expect(screen.getByText(/confidence below 0\.7 threshold/)).toBeInTheDocument();
    expect(screen.getByText(/scenario tagged rain \+ night/)).toBeInTheDocument();
  });

  it('renders free-form rationale section', async () => {
    const user = userEvent.setup();
    render(<WhyPopover title="x" rationale="The thermal sensor degrades at long range in rain." />);
    await user.click(screen.getByRole('button', { name: /show rationale/i }));
    expect(await screen.findByText('Rationale')).toBeInTheDocument();
    expect(
      screen.getByText(/thermal sensor degrades at long range/),
    ).toBeInTheDocument();
  });

  it('shows empty-state copy when no content provided', async () => {
    const user = userEvent.setup();
    render(<WhyPopover title="Why" />);
    await user.click(screen.getByRole('button', { name: /show rationale/i }));
    expect(
      await screen.findByText(/No rationale recorded/i),
    ).toBeInTheDocument();
  });
});
