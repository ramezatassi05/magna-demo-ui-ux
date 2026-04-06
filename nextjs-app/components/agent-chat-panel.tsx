'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { EngineeringMetadata } from './industrial/engineering-metadata';
import { ManualOverrideControl } from './industrial/manual-override-control';
import { ChatEmptyState } from './chat/chat-empty-state';
import { ChatInput } from './chat/chat-input';
import { ChatMessages } from './chat/chat-messages';

interface AgentChatPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Streaming chat panel. Always mounted — slide-out is CSS-only via
 * `translate-x-full` so hook state (messages, attachments) persists
 * across close/reopen within a session.
 *
 * Owns: slide animation, header, aria visibility.
 * Delegates: message state + streaming to useAgentChat.
 */
export function AgentChatPanel({ open, onClose }: AgentChatPanelProps) {
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    submitPrompt,
    stop,
    status,
    error,
  } = useAgentChat();

  const bodyTabIndex = open ? 0 : -1;

  // One session id for the panel's lifetime. Exposed in the header strip
  // so support/logs can cross-reference without backend coupling.
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    setSessionId(`ses_${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  const toolCount = useMemo(
    () =>
      messages.reduce(
        (n, m) => (m.role === 'assistant' ? n + m.toolCalls.length : n),
        0,
      ),
    [messages],
  );

  const handleInjectFilter = (filter: string) => {
    const prefix = `[scope: ${filter}]`;
    setInput(input ? `${prefix} ${input}` : `${prefix} `);
  };

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
      <header className="border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-agent-thinking/20">
              <Sparkles
                className="h-4 w-4 text-agent-thinking"
                strokeWidth={2.2}
                aria-hidden="true"
              />
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
            tabIndex={bodyTabIndex}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted transition-colors',
              'hover:bg-white/[0.04] hover:text-ink-on-dark',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark',
            )}
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <EngineeringMetadata
          items={[
            { label: 'ses', value: sessionId },
            { label: 'msgs', value: messages.length },
            { label: 'tools', value: toolCount },
          ]}
          align="start"
          className="mt-2"
        />
      </header>

      {/* Body: empty state OR message list */}
      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto px-5 py-6 dark-scroll">
          <ChatEmptyState onPromptClick={submitPrompt} />
        </div>
      ) : (
        <ChatMessages messages={messages} status={status} />
      )}

      {/* Global fetch/transport error banner (per-message stream errors render
          inside the bubble via `errored`). */}
      {error && (
        <div className="mx-5 mb-2 flex items-start gap-2 rounded-sm border border-status-fail/30 bg-status-fail/10 px-3 py-2">
          <AlertCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-fail"
            strokeWidth={2}
            aria-hidden="true"
          />
          <div className="text-[11px] text-status-fail">
            <div className="font-medium">Request failed</div>
            <div className="font-mono text-[10px] opacity-80">{error.message}</div>
          </div>
        </div>
      )}

      {/* Manual override — stop agent mid-run, inject scope prefix */}
      <ManualOverrideControl
        status={status}
        onStop={stop}
        onInjectFilter={handleInjectFilter}
      />

      {/* Input */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onStop={stop}
        status={status}
        disabled={!open}
        tabIndex={bodyTabIndex}
      />
    </aside>
  );
}
