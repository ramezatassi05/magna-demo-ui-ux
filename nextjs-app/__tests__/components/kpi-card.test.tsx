/**
 * KpiCard component tests.
 *
 * Covers: label/value/unit rendering, the trend indicator's sign & coloring,
 * inverted-trend metrics (rising FPR is bad), the loading skeleton path, and
 * the per-accent left-border color class. `matchMedia` is stubbed in
 * vitest.setup.ts to force the count-up hook's reduced-motion branch, so the
 * final number is in the DOM synchronously.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Activity } from 'lucide-react';

import { KpiCard } from '@/components/kpi-card';

describe('KpiCard', () => {
  it('renders label, value, and unit', () => {
    render(
      <KpiCard label="Total Tests" value={1234} unit="runs" accentColor="magna" />,
    );

    // label is styled uppercase via CSS, DOM content is as-written
    expect(screen.getByText('Total Tests')).toBeInTheDocument();
    // value formatted with `en-US` grouping
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('runs')).toBeInTheDocument();
  });

  it('renders with decimals and unit for percentages', () => {
    render(
      <KpiCard
        label="Pass Rate"
        value={78.4}
        unit="%"
        accentColor="pass"
        decimals={1}
      />,
    );
    expect(screen.getByText('78.4')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('shows positive trend in pass-green when trend > 0', () => {
    render(
      <KpiCard
        label="Pass Rate"
        value={82}
        trend={2.3}
        accentColor="pass"
        decimals={1}
      />,
    );
    const trendText = screen.getByText('+2.3');
    const trendRow = trendText.closest('div');
    expect(trendRow).toHaveClass('text-status-pass');
    expect(screen.getByText('vs prior 7d')).toBeInTheDocument();
  });

  it('shows negative trend in fail-red when trend < 0', () => {
    render(
      <KpiCard label="Pass Rate" value={82} trend={-1.5} accentColor="pass" />,
    );
    const trendText = screen.getByText('-1.5');
    const trendRow = trendText.closest('div');
    expect(trendRow).toHaveClass('text-status-fail');
  });

  it('inverts trend coloring when invertTrend is true (rising FPR is bad)', () => {
    // False-positive rate going UP should be shown in RED, not green.
    render(
      <KpiCard
        label="False Positive Rate"
        value={1.8}
        trend={0.3}
        accentColor="warning"
        invertTrend
      />,
    );
    const trendText = screen.getByText('+0.3');
    const trendRow = trendText.closest('div');
    expect(trendRow).toHaveClass('text-status-fail');
    expect(trendRow).not.toHaveClass('text-status-pass');
  });

  it('does not render trend row when trend is undefined', () => {
    render(<KpiCard label="Count" value={42} accentColor="info" />);
    expect(screen.queryByText(/vs prior 7d/)).not.toBeInTheDocument();
  });

  it('renders loading skeletons instead of value', () => {
    const { container } = render(
      <KpiCard label="Loading" value={1234} accentColor="magna" loading />,
    );
    expect(screen.queryByText('1,234')).not.toBeInTheDocument();
    // 2 skeletons: one for the value, one for the trend line — identified
    // via the shared `.skeleton-shimmer` class applied by components/skeleton.tsx.
    const skeletons = container.querySelectorAll('.skeleton-shimmer');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('applies the correct left-border accent class per variant', () => {
    const variants = [
      { accent: 'pass', cls: 'border-l-status-pass' },
      { accent: 'fail', cls: 'border-l-status-fail' },
      { accent: 'warning', cls: 'border-l-status-warning' },
      { accent: 'info', cls: 'border-l-status-info' },
      { accent: 'magna', cls: 'border-l-magna-red' },
    ] as const;

    for (const { accent, cls } of variants) {
      const { container, unmount } = render(
        <KpiCard label="X" value={1} accentColor={accent} />,
      );
      // The outermost div of the card carries the border class
      expect(container.firstChild).toHaveClass(cls);
      unmount();
    }
  });

  it('renders optional icon when provided', () => {
    const { container } = render(
      <KpiCard label="With Icon" value={10} accentColor="info" icon={Activity} />,
    );
    // Lucide icons render as SVGs with aria-hidden
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeInTheDocument();
  });

  it('has no axe-detectable accessibility violations', async () => {
    const { container } = render(
      <KpiCard
        label="Pass Rate"
        value={78.4}
        unit="%"
        trend={2.3}
        accentColor="pass"
        decimals={1}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Silence unused warning for vi in files that don't use spies directly.
void vi;
