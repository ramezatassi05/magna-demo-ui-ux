/**
 * Fixture data for Storybook stories. Mirrors the TestRecord / UiMessage
 * shapes defined in nextjs-app/lib/types.ts and hooks/use-agent-chat.ts.
 *
 * Keep counts small (≤ 15 records) — stories are rendered per-variant and
 * larger fixtures inflate preview iframe load times.
 */

import type {
  ChartData,
  TableData,
  TestCase,
  TestCasesData,
  TestFilters,
  TestRecord,
  TrendPoint,
} from '../../lib/types';
import type { UiMessage } from '../../hooks/use-agent-chat';

// -----------------------------------------------------------------------------
// Test records — 12 rows covering all sensors, results, and a variety of
// features so TestResultsTable stories show a realistic spread.
// -----------------------------------------------------------------------------

export const MOCK_TEST_RECORDS: TestRecord[] = [
  {
    test_id: 'TC-2026-00142',
    sensor_type: 'camera',
    scenario: 'Pedestrian crossing, rainy, night',
    scenario_tags: ['pedestrian', 'rain', 'night', 'urban'],
    feature: 'AEB',
    result: 'fail',
    confidence_score: 0.42,
    detection_distance_m: 28.4,
    false_positive_rate: 0.018,
    execution_time_ms: 1820,
    timestamp: '2026-03-28T14:30:00Z',
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.1',
    notes: 'Missed detection at 45m in heavy rain',
  },
  {
    test_id: 'TC-2026-00143',
    sensor_type: 'radar',
    scenario: 'Highway cut-in, clear, day',
    scenario_tags: ['vehicle', 'clear', 'day', 'highway'],
    feature: 'ACC',
    result: 'pass',
    confidence_score: 0.94,
    detection_distance_m: 112.6,
    false_positive_rate: 0.003,
    execution_time_ms: 680,
    timestamp: '2026-03-28T15:12:00Z',
    vehicle_model: 'Sedan-M3',
    firmware_version: 'v4.2.1',
    notes: 'Consistent tracking through lane transition',
  },
  {
    test_id: 'TC-2026-00144',
    sensor_type: 'thermal',
    scenario: 'Cyclist, fog, dusk',
    scenario_tags: ['cyclist', 'fog', 'dusk', 'urban'],
    feature: 'FCW',
    result: 'warning',
    confidence_score: 0.71,
    detection_distance_m: 52.1,
    false_positive_rate: 0.012,
    execution_time_ms: 1240,
    timestamp: '2026-03-27T09:45:00Z',
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.0',
    notes: 'Latency spike at 52m — below warning threshold',
  },
  {
    test_id: 'TC-2026-00145',
    sensor_type: 'lidar',
    scenario: 'Vehicle stopped, clear, day, highway',
    scenario_tags: ['vehicle', 'clear', 'day', 'highway'],
    feature: 'AEB',
    result: 'pass',
    confidence_score: 0.97,
    detection_distance_m: 134.2,
    false_positive_rate: 0.001,
    execution_time_ms: 520,
    timestamp: '2026-03-27T11:22:00Z',
    vehicle_model: 'Truck-T7',
    firmware_version: 'v4.2.1',
    notes: 'Clean return, within spec',
  },
  {
    test_id: 'TC-2026-00146',
    sensor_type: 'camera',
    scenario: 'Speed sign, snow, day',
    scenario_tags: ['sign', 'snow', 'day', 'rural'],
    feature: 'TSR',
    result: 'fail',
    confidence_score: 0.38,
    detection_distance_m: 22.0,
    false_positive_rate: 0.031,
    execution_time_ms: 2100,
    timestamp: '2026-03-26T16:05:00Z',
    vehicle_model: 'Sedan-M3',
    firmware_version: 'v4.2.1',
    notes: 'Sign partially occluded by snow accumulation',
  },
  {
    test_id: 'TC-2026-00147',
    sensor_type: 'radar',
    scenario: 'Lane change, clear, dusk',
    scenario_tags: ['vehicle', 'clear', 'dusk', 'highway'],
    feature: 'LCA',
    result: 'pass',
    confidence_score: 0.89,
    detection_distance_m: 78.3,
    false_positive_rate: 0.005,
    execution_time_ms: 720,
    timestamp: '2026-03-26T18:40:00Z',
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.1',
    notes: 'Blind-spot coverage verified',
  },
  {
    test_id: 'TC-2026-00148',
    sensor_type: 'camera',
    scenario: 'Pedestrian, clear, day, intersection',
    scenario_tags: ['pedestrian', 'clear', 'day', 'urban'],
    feature: 'AEB',
    result: 'pass',
    confidence_score: 0.92,
    detection_distance_m: 48.7,
    false_positive_rate: 0.004,
    execution_time_ms: 890,
    timestamp: '2026-03-25T10:15:00Z',
    vehicle_model: 'Sedan-M3',
    firmware_version: 'v4.2.1',
    notes: 'Early detection at 48m',
  },
  {
    test_id: 'TC-2026-00149',
    sensor_type: 'thermal',
    scenario: 'Animal crossing, clear, night, rural',
    scenario_tags: ['animal', 'clear', 'night', 'rural'],
    feature: 'FCW',
    result: 'pass',
    confidence_score: 0.86,
    detection_distance_m: 64.5,
    false_positive_rate: 0.008,
    execution_time_ms: 1100,
    timestamp: '2026-03-25T22:50:00Z',
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.1',
    notes: 'Deer detected at 64m',
  },
  {
    test_id: 'TC-2026-00150',
    sensor_type: 'radar',
    scenario: 'Vehicle merging, rain, night',
    scenario_tags: ['vehicle', 'rain', 'night', 'highway'],
    feature: 'BSD',
    result: 'warning',
    confidence_score: 0.68,
    detection_distance_m: 31.9,
    false_positive_rate: 0.015,
    execution_time_ms: 950,
    timestamp: '2026-03-24T20:10:00Z',
    vehicle_model: 'Truck-T7',
    firmware_version: 'v4.2.0',
    notes: 'Confidence below target in wet conditions',
  },
  {
    test_id: 'TC-2026-00151',
    sensor_type: 'lidar',
    scenario: 'Intersection, clear, day',
    scenario_tags: ['vehicle', 'clear', 'day', 'urban'],
    feature: 'AEB',
    result: 'pass',
    confidence_score: 0.95,
    detection_distance_m: 88.4,
    false_positive_rate: 0.002,
    execution_time_ms: 560,
    timestamp: '2026-03-24T13:25:00Z',
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.1',
    notes: 'Multi-object tracking stable',
  },
  {
    test_id: 'TC-2026-00152',
    sensor_type: 'camera',
    scenario: 'Stop sign, clear, day, urban',
    scenario_tags: ['sign', 'clear', 'day', 'urban'],
    feature: 'TSR',
    result: 'pass',
    confidence_score: 0.91,
    detection_distance_m: 34.2,
    false_positive_rate: 0.006,
    execution_time_ms: 780,
    timestamp: '2026-03-23T11:30:00Z',
    vehicle_model: 'Sedan-M3',
    firmware_version: 'v4.2.1',
    notes: 'Sign correctly classified and tracked',
  },
  {
    test_id: 'TC-2026-00153',
    sensor_type: 'thermal',
    scenario: 'Pedestrian group, fog, night',
    scenario_tags: ['pedestrian', 'fog', 'night', 'urban'],
    feature: 'AEB',
    result: 'fail',
    confidence_score: 0.45,
    detection_distance_m: 18.6,
    false_positive_rate: 0.022,
    execution_time_ms: 1960,
    timestamp: '2026-03-23T23:05:00Z',
    vehicle_model: 'Truck-T7',
    firmware_version: 'v4.2.1',
    notes: 'Fog scattering reduced effective range',
  },
];

