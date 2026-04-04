"""
ADAS Test Agent orchestrator — two modes, one SSE event schema.

Entry point: `run_agent_stream(messages)` — async generator yielding dicts
shaped as SSE events. The /api/chat endpoint serializes each dict to a
`data: {json}\\n\\n` frame.

When `OPENAI_API_KEY` is set, a LangGraph ReAct agent orchestrates tool
calls via `create_react_agent` and streams events through
`astream_events(version="v2")`. Otherwise, a keyword-based mock dispatcher
invokes the real tool functions directly with hard-coded arguments, which
keeps the data grounded in SQLite and guarantees mock/real parity on the
wire.

Event types emitted (discriminated by `type` field on each dict):
  thinking | tool_call | tool_result | text | table | chart | test_cases | done | error

Every event carries:
  - seq: monotonic integer within a run
  - run_id: unique id for the agent turn

See /Users/ramezatassi/Desktop/magna-demo-ui-ux/CLAUDE.md Phase 2 and
/Users/ramezatassi/.claude/plans/enumerated-juggling-sonnet.md for the
full design.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
import uuid
from typing import Any, AsyncIterator

from tools import ALL_TOOLS, TOOL_IMPL

logger = logging.getLogger("adas-agent")

SYSTEM_PROMPT = """You are the ADAS Test Agent, an R&D assistant for Magna's AI & SW \
Technologies team. You analyze ADAS sensor test results (camera, radar, thermal, lidar) \
and help engineers understand pass/fail trends, generate test cases from requirements, \
and visualize metrics.

You have four tools:
  - query_tests: pull specific test records with filters
  - summarize_results: compute aggregate stats for a filter
  - generate_chart_data: produce a Recharts-ready payload for visualizations
  - generate_test_cases: draft structured test cases from a requirement

Rules:
  - Always call a tool before answering with data — never invent numbers.
  - For visualization requests, call generate_chart_data.
  - For "generate/write/draft test cases" requests, call generate_test_cases.
  - Keep responses concise and engineering-focused. 2-4 sentences after a tool call.
  - When reporting on a tool result, summarize what you found — do NOT paste raw JSON \
or dump long lists. The frontend renders tables and charts itself from the tool output."""


# ---------------------------------------------------------------------------
# SSE event emitter — each event is a plain dict; the endpoint wraps it.
# ---------------------------------------------------------------------------


class EventEmitter:
    """Stateful helper that stamps each event with monotonic seq + run_id."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self._seq = 0
        self._tool_calls = 0
        self._start = time.monotonic()

    def _next_seq(self) -> int:
        s = self._seq
        self._seq += 1
        return s

    def event(self, type_: str, **fields: Any) -> dict:
        return {"type": type_, "seq": self._next_seq(), "run_id": self.run_id, **fields}

    def done(self) -> dict:
        duration_ms = int((time.monotonic() - self._start) * 1000)
        return self.event("done", duration_ms=duration_ms, tool_calls=self._tool_calls)

    def record_tool_call(self) -> None:
        self._tool_calls += 1


# ---------------------------------------------------------------------------
# Shared rich-event builders — used by both real + mock paths so the wire
# format is literally built by the same code.
# ---------------------------------------------------------------------------


# Column config for query_tests table rendering
TABLE_COLUMNS = [
    {"key": "test_id", "label": "Test ID", "width": 110},
    {"key": "sensor_type", "label": "Sensor", "width": 80},
    {"key": "feature", "label": "Feature", "width": 70},
    {"key": "scenario", "label": "Scenario", "width": 320},
    {"key": "result", "label": "Result", "width": 80},
    {"key": "confidence_score", "label": "Conf", "width": 60, "format": "number"},
    {"key": "detection_distance_m", "label": "Dist (m)", "width": 75, "format": "number"},
    {"key": "timestamp", "label": "When", "width": 160},
]


def _tool_result_preview(tool_name: str, result: dict) -> tuple[str, dict]:
    """Return (human-readable preview, structured_metadata) for a tool result."""
    if tool_name == "query_tests":
        n = result.get("total_matching", 0)
        ret = result.get("returned", 0)
        summary = result.get("summary", {})
        parts = []
        if summary.get("by_sensor"):
            top_sensor = ", ".join(f"{k}: {v}" for k, v in summary["by_sensor"].items())
            parts.append(top_sensor)
        preview = f"{n} tests matched ({ret} returned). {'; '.join(parts)}" if parts else f"{n} tests matched"
        return preview, {"row_count": n, "returned": ret}

    if tool_name == "generate_chart_data":
        data = result.get("data", [])
        return f"Chart built: {result.get('chart_type')} with {len(data)} data points.", {"row_count": len(data)}

    if tool_name == "generate_test_cases":
        cases = result.get("cases", [])
        return f"Generated {len(cases)} test cases for {result.get('feature')}.", {"row_count": len(cases)}

    if tool_name == "summarize_results":
        return result.get("narrative", "Summary computed."), {"row_count": result.get("total_tests", 0)}

    return "Tool completed.", {"row_count": 0}


