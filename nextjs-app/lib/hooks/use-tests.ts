'use client';

import useSWR from 'swr';
import { getTests } from '@/lib/api';
import type { PaginatedTests, TestFilters } from '@/lib/types';

type TestsKey = ['tests', TestFilters];

const fetcher = ([, filters]: TestsKey) => getTests(filters);

/**
 * Paginated + filtered test list. SWR keys on a tuple so any change to
 * `filters` (sensor, result, page, search…) spins up a new cache entry
 * and the previous response remains available during the transition.
 */
export function useTests(filters: TestFilters) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<PaginatedTests>(
    ['tests', filters] satisfies TestsKey,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  return {
    data,
    error: error as Error | undefined,
    isLoading,
    isValidating,
    refetch: mutate,
  };
}