// -----------------------------------------------------------------------------
// TestFilters fixtures
// -----------------------------------------------------------------------------

export const MOCK_FILTERS_EMPTY: TestFilters = {
  page: 1,
  page_size: 20,
};

export const MOCK_FILTERS_ACTIVE: TestFilters = {
  sensor_type: 'camera',
  result: 'fail',
  feature: 'AEB',
  date_from: '2026-03-20',
  date_to: '2026-03-30',
  search: 'pedestrian',
  page: 1,
  page_size: 20,
};

export const MOCK_FILTERS_SEARCH_ONLY: TestFilters = {
  search: 'rainy',
  page: 1,
  page_size: 20,
};

// -----------------------------------------------------------------------------
// Trend data for charts
// -----------------------------------------------------------------------------

export const MOCK_TREND_DATA: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = new Date('2026-03-01T00:00:00Z');
  day.setUTCDate(day.getUTCDate() + i);
  // Deterministic oscillation so charts look organic without random jitter.
  const base = Math.floor(12 + Math.sin(i / 3) * 4);
  return {
    date: day.toISOString().slice(0, 10),
    pass: 80 + Math.floor(Math.cos(i / 4) * 8),
    fail: Math.max(1, base - 8),
    warning: Math.max(0, Math.floor(3 + Math.sin(i / 5) * 2)),
  };
});

