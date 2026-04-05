'use client';

import type { UiAssistantMessage } from '@/hooks/use-agent-chat';
import { AttachmentRenderer } from './attachment-renderer';
import { MarkdownText } from './markdown-text';
import { ThinkingIndicator } from './thinking-indicator';
import { ToolCallCard } from './tool-call-card';

interface AssistantMessageBubbleProps {
  message: UiAssistantMessage;
  /** True if this is the last assistant message AND streaming is active. */
  isActive: boolean;
}

/**
 * Left-aligned agent bubble. Renders, in arrival order:
 *   1. ThinkingIndicator — purple pulse + collapsible reasoning trace
 *   2. ToolCallCards — collapsible tool invocations
 *   3. Markdown text body
 *   4. Attachments (chart / table / test_cases)
 *   5. InlineError (stream-level error from backend)
 *   6. DoneMeta footer
 */
export function AssistantMessageBubble({
  message,
  isActive,
}: AssistantMessageBubbleProps) {
  const showThinking =
    message.thinking.length > 0 ||
    (isActive && message.text.length === 0 && message.toolCalls.length === 0);

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {showThinking && (
        <ThinkingIndicator
          messages={message.thinking}
          active={isActive}
        />
      )}

      {message.toolCalls.map((tc) => (
        <ToolCallCard key={tc.id} toolCall={tc} />
      ))}

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

      {message.doneMeta && (
        <div className="font-mono text-[10px] text-ink-muted">
          {message.doneMeta.tool_calls} tool call
          {message.doneMeta.tool_calls === 1 ? '' : 's'} ·{' '}
          {(message.doneMeta.duration_ms / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}
