/**
 * simulations.ts — pure threshold filter + stats recomputation tests.
 *
 * Validates predicate boundary inclusion, combined filters, and that
 * simulateStats mirrors the backend aggregation shape.
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SIM_PARAMS,
  simulateFiltered,
  simulateStats,
  type SimulationParams,
} from '@/lib/simulations';
import type { TestRecord } from '@/lib/types';

let idCounter = 0;
function record(overrides: Partial<TestRecord> = {}): TestRecord {
  idCounter += 1;
  return {
    test_id: `TC-SIM-${String(idCounter).padStart(5, '0')}`,
    sensor_type: 'camera',
    scenario: 'x',
    scenario_tags: [],
    feature: 'AEB',
    result: 'pass',
    confidence_score: 0.9,
    detection_distance_m: 50,
    false_positive_rate: 0.02,
    execution_time_ms: 100,
    timestamp: '2026-04-05T12:00:00Z',
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.1',
    notes: '',
    ...overrides,
  };
}

describe('DEFAULT_SIM_PARAMS', () => {
  it('is a no-op (all tests pass through)', () => {
    const tests = [
      record({ confidence_score: 0, false_positive_rate: 1, detection_distance_m: 0 }),
      record({ confidence_score: 1, false_positive_rate: 0, detection_distance_m: 500 }),
    ];
    expect(simulateFiltered(tests, DEFAULT_SIM_PARAMS)).toHaveLength(2);
  });
});

describe('simulateFiltered', () => {
  it('filters on min_confidence (inclusive lower bound)', () => {
    const tests = [
      record({ confidence_score: 0.49 }),
      record({ confidence_score: 0.5 }),
      record({ confidence_score: 0.9 }),
    ];
    const params: SimulationParams = { ...DEFAULT_SIM_PARAMS, min_confidence: 0.5 };
    const kept = simulateFiltered(tests, params);
    expect(kept).toHaveLength(2);
    expect(kept.every((t) => t.confidence_score >= 0.5)).toBe(true);
  });

  it('filters on max_fpr (inclusive upper bound)', () => {
    const tests = [
      record({ false_positive_rate: 0.02 }),
      record({ false_positive_rate: 0.05 }),
      record({ false_positive_rate: 0.06 }),
    ];
    const params: SimulationParams = { ...DEFAULT_SIM_PARAMS, max_fpr: 0.05 };
    const kept = simulateFiltered(tests, params);
    expect(kept).toHaveLength(2);
    expect(kept.every((t) => t.false_positive_rate <= 0.05)).toBe(true);
  });

  it('filters on min_distance (inclusive lower bound)', () => {
    const tests = [
      record({ detection_distance_m: 9 }),
      record({ detection_distance_m: 10 }),
      record({ detection_distance_m: 100 }),
    ];
    const params: SimulationParams = { ...DEFAULT_SIM_PARAMS, min_distance: 10 };
    const kept = simulateFiltered(tests, params);
    expect(kept).toHaveLength(2);
  });

  it('combines all three predicates', () => {
    const tests = [
      record({
        confidence_score: 0.9,
        false_positive_rate: 0.01,
        detection_distance_m: 80,
      }), // passes all
      record({
        confidence_score: 0.4,
        false_positive_rate: 0.01,
        detection_distance_m: 80,
      }), // fails confidence
      record({
        confidence_score: 0.9,
        false_positive_rate: 0.08,
        detection_distance_m: 80,
      }), // fails fpr
      record({
        confidence_score: 0.9,
        false_positive_rate: 0.01,
        detection_distance_m: 20,
      }), // fails distance
    ];
    const params: SimulationParams = {
      min_confidence: 0.7,
      max_fpr: 0.05,
      min_distance: 50,
    };
    expect(simulateFiltered(tests, params)).toHaveLength(1);
  });

  it('returns empty subset gracefully', () => {
    expect(simulateFiltered([], DEFAULT_SIM_PARAMS)).toEqual([]);
  });
});

describe('simulateStats', () => {
  it('returns zeroed stats for empty subset', () => {
    const s = simulateStats([]);
    expect(s.total_tests).toBe(0);
    expect(s.pass_rate).toBe(0);
    expect(s.mean_detection_distance).toBe(0);
    expect(s.mean_false_positive_rate).toBe(0);
    expect(s.counts_by_sensor).toEqual({});
  });

  it('computes counts + means matching backend logic', () => {
    const subset = [
      record({
        sensor_type: 'camera',
        feature: 'AEB',
        result: 'pass',
        detection_distance_m: 60,
        false_positive_rate: 0.01,
      }),
      record({
        sensor_type: 'camera',
        feature: 'FCW',
        result: 'fail',
        detection_distance_m: 40,
        false_positive_rate: 0.05,
      }),
      record({
        sensor_type: 'radar',
        feature: 'AEB',
        result: 'pass',
        detection_distance_m: 80,
        false_positive_rate: 0.02,
      }),
      record({
        sensor_type: 'radar',
        feature: 'LCA',
        result: 'warning',
        detection_distance_m: 50,
        false_positive_rate: 0.03,
      }),
    ];
    const s = simulateStats(subset);
    expect(s.total_tests).toBe(4);
    // 2 pass / 4 total = 0.5
    expect(s.pass_rate).toBe(0.5);
    expect(s.counts_by_sensor).toEqual({ camera: 2, radar: 2 });
    expect(s.counts_by_feature).toEqual({ AEB: 2, FCW: 1, LCA: 1 });
    expect(s.counts_by_result).toEqual({ pass: 2, fail: 1, warning: 1 });
    // mean distance = (60+40+80+50)/4 = 57.5
    expect(s.mean_detection_distance).toBe(57.5);
    // mean fpr = (0.01+0.05+0.02+0.03)/4 = 0.0275
    expect(s.mean_false_positive_rate).toBe(0.0275);
  });

  it('rounds pass_rate to 4 decimals', () => {
    // 1 pass / 3 total = 0.3333...
    const subset = [
      record({ result: 'pass' }),
      record({ result: 'fail' }),
      record({ result: 'fail' }),
    ];
    const s = simulateStats(subset);
    expect(s.pass_rate).toBe(0.3333);
  });

  it('rounds mean_detection_distance to 2 decimals', () => {
    const subset = [
      record({ detection_distance_m: 50.123 }),
      record({ detection_distance_m: 50.456 }),
    ];
    const s = simulateStats(subset);
    // (50.123+50.456)/2 = 50.2895 → round 2dp → 50.29
    expect(s.mean_detection_distance).toBe(50.29);
  });
});
