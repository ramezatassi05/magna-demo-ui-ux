'use client';

import { useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { Send, Square } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ChatStatus } from '@/hooks/use-agent-chat';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: FormEvent) => void;
  onStop: () => void;
  status: ChatStatus;
  disabled?: boolean;
  tabIndex?: number;
}

const MAX_HEIGHT_PX = 72;

/**
 * Auto-growing textarea input. Enter submits, Shift+Enter inserts a
 * newline. The trailing button swaps between Send (idle) and Stop
 * (streaming).
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  status,
  disabled = false,
  tabIndex = 0,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow height on value change, capped at MAX_HEIGHT_PX.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const streaming = status === 'streaming';
  const canSend = !streaming && value.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit(e);
      }}
      className="border-t border-white/5 p-3"
    >
      <div
        className={cn(
          'flex items-end gap-2 rounded-lg bg-surface-elevated px-3 py-2',
          'focus-within:ring-1 focus-within:ring-agent-thinking/40',
        )}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          placeholder="Ask about tests…"
          disabled={disabled}
          tabIndex={tabIndex}
          aria-label="Message the agent"
          className={cn(
            'flex-1 resize-none bg-transparent text-[13px] leading-[1.4] text-ink-on-dark placeholder:text-ink-muted',
            'focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          )}
          style={{ maxHeight: `${MAX_HEIGHT_PX}px` }}
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generation"
            tabIndex={tabIndex}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-status-fail text-white transition-opacity',
              'hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-status-fail focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated',
            )}
          >
            <Square className="h-3 w-3" fill="currentColor" strokeWidth={0} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            tabIndex={tabIndex}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-magna-red text-white transition-colors',
              'hover:bg-magna-red-hover disabled:cursor-not-allowed disabled:opacity-40',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-magna-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated',
            )}
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-1.5 font-mono text-[10px] text-ink-muted">
        <kbd className="rounded border border-white/10 bg-surface-elevated px-1">
          ↵
        </kbd>
        <span>send</span>
        <span className="opacity-40">·</span>
        <kbd className="rounded border border-white/10 bg-surface-elevated px-1">
          ⇧↵
        </kbd>
        <span>newline</span>
      </div>
    </form>
  );
}
