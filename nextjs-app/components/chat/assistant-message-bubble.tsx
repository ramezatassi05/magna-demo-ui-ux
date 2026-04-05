'use client';

import type { UiAssistantMessage } from '@/hooks/use-agent-chat';
import type { ToolCall } from '@/lib/types';
import { DecisionTrace } from '@/components/industrial/decision-trace';
import {
  WhyPopover,
  type RationaleDataPoint,
} from '@/components/industrial/why-popover';
import { AttachmentRenderer } from './attachment-renderer';
import { MarkdownText } from './markdown-text';

interface AssistantMessageBubbleProps {
  message: UiAssistantMessage;
  /** True if this is the last assistant message AND streaming is active. */
  isActive: boolean;
}

/**
 * Left-aligned agent bubble. Renders, in arrival order:
 *   1. DecisionTrace — reasoning tree with tool calls nested as children
 *   2. Markdown text body
 *   3. Attachments (chart / table / test_cases)
 *   4. InlineError (stream-level error from backend)
 *   5. DoneMeta footer + optional WhyPopover (when tool evidence is present)
 */
export function AssistantMessageBubble({
  message,
  isActive,
}: AssistantMessageBubbleProps) {
  // Show the trace whenever there's reasoning, tool calls, OR the agent
  // is actively streaming an empty bubble (pre-tool "thinking" ticks).
  const showTrace =
    message.thinking.length > 0 ||
    message.toolCalls.length > 0 ||
    (isActive && message.text.length === 0);

  const whyDataPoints = extractEvidence(message.toolCalls);

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {showTrace && (
        <DecisionTrace
          thinking={message.thinking}
          toolCalls={message.toolCalls}
          active={isActive}
        />
      )}

      {message.text && (
        <div className="rounded-lg bg-surface-elevated px-3 py-2.5 text-[13px] leading-relaxed text-ink-on-dark">
          <MarkdownText content={message.text} />
        </div>
      )}

      {message.attachments.map((att, i) => (
        <AttachmentRenderer key={i} attachment={att} />
      ))}

      {message.errored && (
        <div className="rounded-lg border border-status-fail/30 bg-status-fail/10 px-3 py-2 text-[12px] text-status-fail">
          {message.errored.message}
        </div>
      )}

      {(message.doneMeta || whyDataPoints) && (
        <div className="flex items-center justify-between gap-2">
          {message.doneMeta ? (
            <div className="font-mono text-[10px] text-ink-muted">
              {message.doneMeta.tool_calls} tool call
              {message.doneMeta.tool_calls === 1 ? '' : 's'} ·{' '}
              {(message.doneMeta.duration_ms / 1000).toFixed(1)}s
            </div>
          ) : (
            <span />
          )}
          {whyDataPoints && (
            <WhyPopover
              title="Why this answer?"
              subtitle="Derived from last tool result"
              dataPoints={whyDataPoints}
              align="end"
              side="top"
              triggerAriaLabel="Show answer rationale"
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Best-effort evidence extraction from the last tool call's preview string.
 * Returns up to 5 scalar fields from a parsed JSON object. If the preview
 * isn't structured JSON, returns null (no WhyPopover rendered).
 */
function extractEvidence(
  toolCalls: ToolCall[],
): RationaleDataPoint[] | null {
  const last = toolCalls[toolCalls.length - 1];
  if (!last?.preview) return null;
  try {
    const parsed: unknown = JSON.parse(last.preview);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      .slice(0, 5);
    if (entries.length === 0) return null;
    return entries.map(([k, v], i) => ({
      label: k,
      value: typeof v === 'boolean' ? String(v) : (v as string | number),
      weight: i === 0 ? 'primary' : 'secondary',
    }));
  } catch {
    return null;
  }
}
