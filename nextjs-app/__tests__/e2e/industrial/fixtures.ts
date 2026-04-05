/**
 * Shared fixtures for Phase G industrial E2E specs.
 *
 * These fixtures are deliberately crafted to trip anomaly thresholds so the
 * industrial components (DynamicTaskCard, KPI anomaly corners, row strips,
 * etc.) render without depending on the FastAPI backend:
 *
 *   - pass_rate = 0.78   → breaches PASS_RATE_THRESHOLD (0.88)
 *   - mean_false_positive_rate = 0.035 → breaches FPR_THRESHOLD (0.03)
 *   - trends: last 7d shows regression vs prior 7d
 *   - tests: 3 clustered thermal AEB failures within 24h, all with
 *            confidence < 0.5 → produces a CRITICAL task card
 *
 * Thresholds live in `nextjs-app/lib/operations.ts`. Timestamps are dynamic
 * (`Date.now() - Nd`) so recency scoring stays valid regardless of when
 * the suite runs.
 */

import type { Page, Route } from '@playwright/test';

// -----------------------------------------------------------------------------
// Fixtures — dashboard KPI stats (anomaly-tripping)
// -----------------------------------------------------------------------------

export const ANOMALY_STATS = {
  total_tests: 527,
  pass_rate: 0.78, // < 0.88 threshold
  counts_by_sensor: { camera: 180, radar: 130, thermal: 140, lidar: 77 },
  counts_by_feature: { AEB: 120, FCW: 90, LCA: 85, BSD: 70, ACC: 100, TSR: 62 },
  counts_by_result: { pass: 411, fail: 82, warning: 34 },
  mean_detection_distance: 87.3,
  mean_false_positive_rate: 0.035, // > 0.03 threshold
};

// -----------------------------------------------------------------------------
// Fixtures — trends (30 days, with regression last 7d vs prior 7d)
// -----------------------------------------------------------------------------

