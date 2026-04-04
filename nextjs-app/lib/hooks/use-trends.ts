'use client';

import useSWR from 'swr';
import { getTrends } from '@/lib/api';
import type { TrendPoint } from '@/lib/types';

export function useTrends() {
  const { data, error, isLoading, mutate } = useSWR<TrendPoint[]>('trends', getTrends, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  return { trends: data, error: error as Error | undefined, isLoading, refetch: mutate };
}