// -----------------------------------------------------------------------------
// Donut segment counts
// -----------------------------------------------------------------------------

export const MOCK_DONUT_COUNTS: Record<string, number> = {
  pass: 392,
  fail: 68,
  warning: 40,
};

// -----------------------------------------------------------------------------
// Structured chart + table payloads (what the agent returns inline in chat)
// -----------------------------------------------------------------------------

export const MOCK_INLINE_BAR_CHART: ChartData = {
  chart_type: 'bar',
  title: 'Pass rate by sensor (last 30d)',
  x_key: 'sensor',
  y_keys: ['pass_rate'],
  data: [
    { sensor: 'Camera', pass_rate: 72 },
    { sensor: 'Radar', pass_rate: 88 },
    { sensor: 'Thermal', pass_rate: 64 },
    { sensor: 'LiDAR', pass_rate: 91 },
  ],
};

export const MOCK_INLINE_LINE_CHART: ChartData = {
  chart_type: 'line',
  title: 'Daily failures (last 14d)',
  x_key: 'date',
  y_keys: ['fail'],
  data: MOCK_TREND_DATA.slice(-14).map((p) => ({ date: p.date, fail: p.fail })),
};

export const MOCK_INLINE_TABLE: TableData = {
  title: 'Failed AEB runs this week',
  columns: [
    { key: 'test_id', label: 'Test ID' },
    { key: 'sensor_type', label: 'Sensor' },
    { key: 'confidence_score', label: 'Conf.', format: 'percent' },
    { key: 'detection_distance_m', label: 'Distance (m)', format: 'number' },
  ],
  rows: MOCK_TEST_RECORDS.filter((r) => r.result === 'fail').map((r) => ({
    test_id: r.test_id,
    sensor_type: r.sensor_type,
    confidence_score: r.confidence_score,
    detection_distance_m: r.detection_distance_m,
  })),
  total_rows: 3,
  truncated: false,
};

// -----------------------------------------------------------------------------
// Test cases (AI-generated)
// -----------------------------------------------------------------------------

