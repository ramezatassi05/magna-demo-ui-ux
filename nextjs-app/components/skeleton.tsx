import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/** Shimmering placeholder block — uses .skeleton-shimmer from globals.css. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('skeleton-shimmer rounded', className)}
    />
  );
}