def _build_table_event_payload(tool_result: dict) -> dict:
    """Convert query_tests output into a `table` event payload."""
    rows = tool_result.get("rows", [])
    return {
        "title": f"Tests matching filters ({tool_result.get('returned', 0)} of {tool_result.get('total_matching', 0)})",
        "columns": TABLE_COLUMNS,
        "rows": rows,
        "total_rows": tool_result.get("total_matching", 0),
        "truncated": tool_result.get("returned", 0) < tool_result.get("total_matching", 0),
    }


def _build_chart_event_payload(tool_result: dict) -> dict:
    """Chart tool output is already Recharts-shaped — passthrough."""
    return {
        "chart_type": tool_result.get("chart_type", "bar"),
        "title": tool_result.get("title", ""),
        "x_key": tool_result.get("x_key", ""),
        "y_keys": tool_result.get("y_keys", []),
        "data": tool_result.get("data", []),
        "series_colors": tool_result.get("series_colors", {}),
    }


def _build_test_cases_event_payload(tool_result: dict) -> dict:
    return {
        "requirement": tool_result.get("requirement", ""),
        "feature": tool_result.get("feature", ""),
        "cases": tool_result.get("cases", []),
    }


# ---------------------------------------------------------------------------
# Mock agent — keyword intent classifier + real tool invocation
# ---------------------------------------------------------------------------


SENSOR_KEYWORDS = {
    "camera": "camera", "cameras": "camera",
    "radar": "radar", "radars": "radar",
    "thermal": "thermal",
    "lidar": "lidar", "lidars": "lidar",
}

FEATURE_KEYWORDS = {
    "aeb": "AEB", "fcw": "FCW", "lca": "LCA", "bsd": "BSD", "acc": "ACC", "tsr": "TSR",
    "autonomous emergency braking": "AEB", "emergency braking": "AEB",
    "forward collision warning": "FCW", "collision warning": "FCW",
    "lane change assist": "LCA", "lane change": "LCA",
    "blind spot detection": "BSD", "blind spot": "BSD",
    "adaptive cruise control": "ACC", "cruise control": "ACC",
    "traffic sign recognition": "TSR", "traffic sign": "TSR",
}


def _extract_sensor(q: str) -> str | None:
    for k, v in SENSOR_KEYWORDS.items():
        if re.search(rf"\b{k}\b", q):
            return v
    return None


def _extract_feature(q: str) -> str | None:
    # Longer aliases first
    for k in sorted(FEATURE_KEYWORDS.keys(), key=len, reverse=True):
        if k in q:
            return FEATURE_KEYWORDS[k]
    return None


def _classify_intent(query: str) -> str:
    q = query.lower().strip()

    # Test case generation — strongest, most specific signal
    if re.search(r"\b(generate|write|create|draft|produce)\b.*\btest case", q) \
            or re.search(r"\btest cases?\s+for\b", q):
        return "generate_cases"

    # Trend / time-series
    if re.search(r"\btrend\b|\bover time\b|\blast \d+ days?\b|\bpast week\b|\bhistory\b", q):
        return "trends"

    # Comparison across sensors
    if re.search(r"\b(compare|comparison|versus|vs\.?)\b", q) or \
       re.search(r"\bsensor performance\b|\bsensor comparison\b|\bwhich sensor\b|\bmost failures?\b", q):
        return "compare_sensors"

    # Pass rate / stats for specific sensor or feature
    if re.search(r"\b(pass rate|fail rate|how many|count|stats?|performance|summary)\b", q):
        return "summarize"

    # Failed / failing tests (list)
    if re.search(r"\bfail(ed|ing|ures?)?\b", q) and \
       re.search(r"\b(test|show|list|find|which|what)\b", q):
        return "failed_tests"

    # Generic "show me tests"
    if re.search(r"\b(show|list|find)\b.*\btests?\b", q) or re.search(r"\bwhich tests?\b", q):
        return "list_tests"

    return "fallback"


