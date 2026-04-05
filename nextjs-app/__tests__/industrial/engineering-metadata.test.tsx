/**
 * EngineeringMetadata tests.
 *
 * Verifies the metadata strip renders labels/values in the correct
 * order, separator dots between items, and tone classes on values.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { EngineeringMetadata } from '@/components/industrial/engineering-metadata';

describe('EngineeringMetadata', () => {
  it('renders nothing for empty items', () => {
    const { container } = render(<EngineeringMetadata items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders label: value pairs', () => {
    render(
      <EngineeringMetadata
        items={[
          { label: 'run', value: 'TC-42' },
          { label: 'duration', value: '180ms' },
        ]}
      />,
    );
    expect(screen.getByText('run')).toBeInTheDocument();
    expect(screen.getByText('TC-42')).toBeInTheDocument();
    expect(screen.getByText('duration')).toBeInTheDocument();
    expect(screen.getByText('180ms')).toBeInTheDocument();
  });

  it('inserts middle-dot separators between items', () => {
    const { container } = render(
      <EngineeringMetadata
        items={[
          { label: 'a', value: '1' },
          { label: 'b', value: '2' },
          { label: 'c', value: '3' },
        ]}
      />,
    );
    // 2 separators between 3 items
    const dots = container.querySelectorAll('[aria-hidden="true"]');
    expect(dots.length).toBe(2);
    dots.forEach((dot) => expect(dot.textContent).toBe('·'));
  });

  it('omits label prefix when valueOnly=true', () => {
    render(
      <EngineeringMetadata
        items={[{ label: 'ID', value: 'ABC-123', valueOnly: true }]}
      />,
    );
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.queryByText('ID')).not.toBeInTheDocument();
  });

  it('applies override tone class', () => {
    render(
      <EngineeringMetadata
        items={[{ label: 'mode', value: 'SIMULATED', tone: 'override' }]}
      />,
    );
    // the outer span per item carries the tone class
    const valueSpan = screen.getByText('SIMULATED').closest('span');
    expect(valueSpan?.parentElement).toHaveClass('text-state-override');
  });

  it('applies nominal tone class', () => {
    render(
      <EngineeringMetadata
        items={[{ label: 'status', value: 'OK', tone: 'nominal' }]}
      />,
    );
    const valueSpan = screen.getByText('OK').closest('span');
    expect(valueSpan?.parentElement).toHaveClass('text-state-nominal');
  });

  it('uses mono font + uppercase tracking at the container level', () => {
    const { container } = render(
      <EngineeringMetadata items={[{ label: 'x', value: '1' }]} />,
    );
    expect(container.firstChild).toHaveClass('font-mono', 'uppercase');
  });
});
