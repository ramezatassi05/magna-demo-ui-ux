'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  messages: string[];
  /** True while the agent is still running — purple dot pulses. */
  active: boolean;
}

/**
 * Progressive-disclosure reasoning trace. Closed by default while
 * streaming; shows a numbered list of reasoning steps when expanded.
 */
export function ThinkingIndicator({ messages, active }: ThinkingIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMessages = messages.length > 0;

  const label = active
    ? 'Thinking'
    : hasMessages
      ? `Reasoning (${messages.length})`
      : 'Thought';

  return (
    <div className="rounded-lg border border-white/5 bg-surface-elevated/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasMessages}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
          hasMessages
            ? 'hover:bg-white/[0.02]'
            : 'cursor-default',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-agent-thinking/40',
        )}
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full bg-agent-thinking',
            active && 'animate-agent-pulse',
          )}
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] text-ink-muted">{label}</span>
        {hasMessages && (
          <ChevronDown
            className={cn(
              'ml-auto h-3 w-3 text-ink-muted transition-transform',
              expanded && 'rotate-180',
            )}
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
      </button>
      {expanded && hasMessages && (
        <ol className="space-y-1 border-t border-white/5 px-3 py-2">
          {messages.map((m, i) => (
            <li
              key={i}
              className="font-mono text-[11px] leading-relaxed text-ink-muted"
            >
              <span className="mr-2 text-agent-thinking">{i + 1}.</span>
              {m}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
