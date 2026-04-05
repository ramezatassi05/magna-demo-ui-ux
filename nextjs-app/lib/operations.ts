/**
 * Operations — pure anomaly detection + task derivation.
 *
 * Powers the dashboard DynamicTaskCard rack and per-row anomaly strips on
 * the Results table. Kept framework-agnostic so it can be memoized upstream.
 *
 * Thresholds are defined once here to keep product rules in one place.
 */

import { computePassRateDelta } from './aggregations';
import type {
  SensorType,
  TestFilters,
  TestRecord,
  TestStats,
  TrendPoint,
} from './types';
import type { RationaleDataPoint } from '@/components/industrial/why-popover';

// -----------------------------------------------------------------------------
// Thresholds (product rules, single source of truth)
// -----------------------------------------------------------------------------

const PASS_RATE_THRESHOLD = 0.88;
const FPR_THRESHOLD = 0.03;
const TREND_REGRESSION_FRACTION = 0.05; // 5%
const SENSOR_HOTSPOT_FAIL_RATE = 0.10;
const CLUSTER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const CLUSTER_MIN_COUNT = 3;
const CRITICAL_CONFIDENCE_FLOOR = 0.5;
const WATCH_CONFIDENCE_FLOOR = 0.7;
const ANOMALY_FPR_FLOOR = 0.05;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AnomalyDetectionResult {
  passRateBreached: boolean;
  fprBreached: boolean;
  /** Percentage-point delta, last 7d vs prior 7d. Positive = improvement. */
  passRateDelta: number;
  /** Percentage-point delta on FPR, last 7d vs prior 7d. Positive = worse. */
  fprDelta: number;
  /** True when avg daily pass count in last 7d is < prior 7d by ≥5%. */
  trendRegression: boolean;
  sensorHotspots: Array<{ sensor: SensorType; failRate: number }>;
}

export type TaskSeverity = 'critical' | 'anomaly' | 'watch' | 'nominal';

export interface OperationalTask {
  id: string;
  severity: TaskSeverity;
  /** e.g. "Thermal AEB fail rate spiked 8.4%". */
  title: string;
  /** Short metric readout, e.g. "12 failures · 24h". */
  metric: string;
  /** Comparative context, e.g. "Normally 2-3/day". */
  context: string;
  /** Deep-link filters for the Results page. */
  filterLink?: Partial<TestFilters>;
  actionLabel?: string;
  rationale?: RationaleDataPoint[];
}

// -----------------------------------------------------------------------------
// detectAnomalies
// -----------------------------------------------------------------------------

/** Compute per-KPI anomaly state. Pure — memo-friendly. */
export function detectAnomalies(
  stats: TestStats,
  trends: TrendPoint[],
  tests: TestRecord[],
): AnomalyDetectionResult {
  const passRateBreached = stats.pass_rate < PASS_RATE_THRESHOLD;
  const fprBreached = stats.mean_false_positive_rate > FPR_THRESHOLD;

  // passRateDelta: percentage-point delta (last 7d vs prior 7d).
  // computePassRateDelta already returns pp (signed, rounded to 1 decimal).
  const passRateDelta = computePassRateDelta(trends);

  // fprDelta: percentage-point delta, derived locally since no shared helper.
  const fprDelta = computeFprDeltaPp(tests);

  // trendRegression: avg daily pass count last-7d vs prior-7d.
  const trendRegression = isTrendRegressing(trends);

  // Sensor hotspots: fail rate per sensor, keep those ≥10%, sorted desc.
  const sensorHotspots = computeSensorHotspots(tests);

  return {
    passRateBreached,
    fprBreached,
    passRateDelta,
    fprDelta,
    trendRegression,
    sensorHotspots,
  };
}

function isTrendRegressing(trends: TrendPoint[]): boolean {
  if (trends.length < 14) return false;
  const last7 = trends.slice(-7);
  const prior7 = trends.slice(-14, -7);
  const avgPass = (window: TrendPoint[]): number => {
    if (window.length === 0) return 0;
    const sum = window.reduce((acc, p) => acc + p.pass, 0);
    return sum / window.length;
  };
  const recent = avgPass(last7);
  const prior = avgPass(prior7);
  if (prior === 0) return false;
  return (prior - recent) / prior >= TREND_REGRESSION_FRACTION;
}

function computeFprDeltaPp(tests: TestRecord[]): number {
  if (tests.length === 0) return 0;
  // Partition by timestamp: last 7d vs prior 7d.
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const last7Start = now - 7 * DAY;
  const prior7Start = now - 14 * DAY;

  let lastSum = 0;
  let lastCount = 0;
  let priorSum = 0;
  let priorCount = 0;

  for (const t of tests) {
    const ts = new Date(t.timestamp).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts >= last7Start) {
      lastSum += t.false_positive_rate;
      lastCount += 1;
    } else if (ts >= prior7Start) {
      priorSum += t.false_positive_rate;
      priorCount += 1;
    }
  }
  const lastAvg = lastCount > 0 ? lastSum / lastCount : 0;
  const priorAvg = priorCount > 0 ? priorSum / priorCount : 0;
  // Convert to percentage points.
  return Number(((lastAvg - priorAvg) * 100).toFixed(2));
}