async def _stream_text(emitter: EventEmitter, chunks: list[str]):
    """Yield text events in small chunks with tiny delays to simulate streaming."""
    for chunk in chunks:
        yield emitter.event("text", delta=chunk)
        await asyncio.sleep(0.04)


def _split_sentences(text: str) -> list[str]:
    """Split a short response into 2-3 chunks for streaming feel."""
    # Split on sentence end, keep punctuation; fallback to word-group split
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    if len(parts) >= 2:
        return [p + (" " if i < len(parts) - 1 else "") for i, p in enumerate(parts)]
    # Fallback: split by every ~40 chars at word boundary
    words = text.split()
    if len(words) <= 4:
        return [text]
    mid = len(words) // 2
    return [" ".join(words[:mid]) + " ", " ".join(words[mid:])]


async def _invoke_tool_with_events(
    emitter: EventEmitter,
    tool_name: str,
    args: dict,
) -> tuple[dict | None, AsyncIterator[dict]]:
    """Call a tool and yield the tool_call + tool_result + rich content events.

    Returns (result_dict, unused_iterator_placeholder) — actual events are
    yielded by the caller via delegation. Kept for signature docs; use
    `_dispatch_tool` below for the actual async-gen implementation.
    """
    # not used — see _dispatch_tool
    raise NotImplementedError


async def _dispatch_tool(
    emitter: EventEmitter,
    tool_name: str,
    args: dict,
) -> AsyncIterator[dict]:
    """Invoke a tool and yield the full event sequence (tool_call + tool_result + rich)."""
    call_id = f"call_{emitter._seq:02d}"
    emitter.record_tool_call()
    yield emitter.event("tool_call", tool_call_id=call_id, tool_name=tool_name, args=args)

    try:
        result = TOOL_IMPL[tool_name](**args)
    except Exception as exc:
        logger.exception("tool %s failed", tool_name)
        yield emitter.event(
            "tool_result", tool_call_id=call_id, tool_name=tool_name,
            status="error", row_count=0, preview=f"Tool failed: {exc}",
        )
        return

    preview, meta = _tool_result_preview(tool_name, result)
    yield emitter.event(
        "tool_result", tool_call_id=call_id, tool_name=tool_name,
        status="ok", row_count=meta["row_count"], preview=preview,
    )

    # Emit the typed rich event
    if tool_name == "query_tests":
        yield emitter.event("table", **_build_table_event_payload(result))
    elif tool_name == "generate_chart_data":
        yield emitter.event("chart", **_build_chart_event_payload(result))
    elif tool_name == "generate_test_cases":
        yield emitter.event("test_cases", **_build_test_cases_event_payload(result))
    # summarize_results: narrative goes in the `text` event emitted by the caller


