import { Skeleton } from '@/components/skeleton';

interface TestCaseSkeletonListProps {
  count?: number;
}

/** Placeholder list while test cases are being generated. */
export function TestCaseSkeletonList({ count = 4 }: TestCaseSkeletonListProps) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Generating test cases">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-card border border-hairline bg-surface-card p-4 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-3 space-y-2 border-t border-hairline-subtle pt-3">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
