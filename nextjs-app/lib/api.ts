/**
 * Typed REST client for the FastAPI backend (api/main.py).
 *
 * Endpoints wrapped:
 *   GET /api/tests                   → getTests(filters?)
 *   GET /api/tests/{test_id}         → getTestById(id)
 *   GET /api/stats                   → getStats()
 *   GET /api/stats/trends            → getTrends()
 *
 * The SSE chat endpoint (POST /api/chat) is handled separately when the chat
 * panel is wired up in Phase 6.
 */

import type {
  PaginatedTests,
  TestFilters,
  TestRecord,
  TestStats,
  TrendPoint,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(
      res.status,
      url,
      `API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
    );
  }

  return (await res.json()) as T;
}

function toQuery<T extends object>(params: T): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    search.set(key, String(value));
  }
  return `?${search.toString()}`;
}

/**
 * Fetch paginated, filtered test records.
 * Defaults: page=1, page_size=25. Max page_size server-side is 200.
 */
export function getTests(filters: TestFilters = {}): Promise<PaginatedTests> {
  return request<PaginatedTests>(`/api/tests${toQuery(filters)}`);
}

export function getTestById(testId: string): Promise<TestRecord> {
  return request<TestRecord>(`/api/tests/${encodeURIComponent(testId)}`);
}

export function getStats(): Promise<TestStats> {
  return request<TestStats>('/api/stats');
}

export function getTrends(): Promise<TrendPoint[]> {
  return request<TrendPoint[]>('/api/stats/trends');
}
