/**
 * Types mirror the Pydantic models in `api/main.py` and the SSE event schema
 * emitted by `api/agent.py`. Keep this file in sync with the backend.
 *
 * Source references:
 *   - api/main.py:32-83  (REST models)
 *   - api/agent.py       (SSE event stream)
 *   - api/tools.py       (tool output shapes)
 */

// -----------------------------------------------------------------------------
// Primitive enums
// -----------------------------------------------------------------------------

export type SensorType = 'camera' | 'radar' | 'thermal' | 'lidar';

export type TestResult = 'pass' | 'fail' | 'warning';

/** AEB, FCW, LCA, BSD, ACC, TSR — see CLAUDE.md:239-244 for descriptions. */
export type Feature = 'AEB' | 'FCW' | 'LCA' | 'BSD' | 'ACC' | 'TSR';

export type VehicleModel = 'SUV-X1' | 'Sedan-M3' | 'Truck-T7';

// -----------------------------------------------------------------------------
// REST API models — mirrors api/main.py Pydantic classes
// -----------------------------------------------------------------------------

/** Single ADAS test record — api/main.py:32-46 */
export interface TestRecord {
  test_id: string;                    // e.g. "TC-2026-00142"
  sensor_type: SensorType;
  scenario: string;                   // e.g. "Pedestrian crossing, rainy, night"
  scenario_tags: string[];            // e.g. ["pedestrian", "rain", "night"]
  feature: Feature;
  result: TestResult;
  confidence_score: number;           // 0.0–1.0
  detection_distance_m: number;
  false_positive_rate: number;
  execution_time_ms: number;
  timestamp: string;                  // ISO 8601 UTC
  vehicle_model: VehicleModel;
  firmware_version: string;           // e.g. "v4.2.1"
  notes: string;
}

/** Paginated wrapper — api/main.py:49-54 */
export interface PaginatedTests {
  items: TestRecord[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

/** Aggregate statistics — api/main.py:57-64 */
export interface TestStats {
  total_tests: number;
  pass_rate: number;                  // 0.0–1.0 (4 decimal places)
  counts_by_sensor: Record<string, number>;
  counts_by_feature: Record<string, number>;
  counts_by_result: Record<string, number>;
  mean_detection_distance: number;
  mean_false_positive_rate: number;
}

/** Daily trend point — api/main.py:67-73. JSON field is `pass` (Pydantic alias). */
export interface TrendPoint {
  date: string;                       // YYYY-MM-DD
  pass: number;
  fail: number;
  warning: number;
}

/** Filters accepted by GET /api/tests (api/main.py:129-138). */
export interface TestFilters {
  sensor_type?: SensorType;
  result?: TestResult;
  feature?: Feature;
  date_from?: string;                 // ISO date (YYYY-MM-DD)
  date_to?: string;                   // ISO date (YYYY-MM-DD)
  search?: string;                    // matches scenario + notes
  page?: number;
  page_size?: number;
}

// -----------------------------------------------------------------------------
// Chat models
// -----------------------------------------------------------------------------

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Optional attachments rendered inline within assistant messages. */
  attachments?: AgentAttachment[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  session_id?: string | null;
}

// -----------------------------------------------------------------------------
// SSE agent events — emitted by POST /api/chat
// -----------------------------------------------------------------------------

export type AgentEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'text'
  | 'table'
  | 'chart'
  | 'test_cases'
  | 'done'
  | 'error';

export interface AgentEventBase {
  type: AgentEventType;
  seq: number;
  run_id: string;
}

export interface ThinkingEvent extends AgentEventBase {
  type: 'thinking';
  message: string;
}

/** Names of the 4 tools registered on the agent — api/tools.py */
export type ToolName =
  | 'query_tests'
  | 'generate_chart_data'
  | 'generate_test_cases'
  | 'summarize_results';

export interface ToolCallEvent extends AgentEventBase {
  type: 'tool_call';
  tool_call_id: string;
  tool_name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResultEvent extends AgentEventBase {
  type: 'tool_result';
  tool_call_id: string;
  tool_name: ToolName;
  status: 'ok' | 'error';
  row_count?: number;
  preview?: string;
}

export interface TextEvent extends AgentEventBase {
  type: 'text';
  delta: string;
}

// -----------------------------------------------------------------------------
// Structured tool outputs rendered inline in the chat panel
// -----------------------------------------------------------------------------

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  format?: 'number' | 'percent' | 'date';
}

export interface TableData {
  title: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  total_rows: number;
  truncated: boolean;
}

export interface TableEvent extends AgentEventBase, TableData {
  type: 'table';
}

export type ChartType = 'bar' | 'stacked-bar' | 'line' | 'donut';

export interface ChartData {
  chart_type: ChartType;
  title: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, number | string>[];
  series_colors?: Record<string, string>;
}

export interface ChartEvent extends AgentEventBase, ChartData {
  type: 'chart';
}

export type TestCasePriority = 'high' | 'medium' | 'low';
export type TestCaseConfidence = 'high' | 'medium' | 'low';

export interface TestCase {
  test_id: string;                    // e.g. "TC-AEB-0001"
  title: string;
  preconditions: string[];
  steps: string[];
  expected_result: string;
  pass_criteria: string;
  priority: TestCasePriority;
  estimated_duration_min: number;
  confidence: TestCaseConfidence;
}

export interface TestCasesData {
  requirement: string;
  feature: Feature;
  cases: TestCase[];
}

export interface TestCasesEvent extends AgentEventBase, TestCasesData {
  type: 'test_cases';
}

export interface DoneEvent extends AgentEventBase {
  type: 'done';
  duration_ms: number;
  tool_calls: number;
}

export interface ErrorEvent extends AgentEventBase {
  type: 'error';
  message: string;
}

/** Discriminated union of all SSE events emitted by the agent. */
export type AgentEvent =
  | ThinkingEvent
  | ToolCallEvent
  | ToolResultEvent
  | TextEvent
  | TableEvent
  | ChartEvent
  | TestCasesEvent
  | DoneEvent
  | ErrorEvent;

/** Structured payload attached to an assistant ChatMessage. */
export type AgentAttachment =
  | { kind: 'chart'; data: ChartData }
  | { kind: 'table'; data: TableData }
  | { kind: 'test_cases'; data: TestCasesData };

/** Narrowed representation of an agent tool call for UI display. */
export interface ToolCall {
  id: string;
  name: ToolName;
  args: Record<string, unknown>;
  status: 'running' | 'ok' | 'error';
  preview?: string;
}
