/**
 * build-trace.ts — reasoning-tree zipper-merge tests.
 */

import { describe, expect, it } from 'vitest';

import { buildTrace } from '@/lib/chat/build-trace';
import type { ToolCall } from '@/lib/types';

function tc(
  id: string,
  overrides: Partial<ToolCall> = {},
): ToolCall {
  return {
    id,
    name: 'query_tests',
    args: {},
    status: 'ok',
    ...overrides,
  };
}

describe('buildTrace', () => {
  it('returns empty array for empty inputs', () => {
    expect(buildTrace([], [])).toEqual([]);
  });

  it('emits all reasoning steps when only thinking present', () => {
    const steps = buildTrace(['Analyzing request', 'Choosing tool'], []);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ kind: 'reasoning', label: 'Analyzing request' });
    expect(steps[1]).toMatchObject({ kind: 'reasoning', label: 'Choosing tool' });
  });

  it('emits tool steps when only toolCalls present', () => {
    const steps = buildTrace([], [tc('a'), tc('b')]);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.kind).toBe('tool');
    expect(steps[1]!.kind).toBe('tool');
  });

  it('nests preview as finding child under a tool step', () => {
    const steps = buildTrace([], [tc('a', { preview: '12 rows returned' })]);
    expect(steps[0]!.kind).toBe('tool');
    expect(steps[0]!.children).toHaveLength(1);
    expect(steps[0]!.children?.[0]).toMatchObject({
      kind: 'finding',
      label: '12 rows returned',
    });
  });

  it('omits children when preview is empty/absent', () => {
    const steps = buildTrace([], [tc('a', { preview: '' }), tc('b')]);
    expect(steps[0]!.children).toBeUndefined();
    expect(steps[1]!.children).toBeUndefined();
  });

  it('zipper-merges in alternating order', () => {
    const steps = buildTrace(
      ['think-1', 'think-2'],
      [tc('t-1'), tc('t-2')],
    );
    expect(steps.map((s) => s.kind)).toEqual([
      'reasoning',
      'tool',
      'reasoning',
      'tool',
    ]);
  });

  it('tail-appends excess when arrays differ in length', () => {
    const steps = buildTrace(
      ['think-1', 'think-2', 'think-3'],
      [tc('t-1')],
    );
    // i=0: reasoning + tool; i=1: reasoning (no tool); i=2: reasoning (no tool)
    expect(steps.map((s) => s.kind)).toEqual([
      'reasoning',
      'tool',
      'reasoning',
      'reasoning',
    ]);
  });

  it('propagates tool status to the trace step', () => {
    const steps = buildTrace(
      [],
      [
        tc('a', { status: 'running' }),
        tc('b', { status: 'ok' }),
        tc('c', { status: 'error' }),
      ],
    );
    expect(steps[0]!.status).toBe('running');
    expect(steps[1]!.status).toBe('ok');
    expect(steps[2]!.status).toBe('error');
  });
});
