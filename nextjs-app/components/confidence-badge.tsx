import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { confidenceLevel } from '@/lib/aggregations';

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ConfidenceBadgeProps {
  /** Score 0.0–1.0 (will be mapped to level via confidenceLevel()). */
  score?: number;
  /** Explicit level, used when no numeric score is available. */
  level?: ConfidenceLevel;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  showScore?: boolean;
}

const VARIANTS: Record<ConfidenceLevel, { classes: string; Icon: typeof CheckCircle2; label: string }> = {
  high: {
    classes: 'bg-status-pass/10 text-status-pass border-status-pass/20',
    Icon: CheckCircle2,
    label: 'High',
  },
  medium: {
    classes: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    Icon: AlertTriangle,
    label: 'Medium',
  },
  low: {
    classes: 'bg-status-fail/10 text-status-fail border-status-fail/20',
    Icon: XCircle,
    label: 'Low',
  },
};

const SIZES = {
  sm: { pill: 'h-5 px-1.5 text-[10px] gap-1', icon: 'h-3 w-3' },
  md: { pill: 'h-6 px-2 text-[11px] gap-1.5', icon: 'h-3.5 w-3.5' },
} as const;

/** Pill that communicates model / detection confidence (High/Medium/Low). */
export function ConfidenceBadge({
  score,
  level,
  showIcon = true,
  size = 'md',
  showScore = false,
}: ConfidenceBadgeProps) {
  const resolved: ConfidenceLevel =
    level ?? (typeof score === 'number' ? confidenceLevel(score) : 'low');
  const variant = VARIANTS[resolved];
  const { pill, icon } = SIZES[size];
  const Icon = variant.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        variant.classes,
        pill,
      )}
      title={typeof score === 'number' ? `Confidence ${(score * 100).toFixed(1)}%` : undefined}
    >
      {showIcon && <Icon className={cn(icon, 'shrink-0')} aria-hidden />}
      <span>
        {variant.label}
        {showScore && typeof score === 'number' && (
          <span className="ml-1 font-mono opacity-70">{(score * 100).toFixed(0)}</span>
        )}
      </span>
    </span>
  );
}
