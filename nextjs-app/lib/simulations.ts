/**
 * Simulations — pure client-side "what-if" threshold filtering.
 *
 * Powers the ParameterSliderPanel on the dashboard: engineers drag
 * confidence/FPR/distance sliders and KPI + chart cards re-render from
 * a recomputed subset of the existing test records — no backend roundtrip.
 *
 * `simulateStats` mirrors api/main.py:258-305 so values match what the
 * backend would return for the same filtered subset.
 */

import type { TestRecord, TestStats } from './types';

export interface SimulationParams {
  /** Test kept if confidence_score >= this. 0..1. */
  min_confidence: number;
  /** Test kept if false_positive_rate <= this. 0..1. */
  max_fpr: number;
  /** Test kept if detection_distance_m >= this. meters. */
  min_distance: number;
}

/** No-op defaults — everything passes. */
export const DEFAULT_SIM_PARAMS: SimulationParams = {
  min_confidence: 0,
  max_fpr: 1,
  min_distance: 0,
};

/** Pure subset filter. */
export function simulateFiltered(
  tests: TestRecord[],
  params: SimulationParams,
): TestRecord[] {
  const { min_confidence, max_fpr, min_distance } = params;
  return tests.filter(
    (t) =>
      t.confidence_score >= min_confidence &&
      t.false_positive_rate <= max_fpr &&
      t.detection_distance_m >= min_distance,
  );
}

/** Round to `d` decimals without the .toFixed()-returns-string trap. */
function roundTo(value: number, d: number): number {
  const factor = 10 ** d;
  return Math.round(value * factor) / factor;
}

/**
 * Recompute TestStats from a subset of records. Matches api/main.py:258-305
 * so the dashboard's KPI cards can show simulated values identically to the
 * backend's real stats.
 */
export function simulateStats(subset: TestRecord[]): TestStats {
  const total_tests = subset.length;

  if (total_tests === 0) {
    return {
      total_tests: 0,
      pass_rate: 0,
      counts_by_sensor: {},
      counts_by_feature: {},
      counts_by_result: {},
      mean_detection_distance: 0,
      mean_false_positive_rate: 0,
    };
  }

  const counts_by_sensor: Record<string, number> = {};
  const counts_by_feature: Record<string, number> = {};
  const counts_by_result: Record<string, number> = {};
  let passCount = 0;
  let distanceSum = 0;
  let fprSum = 0;

  for (const t of subset) {
    counts_by_sensor[t.sensor_type] =
      (counts_by_sensor[t.sensor_type] ?? 0) + 1;
    counts_by_feature[t.feature] = (counts_by_feature[t.feature] ?? 0) + 1;
    counts_by_result[t.result] = (counts_by_result[t.result] ?? 0) + 1;
    if (t.result === 'pass') passCount += 1;
    distanceSum += t.detection_distance_m;
    fprSum += t.false_positive_rate;
  }

  return {
    total_tests,
    pass_rate: roundTo(passCount / total_tests, 4),
    counts_by_sensor,
    counts_by_feature,
    counts_by_result,
    mean_detection_distance: roundTo(distanceSum / total_tests, 2),
    mean_false_positive_rate: roundTo(fprSum / total_tests, 5),
  };
}
