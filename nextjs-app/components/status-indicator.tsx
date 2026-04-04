import { cn } from '@/lib/utils';

type AgentState = 'thinking' | 'idle' | 'error' | 'success';

interface StatusIndicatorProps {
  state: AgentState;
  label?: string;
  size?: 'sm' | 'md';
}

const DOT_COLORS: Record<AgentState, string> = {
  thinking: 'bg-agent-thinking animate-agent-pulse',
  idle: 'bg-agent-idle',
  error: 'bg-status-fail',
  success: 'bg-agent-success',
};

const SIZES = {
  sm: { dot: 'h-1.5 w-1.5', text: 'text-[11px]' },
  md: { dot: 'h-2 w-2', text: 'text-xs' },
} as const;

/** Dot + optional label indicating agent runtime state. */
export function StatusIndicator({ state, label, size = 'md' }: StatusIndicatorProps) {
  const { dot, text } = SIZES[size];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn('inline-block rounded-full', dot, DOT_COLORS[state])}
        aria-hidden
      />
      {label && (
        <span className={cn('font-medium text-ink-secondary', text)}>{label}</span>
      )}
    </span>
  );
}
