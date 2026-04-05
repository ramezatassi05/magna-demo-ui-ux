/**
 * DynamicTaskCard tests.
 *
 * Verifies severity-based styling, rationale WhyPopover, action link
 * href construction, and the critical-severity pulse animation.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DynamicTaskCard } from '@/components/industrial/dynamic-task-card';
import type { OperationalTask } from '@/lib/operations';

const baseTask: OperationalTask = {
  id: 't1',
  severity: 'critical',
  title: 'Thermal AEB fail rate spiked 8.4%',
  metric: '12 failures · 24h',
  context: 'Normally 2-3/day',
  filterLink: { sensor_type: 'thermal', feature: 'AEB', result: 'fail' },
  actionLabel: 'Inspect failures',
  rationale: [
    { label: 'Fail count', value: 12, weight: 'primary', tone: 'critical' },
    { label: 'Baseline', value: '2.3/day' },
  ],
};

describe('DynamicTaskCard', () => {
  it('renders title, metric, and context', () => {
    render(<DynamicTaskCard task={baseTask} />);
    expect(
      screen.getByText(/thermal aeb fail rate spiked/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/12 failures · 24h/i)).toBeInTheDocument();
    expect(screen.getByText(/normally 2-3\/day/i)).toBeInTheDocument();
  });

  it('critical severity applies pulse animation on the accent bar', () => {
    const { container } = render(<DynamicTaskCard task={baseTask} />);
    // Accent bar is the absolutely-positioned span with bg-state-critical
    const bar = container.querySelector('.bg-state-critical');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveClass('animate-anomaly-pulse');
  });

  it('non-critical severity does NOT pulse', () => {
    const { container } = render(
      <DynamicTaskCard task={{ ...baseTask, severity: 'anomaly' }} />,
    );
    const bar = container.querySelector('.bg-state-anomaly');
    expect(bar).toBeInTheDocument();
    expect(bar).not.toHaveClass('animate-anomaly-pulse');
  });

  it('uses correct accent color per severity', () => {
    const { container: critical } = render(
      <DynamicTaskCard task={{ ...baseTask, severity: 'critical' }} />,
    );
    expect(critical.querySelector('.bg-state-critical')).toBeInTheDocument();

    const { container: anomaly } = render(
      <DynamicTaskCard task={{ ...baseTask, severity: 'anomaly' }} />,
    );
    expect(anomaly.querySelector('.bg-state-anomaly')).toBeInTheDocument();

    const { container: watch } = render(
      <DynamicTaskCard task={{ ...baseTask, severity: 'watch' }} />,
    );
    expect(watch.querySelector('.bg-status-info')).toBeInTheDocument();

    const { container: nominal } = render(
      <DynamicTaskCard task={{ ...baseTask, severity: 'nominal' }} />,
    );
    expect(nominal.querySelector('.bg-state-nominal')).toBeInTheDocument();
  });

  it('shows WhyPopover trigger when rationale is present', () => {
    render(<DynamicTaskCard task={baseTask} />);
    expect(
      screen.getByRole('button', { name: /show rationale/i }),
    ).toBeInTheDocument();
  });

  it('omits WhyPopover trigger when rationale is absent', () => {
    render(
      <DynamicTaskCard task={{ ...baseTask, rationale: undefined }} />,
    );
    expect(
      screen.queryByRole('button', { name: /show rationale/i }),
    ).not.toBeInTheDocument();
  });

  it('opens WhyPopover with rationale datapoints on click', async () => {
    const user = userEvent.setup();
    render(<DynamicTaskCard task={baseTask} />);

    await user.click(screen.getByRole('button', { name: /show rationale/i }));

    expect(await screen.findByText(/why this task\?/i)).toBeInTheDocument();
    expect(screen.getByText(/fail count/i)).toBeInTheDocument();
    expect(screen.getByText(/baseline/i)).toBeInTheDocument();
  });

  it('action link builds /results href from filterLink', () => {
    render(<DynamicTaskCard task={baseTask} />);
    const link = screen.getByRole('link', { name: /inspect failures/i });
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/results?');
    expect(href).toContain('sensor_type=thermal');
    expect(href).toContain('feature=AEB');
    expect(href).toContain('result=fail');
  });

  it('omits action link when filterLink is absent', () => {
    render(<DynamicTaskCard task={{ ...baseTask, filterLink: undefined }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('uses default "Inspect" label when actionLabel missing', () => {
    render(<DynamicTaskCard task={{ ...baseTask, actionLabel: undefined }} />);
    expect(screen.getByRole('link', { name: /inspect/i })).toBeInTheDocument();
  });
});
