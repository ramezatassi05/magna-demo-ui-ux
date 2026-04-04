/**
 * Pure aggregation helpers. The FastAPI `/api/stats` endpoint gives flat
 * totals but not cross-tabulations — these functions shape the data the
 * dashboard needs from the raw list + stats payloads.
 */

import type { SensorType, TestRecord, TrendPoint } from './types';

// Status-token hex mirrors tailwind.config.ts — kept in sync manually so
// Recharts can consume string colors without importing Tailwind utilities.
const STATUS_COLORS = {
  pass: '#10B981',
  fail: '#EF4444',
  warning: '#F59E0B',
} as const;

const SENSOR_ORDER: SensorType[] = ['camera', 'radar', 'thermal', 'lidar'];

export interface SensorBreakdownRow {
  sensor: SensorType;
  sensorLabel: string; // capitalized, display-friendly
  pass: number;
  fail: number;
  warning: number;
}

/** Group test records into per-sensor × per-result counts for the stacked bar. */
export function aggregateBySensorResult(tests: TestRecord[]): SensorBreakdownRow[] {
  const buckets: Record<SensorType, { pass: number; fail: number; warning: number }> = {
    camera: { pass: 0, fail: 0, warning: 0 },
    radar: { pass: 0, fail: 0, warning: 0 },
    thermal: { pass: 0, fail: 0, warning: 0 },
    lidar: { pass: 0, fail: 0, warning: 0 },
  };

  for (const t of tests) {
    const bucket = buckets[t.sensor_type];
    if (!bucket) continue;
    bucket[t.result] += 1;
  }

  return SENSOR_ORDER.map((sensor) => ({
    sensor,
    sensorLabel: sensor.charAt(0).toUpperCase() + sensor.slice(1),
    ...buckets[sensor],
  }));
}

export interface DonutSegment {
  name: 'pass' | 'fail' | 'warning';
  label: string;
  value: number;
  color: string;
}

/** Convert counts_by_result → Recharts-friendly donut segments. */
export function toDonutData(counts: Record<string, number>): DonutSegment[] {
  const order: Array<DonutSegment['name']> = ['pass', 'fail', 'warning'];
  return order.map((name) => ({
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    value: counts[name] ?? 0,
    color: STATUS_COLORS[name],
  }));
}

/**
 * Signed percentage-point delta between the most recent 7 days of pass rate
 * and the prior 7 days. E.g. +2.3 means pass rate improved by 2.3 pp.
 * Returns 0 if there isn't enough data.
 */
export function computePassRateDelta(trends: TrendPoint[]): number {
  if (trends.length < 14) return 0;
  const last7 = trends.slice(-7);
  const prior7 = trends.slice(-14, -7);

  const rate = (window: TrendPoint[]): number => {
    const total = window.reduce((sum, p) => sum + p.pass + p.fail + p.warning, 0);
    if (total === 0) return 0;
    const pass = window.reduce((sum, p) => sum + p.pass, 0);
    return (pass / total) * 100;
  };

  return Number((rate(last7) - rate(prior7)).toFixed(1));
}

/** Confidence score → level thresholds. */
export function confidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high';
  if (score >= 0.65) return 'medium';
  return 'low';
}
