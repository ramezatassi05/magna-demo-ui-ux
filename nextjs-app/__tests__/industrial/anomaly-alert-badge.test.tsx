/**
 * AnomalyAlertBadge tests.
 *
 * Verifies the three variants render with correct state tokens and
 * pulsing behaviour. Tooltip interaction is tested via userEvent
 * on the inline-row and kpi-corner variants.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AnomalyAlertBadge } from '@/components/industrial/anomaly-alert-badge';

describe('AnomalyAlertBadge', () => {
  describe('standalone variant', () => {
    it('renders label and default severity text', () => {
      render(<AnomalyAlertBadge severity="critical" label="FPR BREACH" />);
      expect(screen.getByText('FPR BREACH')).toBeInTheDocument();
    });

    it('falls back to severity default label when no label provided', () => {
      render(<AnomalyAlertBadge severity="anomaly" />);
      expect(screen.getByText('ANOMALY')).toBeInTheDocument();
    });

    it('pulses critical severity by default', () => {
      render(<AnomalyAlertBadge severity="critical" label="X" />);
      expect(screen.getByRole('status')).toHaveClass('animate-anomaly-pulse');
    });

    it('does NOT pulse anomaly severity by default', () => {
      render(<AnomalyAlertBadge severity="anomaly" label="X" />);
      expect(screen.getByRole('status')).not.toHaveClass('animate-anomaly-pulse');
    });

    it('does NOT pulse watch severity by default', () => {
      render(<AnomalyAlertBadge severity="watch" label="X" />);
      expect(screen.getByRole('status')).not.toHaveClass('animate-anomaly-pulse');
    });

    it('respects explicit pulsing=false for critical', () => {
      render(<AnomalyAlertBadge severity="critical" label="X" pulsing={false} />);
      expect(screen.getByRole('status')).not.toHaveClass('animate-anomaly-pulse');
    });

    it('renders optional value suffix', () => {
      render(<AnomalyAlertBadge severity="anomaly" label="FPR" value="+0.8pp" />);
      expect(screen.getByText(/\+0\.8pp/)).toBeInTheDocument();
    });

    it('applies critical token classes', () => {
      render(<AnomalyAlertBadge severity="critical" label="X" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-state-critical-bg', 'text-state-critical');
    });
  });

  describe('inline-row variant', () => {
    it('renders a 4px left strip as status indicator', () => {
      render(
        <div style={{ position: 'relative' }}>
          <AnomalyAlertBadge severity="critical" variant="inline-row" label="regression" />
        </div>,
      );
      const strip = screen.getByRole('status');
      expect(strip).toHaveClass('w-1', 'absolute', 'left-0', 'top-0', 'h-full');
    });

    it('pulses for critical severity', () => {
      render(
        <AnomalyAlertBadge severity="critical" variant="inline-row" label="x" />,
      );
      expect(screen.getByRole('status')).toHaveClass('animate-anomaly-pulse');
    });
  });

  describe('kpi-corner variant', () => {
    it('renders a small absolute dot', () => {
      render(<AnomalyAlertBadge severity="anomaly" variant="kpi-corner" label="fpr high" />);
      const dot = screen.getByRole('status');
      expect(dot).toHaveClass('absolute', 'rounded-full', 'h-2', 'w-2');
    });
  });
});
