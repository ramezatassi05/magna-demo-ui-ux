/**
 * ConfidenceMeter tests.
 *
 * Verifies the SVG arc gauge exposes correct ARIA meter semantics,
 * picks the right color level by threshold, and clamps out-of-range
 * scores. Uses `animate={false}` to avoid framer-motion timing in jsdom.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ConfidenceMeter } from '@/components/industrial/confidence-meter';

describe('ConfidenceMeter', () => {
  it('renders with role="meter" and correct aria-valuenow', () => {
    render(<ConfidenceMeter score={0.72} animate={false} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '72');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('sets aria-valuetext with percent and level', () => {
    render(<ConfidenceMeter score={0.9} animate={false} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuetext', '90% — High confidence');
  });

  it('picks high level for scores ≥ 0.85 (green stroke)', () => {
    const { container } = render(<ConfidenceMeter score={0.9} animate={false} />);
    const fill = container.querySelectorAll('path')[1]; // track is [0], fill is [1]
    expect(fill).toHaveClass('stroke-status-pass');
  });

  it('picks medium level for 0.65 ≤ scores < 0.85 (amber stroke)', () => {
    const { container } = render(<ConfidenceMeter score={0.7} animate={false} />);
    const fill = container.querySelectorAll('path')[1];
    expect(fill).toHaveClass('stroke-status-warning');
  });

  it('picks low level for scores < 0.65 (red stroke)', () => {
    const { container } = render(<ConfidenceMeter score={0.4} animate={false} />);
    const fill = container.querySelectorAll('path')[1];
    expect(fill).toHaveClass('stroke-status-fail');
  });

  it('clamps score > 1 to 100%', () => {
    render(<ConfidenceMeter score={1.5} animate={false} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps negative score to 0%', () => {
    render(<ConfidenceMeter score={-0.3} animate={false} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders optional label below the arc', () => {
    render(
      <ConfidenceMeter score={0.8} label="Detection confidence" animate={false} />,
    );
    expect(screen.getByText('Detection confidence')).toBeInTheDocument();
  });

  it('hides value number when showValue=false', () => {
    const { container } = render(
      <ConfidenceMeter score={0.75} showValue={false} animate={false} />,
    );
    // value is 75% — should not be rendered inside the arc
    expect(container.textContent).not.toMatch(/75/);
  });

  it('respects custom thresholds', () => {
    // With thresholds { high: 0.5, medium: 0.3 }, 0.6 is high.
    const { container } = render(
      <ConfidenceMeter
        score={0.6}
        thresholds={{ high: 0.5, medium: 0.3 }}
        animate={false}
      />,
    );
    const fill = container.querySelectorAll('path')[1];
    expect(fill).toHaveClass('stroke-status-pass');
  });
});
