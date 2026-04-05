/**
 * operations.ts — anomaly detection + task derivation tests.
 *
 * Verifies threshold edges, row-level severity branching, task ranking,
 * 24h cluster detection, and rationale shape.
 */

import { describe, expect, it } from 'vitest';

import {
  detectAnomalies,
  deriveTasks,
  explainRow,
  explainTask,
  isRowAnomaly,
  type OperationalTask,
} from '@/lib/operations';
import type {
  Feature,
  SensorType,
  TestRecord,
  TestStats,
  TrendPoint,
} from '@/lib/types';

// -----------------------------------------------------------------------------
// Fixture factories
// -----------------------------------------------------------------------------

let idCounter = 0;
function record(overrides: Partial<TestRecord> = {}): TestRecord {
  idCounter += 1;
  return {
    test_id: `TC-TEST-${String(idCounter).padStart(5, '0')}`,
    sensor_type: 'camera',
    scenario: 'Generic',
    scenario_tags: [],
    feature: 'AEB',
    result: 'pass',
    confidence_score: 0.9,
    detection_distance_m: 50,
    false_positive_rate: 0.01,
    execution_time_ms: 100,
    timestamp: '2026-04-05T12:00:00Z',
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.1',
    notes: '',
    ...overrides,
  };
}

function stats(overrides: Partial<TestStats> = {}): TestStats {
  return {
    total_tests: 100,
    pass_rate: 0.9,
    counts_by_sensor: {},
    counts_by_feature: {},
    counts_by_result: {},
    mean_detection_distance: 50,
    mean_false_positive_rate: 0.01,
    ...overrides,
  };
}

function trendSeries(
  dailyPass: number[],
  dailyFail: number = 2,
  dailyWarning: number = 1,
): TrendPoint[] {
  return dailyPass.map((pass, i) => ({
    date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    pass,
    fail: dailyFail,
    warning: dailyWarning,
  }));
}

// -----------------------------------------------------------------------------
// isRowAnomaly
// -----------------------------------------------------------------------------

