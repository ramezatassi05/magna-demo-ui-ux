'use client';

import { Sparkles } from 'lucide-react';

interface SuggestedPromptChipProps {
  label: string;
  onClick: () => void;
}

/** Clickable prompt shown in the chat empty state. Submits on click. */
export function SuggestedPromptChip({ label, onClick }: SuggestedPromptChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 rounded-lg border border-white/5 bg-surface-elevated px-3 py-2.5 text-left text-[12px] text-ink-on-dark transition-colors hover:border-agent-thinking/30 hover:bg-agent-thinking/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-agent-thinking/40"
    >
      <Sparkles
        className="h-3 w-3 shrink-0 text-agent-thinking opacity-60 transition-opacity group-hover:opacity-100"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  );
}
