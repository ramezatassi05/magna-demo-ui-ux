'use client';

import { X, Send, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

interface AgentChatPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Shell for the agent chat panel. Slides in from the right (400px, dark
 * surface) when `open` is true. Message streaming and tool-call rendering
 * are wired up in Phase 6.
 */
export function AgentChatPanel({ open, onClose }: AgentChatPanelProps) {
  return (
    <aside
      aria-hidden={!open}
      aria-label="AI Agent chat panel"
      className={cn(
        'fixed right-0 top-0 z-30 flex h-screen w-chatpanel flex-col bg-surface-dark shadow-panel',
        'transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-agent-thinking/20">
            <Sparkles className="h-4 w-4 text-agent-thinking" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-mono text-[13px] font-semibold text-ink-on-dark">
              AI Agent
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              ADAS Assistant
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat panel"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors',
            'hover:bg-white/[0.04] hover:text-ink-on-dark',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark',
          )}
          tabIndex={open ? 0 : -1}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </header>

      {/* Messages area — empty state placeholder */}
      <div className="flex-1 overflow-y-auto px-5 py-6 dark-scroll">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-agent-thinking/15">
            <Sparkles
              className="h-5 w-5 text-agent-thinking"
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
          <div className="max-w-[260px] text-sm text-ink-on-dark">
            Ask about test results, failures, or generate test cases.
          </div>
          <div className="mt-2 max-w-[260px] font-mono text-[11px] leading-relaxed text-ink-muted">
            Try: &quot;show me failed AEB tests&quot; · &quot;generate cases for radar BSD&quot; ·
            &quot;pass rate by sensor&quot;
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-white/5 p-4">
        <form
          onSubmit={(e) => e.preventDefault()}
          className={cn(
            'flex items-center gap-2 rounded-lg bg-surface-elevated px-3 py-2',
            'focus-within:ring-1 focus-within:ring-white/10',
          )}
        >
          <input
            type="text"
            disabled
            placeholder="Chat coming in Phase 6…"
            tabIndex={open ? 0 : -1}
            className={cn(
              'flex-1 bg-transparent text-sm text-ink-on-dark placeholder:text-ink-muted',
              'focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
            )}
            aria-label="Message the agent"
          />
          <button
            type="submit"
            disabled
            aria-label="Send message"
            tabIndex={open ? 0 : -1}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md bg-magna-red text-white transition-colors',
              'hover:bg-magna-red-hover disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </form>
      </div>
    </aside>
  );
}