const SAMPLE_TEST_CASES: TestCase[] = [
  {
    test_id: 'TC-AEB-0001',
    title: 'Pedestrian crossing at night, light rain',
    preconditions: [
      'Vehicle traveling at 40 km/h',
      'Dry pavement, ambient temperature 8°C',
      'Forward-facing camera + radar active',
    ],
    steps: [
      'Pedestrian enters crosswalk at 30m distance',
      'Vehicle approaches without driver input',
      'System initiates braking at TTC = 1.8s',
    ],
    expected_result: 'Vehicle comes to a complete stop before the crosswalk',
    pass_criteria: 'Stop distance > 2m from pedestrian; deceleration ≤ 9 m/s²',
    priority: 'high',
    estimated_duration_min: 12,
    confidence: 'high',
  },
  {
    test_id: 'TC-AEB-0002',
    title: 'Stationary vehicle detection on highway',
    preconditions: [
      'Vehicle traveling at 110 km/h',
      'Clear visibility, daytime',
      'Radar + LiDAR fusion active',
    ],
    steps: [
      'Stopped vehicle detected at 120m',
      'Driver takes no action',
      'AEB engages at 2.2s TTC',
    ],
    expected_result: 'Full braking engaged with no false triggers',
    pass_criteria: 'Stop distance > 5m; no FCW cancellation by driver override',
    priority: 'high',
    estimated_duration_min: 15,
    confidence: 'medium',
  },
];

export const MOCK_TEST_CASES_DATA: TestCasesData = {
  requirement:
    'Validate AEB performance for adult pedestrians crossing the vehicle path in low-light conditions',
  feature: 'AEB',
  cases: SAMPLE_TEST_CASES,
};

// -----------------------------------------------------------------------------
// Chat message fixtures — structured to mirror UiMessage union from
// hooks/use-agent-chat.ts.
// -----------------------------------------------------------------------------

export const MOCK_CHAT_MESSAGES_EMPTY: UiMessage[] = [];

export const MOCK_CHAT_MESSAGES_WITH_RESPONSES: UiMessage[] = [
  {
    id: 'u-1',
    role: 'user',
    content: 'Show me failed tests this week',
  },
  {
    id: 'a-1',
    role: 'assistant',
    text: 'Here are the failed validation runs from the last 7 days. Camera-AEB failures dominate — three of them involve adverse weather.',
    thinking: [
      'User wants failed tests from the last 7 days',
      'Querying test records with result=fail and date_from=7d ago',
      'Formatting results as inline table',
    ],
    toolCalls: [
      {
        id: 'tc-1',
        name: 'query_tests',
        args: { result: 'fail', date_from: '2026-03-21' },
        status: 'ok',
        preview: '3 records returned',
      },
    ],
    attachments: [{ kind: 'table', data: MOCK_INLINE_TABLE }],
    doneMeta: { duration_ms: 1420, tool_calls: 1 },
  },
];

export const MOCK_CHAT_THINKING: UiMessage[] = [
  {
    id: 'u-2',
    role: 'user',
    content: 'Compare sensor pass rates',
  },
  {
    id: 'a-2',
    role: 'assistant',
    text: '',
    thinking: [
      'Aggregating counts_by_result grouped by sensor_type',
      'Computing pass rate = pass / total per sensor',
    ],
    toolCalls: [
      {
        id: 'tc-2',
        name: 'summarize_results',
        args: { group_by: 'sensor_type' },
        status: 'running',
      },
    ],
    attachments: [],
  },
];

export const MOCK_CHAT_WITH_CHART: UiMessage[] = [
  {
    id: 'u-3',
    role: 'user',
    content: 'Compare sensor pass rates',
  },
  {
    id: 'a-3',
    role: 'assistant',
    text: 'LiDAR and radar lead at 91% and 88%. Thermal lags at 64% — largely driven by fog/night false negatives.',
    thinking: [
      'Aggregating counts_by_result grouped by sensor_type',
      'Computing pass rate per sensor',
      'Rendering as bar chart',
    ],
    toolCalls: [
      {
        id: 'tc-3',
        name: 'generate_chart_data',
        args: { metric: 'pass_rate', group_by: 'sensor_type' },
        status: 'ok',
        preview: '4 series returned',
      },
    ],
    attachments: [{ kind: 'chart', data: MOCK_INLINE_BAR_CHART }],
    doneMeta: { duration_ms: 980, tool_calls: 1 },
  },
];