function computeSensorHotspots(
  tests: TestRecord[],
): Array<{ sensor: SensorType; failRate: number }> {
  const buckets: Record<SensorType, { total: number; fails: number }> = {
    camera: { total: 0, fails: 0 },
    radar: { total: 0, fails: 0 },
    thermal: { total: 0, fails: 0 },
    lidar: { total: 0, fails: 0 },
  };
  for (const t of tests) {
    const b = buckets[t.sensor_type];
    if (!b) continue;
    b.total += 1;
    if (t.result === 'fail') b.fails += 1;
  }
  const entries: Array<{ sensor: SensorType; failRate: number }> = [];
  for (const sensor of Object.keys(buckets) as SensorType[]) {
    const { total, fails } = buckets[sensor];
    if (total === 0) continue;
    const failRate = fails / total;
    if (failRate >= SENSOR_HOTSPOT_FAIL_RATE) {
      entries.push({ sensor, failRate: Number(failRate.toFixed(4)) });
    }
  }
  entries.sort((a, b) => b.failRate - a.failRate);
  return entries;
}

// -----------------------------------------------------------------------------
// isRowAnomaly
// -----------------------------------------------------------------------------

/**
 * Decide if a single row crosses an anomaly threshold.
 *   critical: result='fail' AND (confidence < 0.5 OR notes contains "regression")
 *   anomaly:  result='fail' OR false_positive_rate > 0.05
 *   watch:    confidence < 0.7 AND result !== 'pass'
 *   null:     nominal
 */
export function isRowAnomaly(
  row: TestRecord,
): 'critical' | 'anomaly' | 'watch' | null {
  const notesHasRegression = row.notes.toLowerCase().includes('regression');
  if (
    row.result === 'fail' &&
    (row.confidence_score < CRITICAL_CONFIDENCE_FLOOR || notesHasRegression)
  ) {
    return 'critical';
  }
  if (row.result === 'fail' || row.false_positive_rate > ANOMALY_FPR_FLOOR) {
    return 'anomaly';
  }
  if (row.confidence_score < WATCH_CONFIDENCE_FLOOR && row.result !== 'pass') {
    return 'watch';
  }
  return null;
}

// -----------------------------------------------------------------------------
// deriveTasks
// -----------------------------------------------------------------------------

/**
 * Rank failures by operational risk and surface the top N as tasks.
 *   score = severity×0.5 + recency×0.3 + clusteredness×0.2
 *
 * A "cluster" = ≥3 failures with the same sensor_type + feature within 24h
 * of the candidate's timestamp.
 *
 * `nowMs` is injectable for deterministic tests. Defaults to Date.now().
 */