async def _run_mock_agent(user_message: str) -> AsyncIterator[dict]:
    """Mock dispatcher — classifies intent, invokes real tools, emits events."""
    run_id = f"mock_{uuid.uuid4().hex[:8]}"
    emitter = EventEmitter(run_id)
    q = user_message.lower().strip()
    intent = _classify_intent(user_message)

    yield emitter.event("thinking", message="Analyzing your request...")
    await asyncio.sleep(0.05)

    if intent == "generate_cases":
        feature = _extract_feature(q)
        yield emitter.event("thinking", message=f"Generating test cases for {feature or 'detected feature'}...")
        async for ev in _dispatch_tool(emitter, "generate_test_cases", {
            "requirement": user_message,
            "feature": feature,
            "count": 5,
        }):
            yield ev
        text = f"Generated 5 test cases for {feature or 'the requirement'}. Review the confidence tags and approve each case below."
        async for ev in _stream_text(emitter, _split_sentences(text)):
            yield ev

    elif intent == "trends":
        yield emitter.event("thinking", message="Computing failure trend over the last 30 days...")
        async for ev in _dispatch_tool(emitter, "generate_chart_data", {
            "chart_type": "line",
            "dimension": "day",
            "metric": "count",
            "group_by": "result",
            "filters": {"days_back": 30},
            "title": "Test results over last 30 days",
        }):
            yield ev
        text = "Failure trend plotted over the last 30 days. Red line shows fails, amber shows warnings — watch for sustained spikes."
        async for ev in _stream_text(emitter, _split_sentences(text)):
            yield ev

    elif intent == "compare_sensors":
        yield emitter.event("thinking", message="Comparing pass/fail distribution across sensor types...")
        async for ev in _dispatch_tool(emitter, "generate_chart_data", {
            "chart_type": "stacked-bar",
            "dimension": "sensor_type",
            "metric": "count",
            "group_by": "result",
            "title": "Test outcomes by sensor type",
        }):
            yield ev
        # Also pull an at-a-glance summary to include in the text
        summary = TOOL_IMPL["summarize_results"]()
        text = (
            f"Comparison plotted above. Across all {summary['total_tests']} tests, "
            f"pass rate is {summary['pass_rate'] * 100:.1f}%. "
            "Cameras carry the most volume but also most failures — thermal shows a lower absolute count with higher variance."
        )
        async for ev in _stream_text(emitter, _split_sentences(text)):
            yield ev

    elif intent == "summarize":
        sensor = _extract_sensor(q)
        feature = _extract_feature(q)
        yield emitter.event("thinking", message="Computing aggregate stats...")
        async for ev in _dispatch_tool(emitter, "summarize_results", {
            "sensor_type": sensor,
            "feature": feature,
        }):
            yield ev
        # The narrative IS the response for this intent
        # Re-fetch to avoid re-parsing the emitted event
        result = TOOL_IMPL["summarize_results"](sensor_type=sensor, feature=feature)
        async for ev in _stream_text(emitter, _split_sentences(result["narrative"])):
            yield ev

    elif intent == "failed_tests":
        sensor = _extract_sensor(q)
        feature = _extract_feature(q)
        yield emitter.event("thinking", message="Querying failed tests from the database...")
        async for ev in _dispatch_tool(emitter, "query_tests", {
            "result": "fail",
            "sensor_type": sensor,
            "feature": feature,
            "limit": 10,
        }):
            yield ev
        # Re-fetch for text (already emitted via events)
        result = TOOL_IMPL["query_tests"](result="fail", sensor_type=sensor, feature=feature, limit=10)
        top = result["summary"].get("top_scenario")
        filter_desc = []
        if sensor: filter_desc.append(sensor)
        if feature: filter_desc.append(feature)
        label = " ".join(filter_desc) if filter_desc else ""
        text_parts = [f"Found {result['total_matching']} failed {label} tests. " if label else f"Found {result['total_matching']} failed tests. "]
        if top:
            text_parts.append(f"Most common failure scenario: {top}.")
        async for ev in _stream_text(emitter, text_parts):
            yield ev

    elif intent == "list_tests":
        sensor = _extract_sensor(q)
        feature = _extract_feature(q)
        yield emitter.event("thinking", message="Pulling recent tests from the database...")
        async for ev in _dispatch_tool(emitter, "query_tests", {
            "sensor_type": sensor,
            "feature": feature,
            "limit": 15,
        }):
            yield ev
        result = TOOL_IMPL["query_tests"](sensor_type=sensor, feature=feature, limit=15)
        text = f"Showing {result['returned']} of {result['total_matching']} matching tests, most recent first."
        async for ev in _stream_text(emitter, _split_sentences(text)):
            yield ev

    else:  # fallback
        help_text = (
            "I can help you analyze ADAS test results. Try: "
            "'show me failed camera tests', 'what is the pass rate for radar', "
            "'compare sensor performance', 'show trends over time', "
            "or 'generate test cases for AEB pedestrian detection'."
        )
        async for ev in _stream_text(emitter, _split_sentences(help_text)):
            yield ev

    yield emitter.done()


# ---------------------------------------------------------------------------
# Real agent — LangGraph create_react_agent + astream_events v2 mapping
# ---------------------------------------------------------------------------


def _get_llm():
    """Lazy-import + construct the LLM. Isolated so mock mode doesn't import it."""
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)


def _build_real_agent():
    from langgraph.prebuilt import create_react_agent
    return create_react_agent(
        model=_get_llm(),
        tools=ALL_TOOLS,
        prompt=SYSTEM_PROMPT,
    )


_AGENT_CACHE: dict[str, Any] = {}


def _get_agent():
    if "agent" not in _AGENT_CACHE:
        _AGENT_CACHE["agent"] = _build_real_agent()
    return _AGENT_CACHE["agent"]


def _extract_tool_name(event: dict) -> str | None:
    """Pull the tool name from a LangGraph astream_events payload."""
    name = event.get("name")
    if name in TOOL_IMPL:
        return name
    return None


