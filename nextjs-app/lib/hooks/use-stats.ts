'use client';

import useSWR from 'swr';
import { getStats } from '@/lib/api';
import type { TestStats } from '@/lib/types';

export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<TestStats>('stats', getStats, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  return { stats: data, error: error as Error | undefined, isLoading, refetch: mutate };
}
