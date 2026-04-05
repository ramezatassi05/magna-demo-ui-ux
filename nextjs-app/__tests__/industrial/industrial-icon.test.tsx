/**
 * IndustrialIcon tests.
 *
 * Verifies the icon wrapper enforces consistent size/stroke, maps tones
 * to design tokens, and handles decorative vs. labelled accessibility
 * correctly.
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { IndustrialIcon } from '@/components/industrial/industrial-icon';

describe('IndustrialIcon', () => {
  it('renders the lucide icon resolved from the semantic alias', () => {
    const { container } = render(<IndustrialIcon name="Safety" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies md (16px) size by default', () => {
    const { container } = render(<IndustrialIcon name="Warning" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('respects size prop (xs → 12, lg → 20)', () => {
    const { container: xs } = render(<IndustrialIcon name="Critical" size="xs" />);
    expect(xs.querySelector('svg')).toHaveAttribute('width', '12');

    const { container: lg } = render(<IndustrialIcon name="Override" size="lg" />);
    expect(lg.querySelector('svg')).toHaveAttribute('width', '20');
  });

  it('applies stroke-width 2 consistently', () => {
    const { container } = render(<IndustrialIcon name="Trace" />);
    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '2');
  });

  it('applies tone-specific classes', () => {
    const { container: critical } = render(
      <IndustrialIcon name="Critical" tone="critical" />,
    );
    expect(critical.querySelector('svg')).toHaveClass('text-state-critical');

    const { container: override } = render(
      <IndustrialIcon name="Override" tone="override" />,
    );
    expect(override.querySelector('svg')).toHaveClass('text-state-override');
  });

  it('marks decorative icons aria-hidden', () => {
    const { container } = render(<IndustrialIcon name="Safety" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies role=img with aria-label when decorative=false', () => {
    const { container } = render(
      <IndustrialIcon name="Warning" decorative={false} aria-label="Sensor warning" />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Sensor warning');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });
});
