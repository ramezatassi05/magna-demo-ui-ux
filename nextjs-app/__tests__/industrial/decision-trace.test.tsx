/**
 * DecisionTrace tests.
 *
 * Verifies tree semantics, tool-icon mapping, collapse/expand via
 * keyboard, and fallback to ThinkingIndicator when no tool calls.
 */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DecisionTrace } from '@/components/industrial/decision-trace';
import type { ToolCall } from '@/lib/types';

const withPreview: ToolCall[] = [
  {
    id: 'tc-1',
    name: 'query_tests',
    args: { sensor_type: 'thermal' },
    status: 'ok',
    preview: 'Returned 12 rows',
  },
  {
    id: 'tc-2',
    name: 'summarize_results',
    args: {},
    status: 'ok',
    preview: 'Pass rate 84%',
  },
];

describe('DecisionTrace', () => {
  it('falls back to ThinkingIndicator when toolCalls is empty', () => {
    render(
      <DecisionTrace
        thinking={['Analyzing request']}
        toolCalls={[]}
        active={true}
      />,
    );
    // ThinkingIndicator renders a "Thinking · step 1" label, no tree role.
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.getByText(/thinking · step 1/i)).toBeInTheDocument();
  });

  it('renders a tree with role="tree" when toolCalls present', () => {
    render(
      <DecisionTrace
        thinking={['Analyzing request']}
        toolCalls={withPreview}
        active={false}
      />,
    );
    expect(
      screen.getByRole('tree', { name: /agent reasoning/i }),
    ).toBeInTheDocument();
  });

  it('renders treeitems for each step and its findings', () => {
    render(
      <DecisionTrace
        thinking={['step 1', 'step 2']}
        toolCalls={withPreview}
        active={false}
      />,
    );
    const items = screen.getAllByRole('treeitem');
    // 2 reasoning + 2 tools + 2 findings = 6
    expect(items.length).toBe(6);
  });

  it('tool step labels use human-readable names', () => {
    render(
      <DecisionTrace
        thinking={[]}
        toolCalls={withPreview}
        active={false}
      />,
    );
    expect(screen.getByText(/query tests/i)).toBeInTheDocument();
    expect(screen.getByText(/summarize results/i)).toBeInTheDocument();
  });

  it('error-status tool shows "error" suffix', () => {
    const errorCall: ToolCall[] = [
      {
        id: 'tc-err',
        name: 'query_tests',
        args: {},
        status: 'error',
        preview: 'Bad query',
      },
    ];
    render(
      <DecisionTrace thinking={[]} toolCalls={errorCall} active={false} />,
    );
    expect(screen.getByText(/^error$/i)).toBeInTheDocument();
  });

  it('finding children nest under tool parents (aria-expanded)', () => {
    render(
      <DecisionTrace
        thinking={[]}
        toolCalls={withPreview}
        active={false}
      />,
    );
    // Tool items with findings should have aria-expanded="true" by default
    const items = screen.getAllByRole('treeitem');
    const toolItem = items.find(
      (i) =>
        i.getAttribute('aria-expanded') === 'true' &&
        i.textContent?.includes('Query tests'),
    );
    expect(toolItem).toBeDefined();
  });

  it('header button toggles the whole tree', async () => {
    const user = userEvent.setup();
    render(
      <DecisionTrace
        thinking={[]}
        toolCalls={withPreview}
        active={false}
      />,
    );
    const header = screen.getByRole('button', { name: /reasoning · 4 steps/i });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    await user.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('ArrowLeft on an expanded tool step collapses it', () => {
    render(
      <DecisionTrace
        thinking={[]}
        toolCalls={withPreview}
        active={false}
      />,
    );
    const firstTool = screen.getAllByRole('treeitem')[0]!;

    expect(firstTool).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(firstTool, { key: 'ArrowLeft' });

    // Collapses — finding no longer rendered as child
    expect(firstTool).toHaveAttribute('aria-expanded', 'false');
  });

  it('ArrowRight on a collapsed tool step expands it', () => {
    render(
      <DecisionTrace
        thinking={[]}
        toolCalls={withPreview}
        active={false}
      />,
    );
    const firstTool = screen.getAllByRole('treeitem')[0]!;

    fireEvent.keyDown(firstTool, { key: 'ArrowLeft' });
    expect(firstTool).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(firstTool, { key: 'ArrowRight' });
    expect(firstTool).toHaveAttribute('aria-expanded', 'true');
  });
});
