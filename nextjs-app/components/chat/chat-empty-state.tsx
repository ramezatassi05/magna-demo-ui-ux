'use client';

import { Sparkles } from 'lucide-react';

import { SUGGESTED_PROMPTS } from '@/hooks/use-agent-chat';
import { SuggestedPromptChip } from './suggested-prompt-chip';

interface ChatEmptyStateProps {
  onPromptClick: (prompt: string) => void;
}

/** Shown when the chat has no messages yet. */
export function ChatEmptyState({ onPromptClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center pt-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-agent-thinking/15">
        <Sparkles
          className="h-5 w-5 text-agent-thinking"
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>
      <h2 className="text-sm font-medium text-ink-on-dark">How can I help?</h2>
      <p className="mt-1 max-w-[280px] text-center font-mono text-[11px] leading-relaxed text-ink-muted">
        Ask about test results, failures, or generate new test cases.
      </p>
      <div
        className="mt-6 flex w-full flex-col gap-2"
        role="list"
        aria-label="Suggested prompts"
      >
        {SUGGESTED_PROMPTS.map((prompt) => (
          <div key={prompt} role="listitem">
            <SuggestedPromptChip
              label={prompt}
              onClick={() => onPromptClick(prompt)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