async def _run_real_agent(messages: list[dict]) -> AsyncIterator[dict]:
    """Stream a real agent run, mapping astream_events to our SSE schema."""
    run_id = f"run_{uuid.uuid4().hex[:8]}"
    emitter = EventEmitter(run_id)

    yield emitter.event("thinking", message="Analyzing your request...")

    agent = _get_agent()
    lc_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    # Track tool calls by their run_id so we can pair start/end events
    tool_results_by_id: dict[str, tuple[str, dict]] = {}

    try:
        async for event in agent.astream_events(
            {"messages": lc_messages},
            version="v2",
        ):
            kind = event.get("event")

            # Stream LLM tokens as text deltas (skip empty-content chunks that
            # are just tool_call metadata frames)
            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                content = getattr(chunk, "content", "") if chunk else ""
                if content:
                    yield emitter.event("text", delta=content)
                continue

            if kind == "on_tool_start":
                tool_name = _extract_tool_name(event)
                if not tool_name:
                    continue
                args = event.get("data", {}).get("input") or {}
                # LangChain wraps tool input as {"input": {...}} in some versions
                if "input" in args and isinstance(args["input"], dict):
                    args = args["input"]
                lc_run_id = event.get("run_id", "")
                call_id = f"call_{emitter._seq:02d}"
                tool_results_by_id[lc_run_id] = (tool_name, {"call_id": call_id})
                emitter.record_tool_call()
                yield emitter.event(
                    "tool_call", tool_call_id=call_id, tool_name=tool_name, args=args,
                )
                continue

            if kind == "on_tool_end":
                tool_name = _extract_tool_name(event)
                if not tool_name:
                    continue
                lc_run_id = event.get("run_id", "")
                paired = tool_results_by_id.get(lc_run_id)
                call_id = paired[1]["call_id"] if paired else f"call_{emitter._seq:02d}"

                output = event.get("data", {}).get("output")
                # `output` is a ToolMessage; its .content is the tool return value.
                # But create_react_agent passes dicts through — it may also be a dict directly.
                if hasattr(output, "content"):
                    raw = output.content
                else:
                    raw = output
                # If the tool returned a dict, raw is already the dict; if it was
                # serialized to JSON by LangChain, parse it.
                if isinstance(raw, str):
                    import json
                    try:
                        result = json.loads(raw)
                    except Exception:
                        result = {"_raw": raw}
                elif isinstance(raw, dict):
                    result = raw
                else:
                    result = {"_raw": str(raw)}

                preview, meta = _tool_result_preview(tool_name, result)
                yield emitter.event(
                    "tool_result", tool_call_id=call_id, tool_name=tool_name,
                    status="ok", row_count=meta["row_count"], preview=preview,
                )

                if tool_name == "query_tests":
                    yield emitter.event("table", **_build_table_event_payload(result))
                elif tool_name == "generate_chart_data":
                    yield emitter.event("chart", **_build_chart_event_payload(result))
                elif tool_name == "generate_test_cases":
                    yield emitter.event("test_cases", **_build_test_cases_event_payload(result))
                continue
    except Exception as exc:
        logger.exception("real agent stream failed")
        yield emitter.event("error", message=f"Agent error: {exc}", recoverable=False)
        yield emitter.done()
        return

    yield emitter.done()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def run_agent_stream(messages: list[dict]) -> AsyncIterator[dict]:
    """Stream SSE-shaped dicts for the last user message in `messages`.

    Switches on OPENAI_API_KEY: if unset or empty, uses the mock dispatcher.
    If the real agent raises (bad key, rate limit, network), we fall back
    to mock mode for the same request.
    """
    if not messages:
        emitter = EventEmitter(f"run_{uuid.uuid4().hex[:8]}")
        yield emitter.event("error", message="No messages provided", recoverable=False)
        yield emitter.done()
        return

    # Use the last user message as the query for mock mode
    last_user = next(
        (m for m in reversed(messages) if m.get("role") == "user"),
        None,
    )
    if last_user is None:
        emitter = EventEmitter(f"run_{uuid.uuid4().hex[:8]}")
        yield emitter.event("error", message="No user message found", recoverable=False)
        yield emitter.done()
        return

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        async for ev in _run_mock_agent(last_user["content"]):
            yield ev
        return

    # Real path with graceful fallback
    try:
        async for ev in _run_real_agent(messages):
            yield ev
    except Exception as exc:
        logger.warning("real agent failed, falling back to mock: %s", exc)
        async for ev in _run_mock_agent(last_user["content"]):
            yield ev
