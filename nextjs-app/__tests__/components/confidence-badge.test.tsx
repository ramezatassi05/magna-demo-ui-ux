/**
 * ConfidenceBadge tests.
 *
 * Verifies both explicit `level` rendering and the `score → level` derivation
 * through `lib/aggregations.ts → confidenceLevel()`. Thresholds used by the
 * helper: ≥ 0.85 = high, ≥ 0.65 = medium, else low.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ConfidenceBadge } from '@/components/confidence-badge';

describe('ConfidenceBadge', () => {
  describe('explicit level', () => {
    it('renders high variant with green classes and CheckCircle icon', () => {
      const { container } = render(<ConfidenceBadge level="high" />);
      const pill = screen.getByText('High').closest('span')?.parentElement;
      expect(pill).toHaveClass('bg-status-pass/10', 'text-status-pass');
      // lucide-react icons are rendered as SVG
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders medium variant with warning/amber classes', () => {
      render(<ConfidenceBadge level="medium" />);
      const pill = screen.getByText('Medium').closest('span')?.parentElement;
      expect(pill).toHaveClass('bg-status-warning/10', 'text-status-warning');
    });

    it('renders low variant with fail/red classes', () => {
      render(<ConfidenceBadge level="low" />);
      const pill = screen.getByText('Low').closest('span')?.parentElement;
      expect(pill).toHaveClass('bg-status-fail/10', 'text-status-fail');
    });
  });

  describe('score → level derivation', () => {
    it('maps score 0.95 to high', () => {
      render(<ConfidenceBadge score={0.95} />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('maps score 0.85 (threshold) to high', () => {
      render(<ConfidenceBadge score={0.85} />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('maps score 0.7 to medium', () => {
      render(<ConfidenceBadge score={0.7} />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('maps score 0.65 (threshold) to medium', () => {
      render(<ConfidenceBadge score={0.65} />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('maps score 0.4 to low', () => {
      render(<ConfidenceBadge score={0.4} />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('defaults to low when neither score nor level is provided', () => {
      render(<ConfidenceBadge />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('display options', () => {
    it('renders the score percentage when showScore is true', () => {
      render(<ConfidenceBadge score={0.94} showScore />);
      // label + percentage rendered as adjacent inline text
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('94')).toBeInTheDocument();
    });

    it('does NOT render score text when showScore is false (default)', () => {
      render(<ConfidenceBadge score={0.94} />);
      expect(screen.queryByText('94')).not.toBeInTheDocument();
    });

    it('omits the icon when showIcon is false', () => {
      const { container } = render(
        <ConfidenceBadge level="high" showIcon={false} />,
      );
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('applies smaller size classes when size is "sm"', () => {
      render(<ConfidenceBadge level="high" size="sm" />);
      const pill = screen.getByText('High').closest('span')?.parentElement;
      expect(pill).toHaveClass('h-5', 'text-[10px]');
    });

    it('sets a title tooltip with the score percentage', () => {
      render(<ConfidenceBadge score={0.873} />);
      const pill = screen.getByText('High').closest('span')?.parentElement;
      expect(pill).toHaveAttribute('title', 'Confidence 87.3%');
    });
  });
});