describe('isRowAnomaly', () => {
  it('returns "critical" for failed row with confidence < 0.5', () => {
    const row = record({ result: 'fail', confidence_score: 0.4 });
    expect(isRowAnomaly(row)).toBe('critical');
  });

  it('returns "critical" for failed row with "regression" in notes', () => {
    const row = record({
      result: 'fail',
      confidence_score: 0.9,
      notes: 'Detection distance regression spotted at 45m',
    });
    expect(isRowAnomaly(row)).toBe('critical');
  });

  it('returns "anomaly" for plain fail without critical flags', () => {
    const row = record({ result: 'fail', confidence_score: 0.8, notes: '' });
    expect(isRowAnomaly(row)).toBe('anomaly');
  });

  it('returns "anomaly" for pass row with FPR > 0.05', () => {
    const row = record({ result: 'pass', false_positive_rate: 0.07 });
    expect(isRowAnomaly(row)).toBe('anomaly');
  });

  it('returns "watch" for warning row with confidence < 0.7', () => {
    const row = record({ result: 'warning', confidence_score: 0.6 });
    expect(isRowAnomaly(row)).toBe('watch');
  });

  it('returns null for nominal pass row', () => {
    const row = record({
      result: 'pass',
      confidence_score: 0.92,
      false_positive_rate: 0.01,
    });
    expect(isRowAnomaly(row)).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// detectAnomalies
// -----------------------------------------------------------------------------

describe('detectAnomalies', () => {
  it('does not flag pass_rate at exactly 0.88 (strict <)', () => {
    const result = detectAnomalies(stats({ pass_rate: 0.88 }), [], []);
    expect(result.passRateBreached).toBe(false);
  });

  it('flags pass_rate just below 0.88', () => {
    const result = detectAnomalies(stats({ pass_rate: 0.8799 }), [], []);
    expect(result.passRateBreached).toBe(true);
  });

  it('does not flag FPR at exactly 0.03 (strict >)', () => {
    const result = detectAnomalies(
      stats({ mean_false_positive_rate: 0.03 }),
      [],
      [],
    );
    expect(result.fprBreached).toBe(false);
  });

  it('flags FPR just above 0.03', () => {
    const result = detectAnomalies(
      stats({ mean_false_positive_rate: 0.031 }),
      [],
      [],
    );
    expect(result.fprBreached).toBe(true);
  });

  it('detects trend regression when last-7d avg drops ≥5%', () => {
    // prior 7d avg = 100, last 7d avg = 90 → 10% drop
    const trends = trendSeries([
      100, 100, 100, 100, 100, 100, 100, 90, 90, 90, 90, 90, 90, 90,
    ]);
    const result = detectAnomalies(stats(), trends, []);
    expect(result.trendRegression).toBe(true);
  });

  it('does not flag trend regression for 3% drop', () => {
    const trends = trendSeries([
      100, 100, 100, 100, 100, 100, 100, 97, 97, 97, 97, 97, 97, 97,
    ]);
    const result = detectAnomalies(stats(), trends, []);
    expect(result.trendRegression).toBe(false);
  });

  it('ranks sensor hotspots by fail rate desc, filters <10%', () => {
    const tests: TestRecord[] = [
      // camera: 3 fail / 10 total = 30%
      ...Array.from({ length: 7 }, () =>
        record({ sensor_type: 'camera', result: 'pass' }),
      ),
      ...Array.from({ length: 3 }, () =>
        record({ sensor_type: 'camera', result: 'fail' }),
      ),
      // thermal: 2 fail / 10 total = 20%
      ...Array.from({ length: 8 }, () =>
        record({ sensor_type: 'thermal', result: 'pass' }),
      ),
      ...Array.from({ length: 2 }, () =>
        record({ sensor_type: 'thermal', result: 'fail' }),
      ),
      // radar: 0.5 fail / 10 = 5% (below threshold)
      ...Array.from({ length: 19 }, () =>
        record({ sensor_type: 'radar', result: 'pass' }),
      ),
      record({ sensor_type: 'radar', result: 'fail' }),
    ];
    const result = detectAnomalies(stats(), [], tests);
    expect(result.sensorHotspots).toHaveLength(2);
    expect(result.sensorHotspots[0]!.sensor).toBe('camera');
    expect(result.sensorHotspots[1]!.sensor).toBe('thermal');
    expect(result.sensorHotspots[0]!.failRate).toBeGreaterThan(
      result.sensorHotspots[1]!.failRate,
    );
  });
});

// -----------------------------------------------------------------------------
// deriveTasks
// -----------------------------------------------------------------------------

describe('deriveTasks', () => {
  it('returns empty array for empty tests', () => {
    expect(deriveTasks([], [], 5)).toEqual([]);
  });

  it('returns empty array when no failures', () => {
    const tests = [record({ result: 'pass' }), record({ result: 'warning' })];
    expect(deriveTasks(tests, [], 5)).toEqual([]);
  });

  it('respects the limit parameter', () => {
    // 10 distinct (sensor,feature) failures so de-dupe doesn't collapse them.
    const sensors: SensorType[] = ['camera', 'radar', 'thermal', 'lidar'];
    const features: Feature[] = ['AEB', 'FCW', 'LCA', 'BSD', 'ACC', 'TSR'];
    const tests: TestRecord[] = [];
    for (let i = 0; i < 10; i += 1) {
      tests.push(
        record({
          result: 'fail',
          confidence_score: 0.3,
          sensor_type: sensors[i % sensors.length]!,
          feature: features[i % features.length]!,
          timestamp: new Date(
            Date.UTC(2026, 3, 5, 12, 0, 0) - i * 1000,
          ).toISOString(),
        }),
      );
    }
    const tasks = deriveTasks(tests, [], 3, Date.UTC(2026, 3, 5, 12, 0, 0));
    expect(tasks).toHaveLength(3);
  });

  it('ranks critical failures above non-critical anomalies', () => {
    const now = Date.UTC(2026, 3, 5, 12, 0, 0);
    const ts = new Date(now - 60 * 60 * 1000).toISOString();
    const tests: TestRecord[] = [
      // An anomaly, high confidence, not critical
      record({
        sensor_type: 'radar',
        feature: 'FCW',
        result: 'fail',
        confidence_score: 0.85,
        timestamp: ts,
      }),
      // A critical failure
      record({
        sensor_type: 'camera',
        feature: 'AEB',
        result: 'fail',
        confidence_score: 0.3,
        timestamp: ts,
      }),
    ];
    const tasks = deriveTasks(tests, [], 5, now);
    expect(tasks[0]!.severity).toBe('critical');
    expect(tasks[1]!.severity).toBe('anomaly');
  });

  it('detects clusters of 3+ failures within 24h same sensor+feature', () => {
    const now = Date.UTC(2026, 3, 5, 12, 0, 0);
    const HOUR = 60 * 60 * 1000;
    const tests: TestRecord[] = [
      // Cluster: thermal AEB × 4 within 24h
      record({
        sensor_type: 'thermal',
        feature: 'AEB',
        result: 'fail',
        confidence_score: 0.4,
        timestamp: new Date(now - 1 * HOUR).toISOString(),
      }),
      record({
        sensor_type: 'thermal',
        feature: 'AEB',
        result: 'fail',
        confidence_score: 0.4,
        timestamp: new Date(now - 5 * HOUR).toISOString(),
      }),
      record({
        sensor_type: 'thermal',
        feature: 'AEB',
        result: 'fail',
        confidence_score: 0.4,
        timestamp: new Date(now - 10 * HOUR).toISOString(),
      }),
      record({
        sensor_type: 'thermal',
        feature: 'AEB',
        result: 'fail',
        confidence_score: 0.4,
        timestamp: new Date(now - 20 * HOUR).toISOString(),
      }),
    ];
    const tasks = deriveTasks(tests, [], 5, now);
    expect(tasks).toHaveLength(1); // de-duped to one task per (sensor,feature)
    expect(tasks[0]!.metric).toContain('4 failures');
    expect(tasks[0]!.context).toContain('Clustered');
  });

  it('sets filterLink on derived tasks for deep-linking to Results', () => {
    const tests: TestRecord[] = [
      record({
        sensor_type: 'lidar',
        feature: 'BSD',
        result: 'fail',
        confidence_score: 0.3,
      }),
    ];
    const tasks = deriveTasks(tests, [], 5, Date.now());
    expect(tasks[0]!.filterLink).toEqual({
      sensor_type: 'lidar',
      feature: 'BSD',
      result: 'fail',
    });
  });
});

// -----------------------------------------------------------------------------
// explainTask / explainRow
// -----------------------------------------------------------------------------

describe('explainTask', () => {
  it('returns rationale points for a task with matching tests', () => {
    const task: OperationalTask = {
      id: 'task-x',
      severity: 'critical',
      title: 'x',
      metric: '1',
      context: '',
      filterLink: { sensor_type: 'camera', feature: 'AEB', result: 'fail' },
    };
    const tests: TestRecord[] = [
      record({
        sensor_type: 'camera',
        feature: 'AEB',
        result: 'fail',
        confidence_score: 0.3,
        false_positive_rate: 0.08,
      }),
      record({
        sensor_type: 'camera',
        feature: 'AEB',
        result: 'fail',
        confidence_score: 0.4,
        false_positive_rate: 0.06,
      }),
    ];
    const points = explainTask(task, tests);
    expect(points.length).toBeGreaterThanOrEqual(3);
    expect(points[0]!.label).toBe('Matching failures');
    expect(points[0]!.value).toBe(2);
    expect(points[0]!.weight).toBe('primary');
  });

  it('returns empty array when no filterLink', () => {
    const task: OperationalTask = {
      id: 't',
      severity: 'anomaly',
      title: 't',
      metric: '0',
      context: '',
    };
    expect(explainTask(task, [])).toEqual([]);
  });
});

describe('explainRow', () => {
  it('includes confidence + FPR + distance for any row', () => {
    const row = record({ result: 'fail', confidence_score: 0.42 });
    const points = explainRow(row);
    const labels = points.map((p) => p.label);
    expect(labels).toContain('Result');
    expect(labels).toContain('Confidence');
    expect(labels).toContain('False-positive rate');
    expect(labels).toContain('Detection distance');
  });

  it('appends a Notes point when notes contain "regression"', () => {
    const row = record({
      result: 'fail',
      notes: 'Detection regression at 45m in rain',
    });
    const points = explainRow(row);
    const notesPoint = points.find((p) => p.label === 'Notes');
    expect(notesPoint).toBeDefined();
    expect(notesPoint?.tone).toBe('critical');
  });

  it('omits Notes point when no regression keyword', () => {
    const row = record({ result: 'fail', notes: 'Missed detection at 45m' });
    const points = explainRow(row);
    expect(points.find((p) => p.label === 'Notes')).toBeUndefined();
  });
});

