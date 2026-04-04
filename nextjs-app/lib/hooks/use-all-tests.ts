'use client';

import useSWR from 'swr';
import { getTests } from '@/lib/api';
import type { TestRecord } from '@/lib/types';

/**
 * Fetch the full test dataset for client-side aggregations (e.g. the
 * dashboard's sensor × result stacked bar).
 *
 * The backend caps `page_size` at 200, so this issues 3 parallel calls to
 * cover the documented 550-record dataset. SWR dedups and caches the result
 * across the dashboard's lifetime.
 */
async function fetchAllTests(): Promise<TestRecord[]> {
  const pages = await Promise.all([
    getTests({ page: 1, page_size: 200 }),
    getTests({ page: 2, page_size: 200 }),
    getTests({ page: 3, page_size: 200 }),
  ]);
  return pages.flatMap((p) => p.items);
}

export function useAllTests() {
  const { data, error, isLoading, mutate } = useSWR<TestRecord[]>(
    'all-tests',
    fetchAllTests,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );
  return { items: data, error: error as Error | undefined, isLoading, refetch: mutate };
}
