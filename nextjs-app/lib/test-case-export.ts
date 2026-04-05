/**
 * Browser-side export helpers for generated ADAS test cases.
 *
 * No dependencies — uses Blob + URL.createObjectURL + a synthetic anchor
 * click. Safe to call from event handlers in client components.
 */

import type { TestCase } from './types';

const CSV_COLUMNS: Array<{ key: keyof TestCase; label: string }> = [
  { key: 'test_id', label: 'Test ID' },
  { key: 'title', label: 'Title' },
  { key: 'priority', label: 'Priority' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'estimated_duration_min', label: 'Duration (min)' },
  { key: 'preconditions', label: 'Preconditions' },
  { key: 'steps', label: 'Steps' },
  { key: 'expected_result', label: 'Expected Result' },
  { key: 'pass_criteria', label: 'Pass Criteria' },
];

/** Escape a CSV field per RFC 4180 (quote if it contains ,"\n or \r). */
function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s = Array.isArray(value) ? value.join('\n') : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize test cases to a CSV string. Arrays are joined with \n. */
export function testCasesToCsv(cases: TestCase[]): string {
  const header = CSV_COLUMNS.map((c) => csvEscape(c.label)).join(',');
  const rows = cases.map((tc) =>
    CSV_COLUMNS.map((c) => csvEscape(tc[c.key])).join(','),
  );
  // CRLF per RFC 4180
  return [header, ...rows].join('\r\n');
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** ISO-date prefix for export filenames, e.g. "2026-04-04". */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function exportTestCasesAsCsv(
  cases: TestCase[],
  prefix = 'test-cases',
): void {
  const csv = testCasesToCsv(cases);
  triggerDownload(csv, `${prefix}-${todayIso()}.csv`, 'text/csv');
}

export function exportTestCasesAsJson(
  cases: TestCase[],
  prefix = 'test-cases',
): void {
  const json = JSON.stringify(cases, null, 2);
  triggerDownload(json, `${prefix}-${todayIso()}.json`, 'application/json');
}