function isoDay(offsetDaysAgo: number): string {
  const d = new Date(Date.now() - offsetDaysAgo * 24 * 60 * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 30 points, newest last. Days 0-6 (last 7d) dip to ~8 passes/day,
 *  days 7-13 (prior 7d) average ~15 passes/day → >5% regression. */
export const REGRESSION_TRENDS = Array.from({ length: 30 }, (_, i) => {
  const daysAgo = 29 - i; // i=0 is oldest, i=29 is today
  const inLast7 = daysAgo <= 6;
  const inPrior7 = daysAgo >= 7 && daysAgo <= 13;
  return {
    date: isoDay(daysAgo),
    pass: inLast7 ? 8 : inPrior7 ? 15 : 12,
    fail: inLast7 ? 5 : inPrior7 ? 2 : 3,
    warning: 1,
  };
});

// -----------------------------------------------------------------------------
// Fixtures — test records (clustered critical + varied rows)
// -----------------------------------------------------------------------------

type SensorType = 'camera' | 'radar' | 'thermal' | 'lidar';
type Feature = 'AEB' | 'FCW' | 'LCA' | 'BSD' | 'ACC' | 'TSR';
type Result = 'pass' | 'fail' | 'warning';
type VehicleModel = 'SUV-X1' | 'Sedan-M3' | 'Truck-T7';

function isoMinute(offsetMinutesAgo: number): string {
  return new Date(Date.now() - offsetMinutesAgo * 60 * 1000).toISOString();
}

function record(overrides: {
  test_id: string;
  sensor_type: SensorType;
  feature: Feature;
  result: Result;
  confidence_score: number;
  false_positive_rate?: number;
  detection_distance_m?: number;
  minutesAgo: number;
  notes?: string;
  scenario?: string;
}): {
  test_id: string;
  sensor_type: SensorType;
  scenario: string;
  scenario_tags: string[];
  feature: Feature;
  result: Result;
  confidence_score: number;
  detection_distance_m: number;
  false_positive_rate: number;
  execution_time_ms: number;
  timestamp: string;
  vehicle_model: VehicleModel;
  firmware_version: string;
  notes: string;
} {
  return {
    test_id: overrides.test_id,
    sensor_type: overrides.sensor_type,
    scenario: overrides.scenario ?? 'Pedestrian crossing, rainy, night',
    scenario_tags: ['pedestrian', 'rain', 'night'],
    feature: overrides.feature,
    result: overrides.result,
    confidence_score: overrides.confidence_score,
    detection_distance_m: overrides.detection_distance_m ?? 45.0,
    false_positive_rate: overrides.false_positive_rate ?? 0.02,
    execution_time_ms: 1200,
    timestamp: isoMinute(overrides.minutesAgo),
    vehicle_model: 'SUV-X1',
    firmware_version: 'v4.2.1',
    notes: overrides.notes ?? '',
  };
}

/**
 * 20 records hand-crafted to produce:
 *  - a CRITICAL thermal+AEB cluster of 3 recent failures (conf < 0.5 + "regression" notes)
 *  - a few anomaly camera/radar failures
 *  - watch + pass rows for table diversity
 */
export const ANOMALY_TESTS = [
  // --- Critical cluster: 3 thermal AEB fails within 24h, confidence < 0.5,
  //     notes contain "regression" → all rank as CRITICAL in isRowAnomaly
  record({
    test_id: 'TC-2026-04001',
    sensor_type: 'thermal',
    feature: 'AEB',
    result: 'fail',
    confidence_score: 0.42,
    false_positive_rate: 0.06,
    minutesAgo: 60,
    notes: 'Missed detection at 45m in heavy rain — regression vs v4.2.0',
  }),
  record({
    test_id: 'TC-2026-04002',
    sensor_type: 'thermal',
    feature: 'AEB',
    result: 'fail',
    confidence_score: 0.38,
    false_positive_rate: 0.07,
    minutesAgo: 300,
    notes: 'Thermal noise regression at long range',
  }),
  record({
    test_id: 'TC-2026-04003',
    sensor_type: 'thermal',
    feature: 'AEB',
    result: 'fail',
    confidence_score: 0.45,
    false_positive_rate: 0.055,
    minutesAgo: 900,
    notes: 'Late detection — regression under fog',
  }),
  // --- Anomaly camera FCW failures (not clustered, no regression)
  record({
    test_id: 'TC-2026-04010',
    sensor_type: 'camera',
    feature: 'FCW',
    result: 'fail',
    confidence_score: 0.62,
    false_positive_rate: 0.04,
    minutesAgo: 1200,
    notes: 'FP on cyclist silhouette',
  }),
  record({
    test_id: 'TC-2026-04011',
    sensor_type: 'camera',
    feature: 'FCW',
    result: 'fail',
    confidence_score: 0.58,
    false_positive_rate: 0.045,
    minutesAgo: 2400,
    notes: 'FP on cyclist silhouette',
  }),
  // --- Radar LCA failures
  record({
    test_id: 'TC-2026-04020',
    sensor_type: 'radar',
    feature: 'LCA',
    result: 'fail',
    confidence_score: 0.55,
    false_positive_rate: 0.032,
    minutesAgo: 3600,
    notes: 'Missed side vehicle at 30m',
  }),
  // --- Warnings
  record({
    test_id: 'TC-2026-04030',
    sensor_type: 'camera',
    feature: 'TSR',
    result: 'warning',
    confidence_score: 0.68,
    minutesAgo: 500,
    notes: 'Low confidence sign read',
  }),
  record({
    test_id: 'TC-2026-04031',
    sensor_type: 'lidar',
    feature: 'ACC',
    result: 'warning',
    confidence_score: 0.72,
    minutesAgo: 1800,
    notes: 'Gap detection marginal',
  }),
  // --- Passes (diverse sensors/features, high confidence)
  record({
    test_id: 'TC-2026-04100',
    sensor_type: 'camera',
    feature: 'AEB',
    result: 'pass',
    confidence_score: 0.94,
    minutesAgo: 180,
  }),
  record({
    test_id: 'TC-2026-04101',
    sensor_type: 'radar',
    feature: 'BSD',
    result: 'pass',
    confidence_score: 0.91,
    minutesAgo: 420,
  }),
  record({
    test_id: 'TC-2026-04102',
    sensor_type: 'lidar',
    feature: 'ACC',
    result: 'pass',
    confidence_score: 0.88,
    minutesAgo: 600,
  }),
  record({
    test_id: 'TC-2026-04103',
    sensor_type: 'camera',
    feature: 'LCA',
    result: 'pass',
    confidence_score: 0.87,
    minutesAgo: 720,
  }),
  record({
    test_id: 'TC-2026-04104',
    sensor_type: 'thermal',
    feature: 'FCW',
    result: 'pass',
    confidence_score: 0.82,
    minutesAgo: 1440,
  }),
  record({
    test_id: 'TC-2026-04105',
    sensor_type: 'radar',
    feature: 'ACC',
    result: 'pass',
    confidence_score: 0.95,
    minutesAgo: 2160,
  }),
  record({
    test_id: 'TC-2026-04106',
    sensor_type: 'lidar',
    feature: 'AEB',
    result: 'pass',
    confidence_score: 0.89,
    minutesAgo: 2880,
  }),
  record({
    test_id: 'TC-2026-04107',
    sensor_type: 'camera',
    feature: 'TSR',
    result: 'pass',
    confidence_score: 0.93,
    minutesAgo: 3600,
  }),
  record({
    test_id: 'TC-2026-04108',
    sensor_type: 'thermal',
    feature: 'BSD',
    result: 'pass',
    confidence_score: 0.81,
    minutesAgo: 4320,
  }),
  record({
    test_id: 'TC-2026-04109',
    sensor_type: 'radar',
    feature: 'FCW',
    result: 'pass',
    confidence_score: 0.86,
    minutesAgo: 5040,
  }),
  record({
    test_id: 'TC-2026-04110',
    sensor_type: 'camera',
    feature: 'ACC',
    result: 'pass',
    confidence_score: 0.84,
    minutesAgo: 5760,
  }),
  record({
    test_id: 'TC-2026-04111',
    sensor_type: 'lidar',
    feature: 'LCA',
    result: 'pass',
    confidence_score: 0.9,
    minutesAgo: 6480,
  }),
];

// -----------------------------------------------------------------------------
// Mock-route helpers
// -----------------------------------------------------------------------------

export function fulfillJson(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * Paginate a list of records into the {items, page, page_size, total,
 * total_pages} shape returned by GET /api/tests.
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
} {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total: items.length,
    total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

/**
 * Parse a URL's searchParams and filter ANOMALY_TESTS client-side so the
 * Results page honours sensor_type / result / feature / search filters.
 */
export function filterTests(
  url: string,
  source: typeof ANOMALY_TESTS = ANOMALY_TESTS,
): typeof ANOMALY_TESTS {
  const q = new URL(url).searchParams;
  const sensor = q.get('sensor_type');
  const result = q.get('result');
  const feature = q.get('feature');
  const search = q.get('search');
  return source.filter((t) => {
    if (sensor && t.sensor_type !== sensor) return false;
    if (result && t.result !== result) return false;
    if (feature && t.feature !== feature) return false;
    if (search) {
      const hay = `${t.scenario} ${t.notes}`.toLowerCase();
      const needle = search.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

// -----------------------------------------------------------------------------
// Standard mock installer — call in beforeEach
// -----------------------------------------------------------------------------

/**
 * Install the full suite of /api mocks + Next dev overlay neutralizer.
 * Returns nothing — call once in test.beforeEach before page.goto().
 */
export async function installIndustrialMocks(page: Page): Promise<void> {
  // Hide Next.js dev overlay (same pattern as dashboard.spec.ts).
  await page.addInitScript(() => {
    const neutralize = () => {
      document.querySelectorAll('nextjs-portal').forEach((el) => {
        (el as HTMLElement).style.pointerEvents = 'none';
        (el as HTMLElement).style.display = 'none';
      });
    };
    new MutationObserver(neutralize).observe(document.documentElement, {
      subtree: true,
      childList: true,
    });
    neutralize();
  });

  // Dashboard KPI stats
  await page.route('**/api/stats', (route) => fulfillJson(route, ANOMALY_STATS));

  // Daily trend line
  await page.route('**/api/stats/trends', (route) =>
    fulfillJson(route, REGRESSION_TRENDS),
  );

  // Paginated + filtered test list (also powers useAllTests + useRecentFailures)
  await page.route('**/api/tests?**', (route) => {
    const url = route.request().url();
    const filtered = filterTests(url);
    const q = new URL(url).searchParams;
    const pageNum = Number(q.get('page') ?? '1') || 1;
    const pageSize = Number(q.get('page_size') ?? '25') || 25;
    return fulfillJson(route, paginate(filtered, pageNum, pageSize));
  });
}

// -----------------------------------------------------------------------------
// SSE chat stream builders (G1.5, G1.6, G1.7)
// -----------------------------------------------------------------------------

export function sseFrame(payload: object): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * 2 tool calls + text + done. Used by the DecisionTrace spec — exercises the
 * tree's ≥2 treeitem case with findings as nested children.
 */
export const SSE_TWO_TOOLS = [
  sseFrame({
    type: 'thinking',
    message: 'Investigating failed thermal AEB runs from the last 24 hours.',
  }),
  sseFrame({
    type: 'tool_call',
    tool_call_id: 'tc_1',
    tool_name: 'query_tests',
    args: { sensor_type: 'thermal', feature: 'AEB', result: 'fail' },
  }),
  sseFrame({
    type: 'tool_result',
    tool_call_id: 'tc_1',
    tool_name: 'query_tests',
    status: 'ok',
    preview: '{"row_count":3,"top_feature":"AEB"}',
  }),
  sseFrame({
    type: 'thinking',
    message: 'Summarizing the failure pattern.',
  }),
  sseFrame({
    type: 'tool_call',
    tool_call_id: 'tc_2',
    tool_name: 'summarize_results',
    args: { rows: 3 },
  }),
  sseFrame({
    type: 'tool_result',
    tool_call_id: 'tc_2',
    tool_name: 'summarize_results',
    status: 'ok',
    preview: '{"critical_count":3,"avg_confidence":0.42,"top_sensor":"thermal"}',
  }),
  sseFrame({
    type: 'text',
    delta: 'Found 3 thermal AEB regressions with avg confidence 42%.',
  }),
  sseFrame({ type: 'done', duration_ms: 1840, tool_calls: 2 }),
].join('');
