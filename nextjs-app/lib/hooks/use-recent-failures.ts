'use client';

import { useTests } from './use-tests';

/** Last 8 failed validation runs — used in the dashboard's Recent Failures card. */
export function useRecentFailures(limit = 8) {
  const { data, error, isLoading } = useTests({
    result: 'fail',
    page: 1,
    page_size: limit,
  });
  return {
    rows: data?.items,
    error,
    isLoading,
  };
}
