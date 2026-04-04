'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type {
  Feature,
  SensorType,
  TestFilters,
  TestResult,
} from '@/lib/types';

const VALID_SENSORS: readonly SensorType[] = ['camera', 'radar', 'thermal', 'lidar'];
const VALID_RESULTS: readonly TestResult[] = ['pass', 'fail', 'warning'];
const VALID_FEATURES: readonly Feature[] = ['AEB', 'FCW', 'LCA', 'BSD', 'ACC', 'TSR'];

function narrowSensor(v: string | null): SensorType | undefined {
  return VALID_SENSORS.includes(v as SensorType) ? (v as SensorType) : undefined;
}
function narrowResult(v: string | null): TestResult | undefined {
  return VALID_RESULTS.includes(v as TestResult) ? (v as TestResult) : undefined;
}
function narrowFeature(v: string | null): Feature | undefined {
  return VALID_FEATURES.includes(v as Feature) ? (v as Feature) : undefined;
}

/**
 * URL query string is the single source of truth for Results page filters.
 * Shareable filtered views come for free.
 *
 * NOTE: Components calling this must be wrapped in <Suspense> — Next.js 15's
 * useSearchParams requires a Suspense boundary or `next build` will fail.
 */
export function useFiltersUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<TestFilters>(() => {
    const pageRaw = Number(searchParams.get('page'));
    const sizeRaw = Number(searchParams.get('page_size'));
    return {
      sensor_type: narrowSensor(searchParams.get('sensor_type')),
      result: narrowResult(searchParams.get('result')),
      feature: narrowFeature(searchParams.get('feature')),
      date_from: searchParams.get('date_from') ?? undefined,
      date_to: searchParams.get('date_to') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
      page_size: Number.isFinite(sizeRaw) && sizeRaw > 0 ? sizeRaw : 25,
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (next: Partial<TestFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      // Reset to page 1 whenever a non-page filter changes.
      if (Object.keys(next).some((k) => k !== 'page')) {
        params.set('page', '1');
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  /** Count of active, user-visible filters (excludes page + page_size). */
  const activeCount = useMemo(() => {
    const f = filters;
    return [
      f.sensor_type,
      f.result,
      f.feature,
      f.date_from,
      f.date_to,
      f.search,
    ].filter((v) => v !== undefined && v !== '').length;
  }, [filters]);

  return { filters, updateFilters, resetFilters, activeCount };
}
