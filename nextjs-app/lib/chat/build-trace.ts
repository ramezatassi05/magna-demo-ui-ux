/**
 * build-trace — interleave agent thinking + tool calls into a reasoning tree.
 *
 * Upstream (hooks/use-agent-chat.ts) folds SSE events into two append-only
 * arrays on each assistant message: `thinking: string[]` and `toolCalls: ToolCall[]`.
 * Neither carries a shared index or timestamp, so we approximate stream
 * interleaving with a zipper-merge: thinking[i] → toolCall[i] → thinking[i+1]…
 *
 * Each tool step owns its result preview as a nested "finding" child — this
 * gives the DecisionTrace (Phase D) a real tree, not a flat list.
 */

import type { ToolCall } from '@/lib/types';

export type TraceStepKind = 'reasoning' | 'tool' | 'finding';

export interface TraceStep {
  id: string;
  kind: TraceStepKind;
  label: string;
  toolName?: string;
  status?: 'running' | 'ok' | 'error';
  timestampMs?: number;
  children?: TraceStep[];
}

/**
 * Zipper-merge thinking + toolCalls into a flat ordered list where each
 * tool step holds its preview as a nested finding child.
 */
export function buildTrace(
  thinking: string[],
  toolCalls: ToolCall[],
): TraceStep[] {
  const steps: TraceStep[] = [];
  const max = Math.max(thinking.length, toolCalls.length);

  for (let i = 0; i < max; i += 1) {
    const reasoning = thinking[i];
    if (reasoning !== undefined) {
      steps.push({
        id: `reasoning-${i}`,
        kind: 'reasoning',
        label: reasoning,
      });
    }
    const tc = toolCalls[i];
    if (tc !== undefined) {
      const step: TraceStep = {
        id: `tool-${tc.id}`,
        kind: 'tool',
        label: tc.name,
        toolName: tc.name,
        status: tc.status,
      };
      if (tc.preview && tc.preview.length > 0) {
        step.children = [
          {
            id: `finding-${tc.id}`,
            kind: 'finding',
            label: tc.preview,
          },
        ];
      }
      steps.push(step);
    }
  }

  return steps;
}
