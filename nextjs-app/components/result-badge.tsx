import { cn } from '@/lib/utils';
import type { TestResult } from '@/lib/types';

interface ResultBadgeProps {
  result: TestResult;
  size?: 'sm' | 'md';
}

const VARIANTS: Record<TestResult, string> = {
  pass: 'bg-status-pass/10 text-status-pass border-status-pass/20',
  fail: 'bg-status-fail/10 text-status-fail border-status-fail/20',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
};

const SIZES: Record<NonNullable<ResultBadgeProps['size']>, string> = {
  sm: 'h-5 px-1.5 text-[10px]',
  md: 'h-6 px-2 text-[11px]',
};

/** Pass / fail / warning pill — uppercase mono for data-table legibility. */
export function ResultBadge({ result, size = 'md' }: ResultBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-mono font-medium uppercase tracking-wide',
        VARIANTS[result],
        SIZES[size],
      )}
    >
      {result}
    </span>
  );
}