export function deriveTasks(
  tests: TestRecord[],
  _trends: TrendPoint[],
  limit: number = 5,
  nowMs: number = Date.now(),
): OperationalTask[] {
  if (tests.length === 0) return [];

  const DAY = 24 * 60 * 60 * 1000;

  // Only failures become task candidates.
  const fails = tests.filter((t) => t.result === 'fail');
  if (fails.length === 0) return [];

  // Precompute cluster counts per (sensor,feature) for efficiency — a rough
  // bucket; we then refine per-candidate by the 24h window.
  const byKey = new Map<string, TestRecord[]>();
  for (const f of fails) {
    const key = `${f.sensor_type}|${f.feature}`;
    const arr = byKey.get(key);
    if (arr) arr.push(f);
    else byKey.set(key, [f]);
  }

  interface Candidate {
    row: TestRecord;
    severity: 'critical' | 'anomaly';
    severityScore: number; // 1.0 critical, 0.6 anomaly
    recency: number; // 0..1
    clusterSize: number; // raw count within 24h of row.timestamp
    clusteredness: number; // 0..1
    score: number;
  }

  const candidates: Candidate[] = [];
  for (const row of fails) {
    const rowLevel = isRowAnomaly(row);
    // Only critical or anomaly rows become tasks (watch is too noisy here).
    if (rowLevel !== 'critical' && rowLevel !== 'anomaly') continue;

    const rowMs = new Date(row.timestamp).getTime();
    if (!Number.isFinite(rowMs)) continue;

    const severityScore = rowLevel === 'critical' ? 1.0 : 0.6;

    // Recency: 1 if within 24h of now, tapers to 0 at 14 days old.
    const ageMs = Math.max(0, nowMs - rowMs);
    const RECENCY_HORIZON = 14 * DAY;
    const recency = Math.max(0, 1 - ageMs / RECENCY_HORIZON);

    // Clusteredness: count peers within 24h window, same sensor+feature.
    const peers = byKey.get(`${row.sensor_type}|${row.feature}`) ?? [];
    let clusterSize = 0;
    for (const p of peers) {
      const pMs = new Date(p.timestamp).getTime();
      if (!Number.isFinite(pMs)) continue;
      if (Math.abs(pMs - rowMs) <= CLUSTER_WINDOW_MS) clusterSize += 1;
    }
    // Normalized clusteredness: 0 below CLUSTER_MIN_COUNT, then scales.
    const clusteredness =
      clusterSize >= CLUSTER_MIN_COUNT
        ? Math.min(1, clusterSize / (CLUSTER_MIN_COUNT * 2))
        : 0;

    const score =
      severityScore * 0.5 + recency * 0.3 + clusteredness * 0.2;

    candidates.push({
      row,
      severity: rowLevel,
      severityScore,
      recency,
      clusterSize,
      clusteredness,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  // De-dupe tasks by (sensor, feature) — one task per cluster.
  const seen = new Set<string>();
  const tasks: OperationalTask[] = [];
  for (const c of candidates) {
    const key = `${c.row.sensor_type}|${c.row.feature}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tasks.push(toOperationalTask(c));
    if (tasks.length >= limit) break;
  }
  return tasks;
}

function toOperationalTask(c: {
  row: TestRecord;
  severity: 'critical' | 'anomaly';
  clusterSize: number;
}): OperationalTask {
  const { row, severity, clusterSize } = c;
  const sensorLabel =
    row.sensor_type.charAt(0).toUpperCase() + row.sensor_type.slice(1);
  const metric =
    clusterSize >= CLUSTER_MIN_COUNT
      ? `${clusterSize} failures · 24h`
      : `1 failure`;
  const context =
    clusterSize >= CLUSTER_MIN_COUNT
      ? `Clustered ${sensorLabel} ${row.feature} regressions`
      : `Isolated ${sensorLabel} ${row.feature} failure`;
  const title =
    severity === 'critical'
      ? `${sensorLabel} ${row.feature} critical failure`
      : `${sensorLabel} ${row.feature} failure cluster`;

  return {
    id: `task-${row.test_id}`,
    severity,
    title,
    metric,
    context,
    filterLink: {
      sensor_type: row.sensor_type,
      feature: row.feature,
      result: 'fail',
    },
    actionLabel: 'Inspect failures',
  };
}

// -----------------------------------------------------------------------------
// explainTask / explainRow — WhyPopover rationale builders
// -----------------------------------------------------------------------------

/** Build a WhyPopover rationale from a task's source failures. */
export function explainTask(
  task: OperationalTask,
  tests: TestRecord[],
): RationaleDataPoint[] {
  const link = task.filterLink;
  if (!link) return [];
  const matching = tests.filter(
    (t) =>
      (link.sensor_type === undefined || t.sensor_type === link.sensor_type) &&
      (link.feature === undefined || t.feature === link.feature) &&
      (link.result === undefined || t.result === link.result),
  );
  const total = matching.length;
  if (total === 0) return [];

  const avgConfidence =
    matching.reduce((acc, t) => acc + t.confidence_score, 0) / total;
  const avgFpr =
    matching.reduce((acc, t) => acc + t.false_positive_rate, 0) / total;
  const sorted = matching
    .slice()
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  const latest = sorted[0]; // safe: total > 0 checked above

  const tone: RationaleDataPoint['tone'] =
    task.severity === 'critical' ? 'critical' : 'anomaly';

  return [
    {
      label: 'Matching failures',
      value: total,
      weight: 'primary',
      tone,
    },
    {
      label: 'Avg confidence',
      value: `${(avgConfidence * 100).toFixed(1)}%`,
      tone: avgConfidence < CRITICAL_CONFIDENCE_FLOOR ? 'critical' : 'nominal',
    },
    {
      label: 'Avg false-positive rate',
      value: `${(avgFpr * 100).toFixed(2)}%`,
      tone: avgFpr > ANOMALY_FPR_FLOOR ? 'anomaly' : 'nominal',
    },
    {
      label: 'Most recent',
      value: latest ? latest.test_id : '—',
      weight: 'secondary',
    },
  ];
}

/** Build a WhyPopover rationale for a single failed/borderline row. */
export function explainRow(row: TestRecord): RationaleDataPoint[] {
  const level = isRowAnomaly(row);
  const tone: RationaleDataPoint['tone'] =
    level === 'critical'
      ? 'critical'
      : level === 'anomaly'
        ? 'anomaly'
        : level === 'watch'
          ? 'override'
          : 'nominal';

  const points: RationaleDataPoint[] = [
    {
      label: 'Result',
      value: row.result,
      weight: 'primary',
      tone,
    },
    {
      label: 'Confidence',
      value: `${(row.confidence_score * 100).toFixed(1)}%`,
      tone:
        row.confidence_score < CRITICAL_CONFIDENCE_FLOOR
          ? 'critical'
          : row.confidence_score < WATCH_CONFIDENCE_FLOOR
            ? 'anomaly'
            : 'nominal',
    },
    {
      label: 'False-positive rate',
      value: `${(row.false_positive_rate * 100).toFixed(2)}%`,
      tone: row.false_positive_rate > ANOMALY_FPR_FLOOR ? 'anomaly' : 'nominal',
    },
    {
      label: 'Detection distance',
      value: `${row.detection_distance_m.toFixed(1)}m`,
    },
  ];

  if (row.notes.toLowerCase().includes('regression')) {
    points.push({
      label: 'Notes',
      value: 'regression flagged',
      weight: 'primary',
      tone: 'critical',
    });
  }

  return points;
}
