/**
 * Formatting helpers shared across KPI cards, tables, charts, and tooltips.
 * All formatters tolerate null/undefined and return '—' so callers can pass
 * SWR-pending values without guarding every call site.
 */

import { format, parseISO } from 'date-fns';

const DASH = '—';

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** 0.8742 → "87.4%" (decimals default 1). Caller pre-multiplies if needed. */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (!isNum(value)) return DASH;
  return `${value.toFixed(decimals)}%`;
}

/** 12345 → "12,345" with thousands separators. */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (!isNum(value)) return DASH;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 42.3 → "42.3 m" */
export function formatDistance(meters: number | null | undefined): string {
  if (!isNum(meters)) return DASH;
  return `${meters.toFixed(1)} m`;
}

/** "2026-03-14T14:32:00Z" → "Mar 14" */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return DASH;
  try {
    return format(parseISO(iso), 'MMM d');
  } catch {
    return DASH;
  }
}

/** "2026-03-14T14:32:00Z" → "Mar 14, 2026 · 14:32" */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return DASH;
  try {
    return format(parseISO(iso), "MMM d, yyyy '·' HH:mm");
  } catch {
    return DASH;
  }
}

/** "2026-03-14" → Date object without timezone shifts. */
export function parseDayString(yyyyMmDd: string): Date {
  return parseISO(yyyyMmDd);
}
