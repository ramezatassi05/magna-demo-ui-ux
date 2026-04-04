"""
LangChain tools exposed to the ADAS Test Agent ReAct loop.

Every tool queries real data from the SQLite database seeded by
`database.seed_database`. Tools are registered both on the real LangGraph
agent (when OPENAI_API_KEY is set) and invoked directly by the mock
dispatcher (when it isn't). Keeping one set of tool functions across both
modes guarantees that the SSE event stream shape is identical regardless
of which path runs — the only thing that differs is the orchestration.

Tools return plain dicts (not Pydantic models) because:
  1. LangChain serializes them transparently into ToolMessage content.
  2. The /api/chat SSE emitter re-wraps them into typed events and the
     frontend renders typed components — no downstream code inspects the
     Pydantic class, so the model layer would be dead weight.
"""

from __future__ import annotations

from collections import Counter
from contextlib import closing
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from langchain_core.tools import tool

from database import get_connection, row_to_dict
from test_case_templates import build_test_cases

# ---------------------------------------------------------------------------
# Shared filter-clause helpers (keeps SQL construction consistent across tools)
# ---------------------------------------------------------------------------


def _build_where(
    result: str | None = None,
    sensor_type: str | None = None,
    feature: str | None = None,
    scenario_contains: str | None = None,
    days_back: int | None = None,
) -> tuple[str, list[Any]]:
    """Build a parameterized WHERE clause. Returns ('WHERE a=? AND b=?', [params])."""
    clauses: list[str] = []
    params: list[Any] = []

    if result:
        clauses.append("result = ?")
        params.append(result.lower())
    if sensor_type:
        clauses.append("sensor_type = ?")
        params.append(sensor_type.lower())
    if feature:
        clauses.append("feature = ?")
        params.append(feature.upper())
    if scenario_contains:
        clauses.append("(LOWER(scenario) LIKE ? OR LOWER(notes) LIKE ?)")
        like = f"%{scenario_contains.lower()}%"
        params.extend([like, like])
    if days_back is not None and days_back > 0:
        # Anchor to max timestamp so the window matches the seeded data
        with closing(get_connection()) as conn:
            max_row = conn.execute("SELECT MAX(timestamp) AS m FROM tests").fetchone()
        if max_row and max_row["m"]:
            anchor = datetime.strptime(max_row["m"][:10], "%Y-%m-%d").replace(
                tzinfo=timezone.utc
            )
            cutoff = anchor - timedelta(days=days_back)
            clauses.append("timestamp >= ?")
            params.append(cutoff.strftime("%Y-%m-%dT00:00:00Z"))

    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return where_sql, params


def _top_scenario(rows: list[dict]) -> str | None:
    """Return the most frequent scenario in a row set (or None if empty)."""
    if not rows:
        return None
    counts = Counter(r["scenario"] for r in rows)
    scenario, _ = counts.most_common(1)[0]
    return scenario


# ---------------------------------------------------------------------------
# Tool 1 — query_tests
# ---------------------------------------------------------------------------


@tool
def query_tests(
    result: Literal["pass", "fail", "warning"] | None = None,
    sensor_type: Literal["camera", "radar", "thermal", "lidar"] | None = None,
    feature: Literal["AEB", "FCW", "LCA", "BSD", "ACC", "TSR"] | None = None,
    scenario_contains: str | None = None,
    days_back: int | None = None,
    limit: int = 20,
) -> dict:
    """Query the ADAS test database with optional filters.

    Use this tool whenever the user asks to see specific tests, list failures,
    count records, or filter by sensor/feature/scenario. Returns up to `limit`
    rows plus aggregate counts so the caller can render a summary.

    Args:
        result: Filter by outcome (pass/fail/warning).
        sensor_type: Filter by sensor (camera/radar/thermal/lidar).
        feature: Filter by ADAS feature (AEB/FCW/LCA/BSD/ACC/TSR).
        scenario_contains: Free-text substring match on scenario + notes.
        days_back: Restrict to records within the last N days.
        limit: Max rows to return (default 20, capped at 100).
    """
    limit = max(1, min(limit, 100))
    where_sql, params = _build_where(
        result=result,
        sensor_type=sensor_type,
        feature=feature,
        scenario_contains=scenario_contains,
        days_back=days_back,
    )

    with closing(get_connection()) as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM tests {where_sql}", params
        ).fetchone()[0]

        rows = conn.execute(
            f"""
            SELECT * FROM tests
            {where_sql}
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            [*params, limit],
        ).fetchall()

        # Aggregate summary across the full matching set (not just returned)
        by_sensor_rows = conn.execute(
            f"""
            SELECT sensor_type, COUNT(*) AS c FROM tests
            {where_sql}
            GROUP BY sensor_type
            """,
            params,
        ).fetchall()
        by_feature_rows = conn.execute(
            f"""
            SELECT feature, COUNT(*) AS c FROM tests
            {where_sql}
            GROUP BY feature
            """,
            params,
        ).fetchall()

    records = [row_to_dict(r) for r in rows]
    filters_applied = {
        k: v
        for k, v in {
            "result": result,
            "sensor_type": sensor_type,
            "feature": feature,
            "scenario_contains": scenario_contains,
            "days_back": days_back,
        }.items()
        if v is not None
    }

    return {
        "rows": records,
        "total_matching": total,
        "returned": len(records),
        "filters_applied": filters_applied,
        "summary": {
            "by_sensor": {r["sensor_type"]: r["c"] for r in by_sensor_rows},
            "by_feature": {r["feature"]: r["c"] for r in by_feature_rows},
            "top_scenario": _top_scenario(records),
        },
    }


# ---------------------------------------------------------------------------
# Tool 2 — generate_chart_data
# ---------------------------------------------------------------------------


SERIES_COLORS = {
    "pass": "#10B981",
    "fail": "#EF4444",
    "warning": "#F59E0B",
}

# Default palette for categorical series without a canonical color
PALETTE = ["#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1"]


@tool
def generate_chart_data(
    chart_type: Literal["bar", "stacked-bar", "line", "donut"],
    dimension: Literal["sensor_type", "feature", "result", "vehicle_model", "day"],
    metric: Literal[
        "count",
        "pass_rate",
        "fail_rate",
        "mean_confidence",
        "mean_detection_distance",
        "mean_fp_rate",
    ] = "count",
    group_by: Literal["result", "sensor_type", "feature"] | None = None,
    filters: dict | None = None,
    title: str | None = None,
) -> dict:
    """Build a Recharts-compatible payload aggregating test data.

    Use for visualization requests ("compare sensors", "show trend over time",
    "pass rate by feature"). The returned `data` array is the exact shape
    Recharts expects.

    Args:
        chart_type: bar, stacked-bar, line, or donut.
        dimension: The X-axis dimension (sensor_type/feature/result/vehicle_model/day).
        metric: What to measure per bucket (count/pass_rate/etc).
        group_by: Optional second-axis grouping for stacked-bar/line (usually 'result').
        filters: Optional filter dict: {result, sensor_type, feature, days_back}.
        title: Optional chart title; auto-generated if not provided.
    """
    filters = filters or {}
    where_sql, params = _build_where(**filters)

    # Column expression per dimension
    dim_expr = {
        "sensor_type": "sensor_type",
        "feature": "feature",
        "result": "result",
        "vehicle_model": "vehicle_model",
        "day": "SUBSTR(timestamp, 1, 10)",
    }[dimension]

    # ---- stacked-bar / line with group_by ---------------------------------
    if group_by:
        with closing(get_connection()) as conn:
            rows = conn.execute(
                f"""
                SELECT {dim_expr} AS dim, {group_by} AS grp, COUNT(*) AS c
                FROM tests
                {where_sql}
                GROUP BY dim, grp
                ORDER BY dim
                """,
                params,
            ).fetchall()

        # Pivot into Recharts-friendly row-per-dimension format
        buckets: dict[str, dict[str, int]] = {}
        series_keys: set[str] = set()
        for r in rows:
            buckets.setdefault(r["dim"], {})[r["grp"]] = r["c"]
            series_keys.add(r["grp"])

        # Sort x-axis: days chronologically, others alphabetically
        ordered_x = sorted(buckets.keys())
        data = [{dimension: x, **{k: buckets[x].get(k, 0) for k in series_keys}} for x in ordered_x]
        y_keys = sorted(series_keys)

        series_colors = {
            k: SERIES_COLORS.get(k, PALETTE[i % len(PALETTE)])
            for i, k in enumerate(y_keys)
        }

        return {
            "chart_type": chart_type,
            "title": title or f"{metric.replace('_', ' ').title()} by {dimension} ({group_by})",
            "x_key": dimension,
            "y_keys": y_keys,
            "data": data,
            "series_colors": series_colors,
        }

    # ---- single-series bar/donut/line -------------------------------------
    if metric == "count":
        select_expr = "COUNT(*) AS value"
    elif metric == "pass_rate":
        select_expr = "CAST(SUM(CASE WHEN result='pass' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) AS value"
    elif metric == "fail_rate":
        select_expr = "CAST(SUM(CASE WHEN result='fail' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) AS value"
    elif metric == "mean_confidence":
        select_expr = "AVG(confidence_score) AS value"
    elif metric == "mean_detection_distance":
        select_expr = "AVG(detection_distance_m) AS value"
    elif metric == "mean_fp_rate":
        select_expr = "AVG(false_positive_rate) AS value"
    else:  # pragma: no cover — Literal prevents this
        select_expr = "COUNT(*) AS value"

    with closing(get_connection()) as conn:
        rows = conn.execute(
            f"""
            SELECT {dim_expr} AS dim, {select_expr}
            FROM tests
            {where_sql}
            GROUP BY dim
            ORDER BY dim
            """,
            params,
        ).fetchall()

    data = [
        {
            dimension: r["dim"],
            "value": round(r["value"], 4) if isinstance(r["value"], float) else r["value"],
        }
        for r in rows
    ]

    # Colorize by dimension when it's a known categorical
    if dimension == "result":
        series_colors = {row[dimension]: SERIES_COLORS.get(row[dimension], PALETTE[0]) for row in data}
    else:
        series_colors = {row[dimension]: PALETTE[i % len(PALETTE)] for i, row in enumerate(data)}

    return {
        "chart_type": chart_type,
        "title": title or f"{metric.replace('_', ' ').title()} by {dimension}",
        "x_key": dimension,
        "y_keys": ["value"],
        "data": data,
        "series_colors": series_colors,
    }


# ---------------------------------------------------------------------------
# Tool 3 — generate_test_cases
# ---------------------------------------------------------------------------


FEATURE_FROM_TEXT: dict[str, str] = {
    # acronyms (longest match first to avoid partial hits)
    "aeb": "AEB",
    "fcw": "FCW",
    "lca": "LCA",
    "bsd": "BSD",
    "acc": "ACC",
    "tsr": "TSR",
    # aliases
    "autonomous emergency braking": "AEB",
    "emergency braking": "AEB",
    "forward collision warning": "FCW",
    "collision warning": "FCW",
    "lane change assist": "LCA",
    "lane change": "LCA",
    "blind spot detection": "BSD",
    "blind spot": "BSD",
    "adaptive cruise control": "ACC",
    "cruise control": "ACC",
    "traffic sign recognition": "TSR",
    "traffic sign": "TSR",
}


def _infer_feature(requirement: str) -> str:
    """Scan a requirement string for a feature keyword. Defaults to AEB."""
    q = requirement.lower()
    # Check longer aliases first (they're more specific)
    for key in sorted(FEATURE_FROM_TEXT.keys(), key=len, reverse=True):
        if key in q:
            return FEATURE_FROM_TEXT[key]
    return "AEB"


@tool
def generate_test_cases(
    requirement: str,
    feature: Literal["AEB", "FCW", "LCA", "BSD", "ACC", "TSR"] | None = None,
    count: int = 5,
) -> dict:
    """Generate structured ADAS test cases from a natural-language requirement.

    Use when the user asks to generate, write, create, or draft test cases.
    Returns a list of cases each with preconditions, steps, expected result,
    pass criteria, priority, duration estimate, and confidence tag.

    Args:
        requirement: The raw requirement string from the engineer.
        feature: Optional explicit feature; inferred from text if omitted.
        count: How many test cases to generate (default 5, capped at 10).
    """
    count = max(1, min(count, 10))
    resolved_feature = feature or _infer_feature(requirement)
    cases = build_test_cases(requirement=requirement, feature=resolved_feature, count=count)
    return {
        "requirement": requirement,
        "feature": resolved_feature,
        "cases": cases,
        "generation_mode": "template",
    }


# ---------------------------------------------------------------------------
# Tool 4 — summarize_results
# ---------------------------------------------------------------------------


def _build_narrative(
    filter_desc: str,
    total: int,
    pass_rate: float,
    mean_conf: float,
    mean_dist: float,
    mean_fp: float,
) -> str:
    if total == 0:
        return f"No tests matched {filter_desc}."
    return (
        f"{filter_desc} shows a {pass_rate * 100:.1f}% pass rate across {total} tests, "
        f"with mean detection at {mean_dist:.0f}m, mean confidence {mean_conf:.2f}, "
        f"and a false-positive rate of {mean_fp * 100:.2f}%."
    )


@tool
def summarize_results(
    sensor_type: Literal["camera", "radar", "thermal", "lidar"] | None = None,
    feature: Literal["AEB", "FCW", "LCA", "BSD", "ACC", "TSR"] | None = None,
    days_back: int | None = None,
) -> dict:
    """Compute aggregate statistics for a filtered test population.

    Use for pass-rate questions, performance summaries, or "how is X doing"
    queries. Returns counts, rates, mean metrics, and a natural-language
    narrative suitable for reading aloud.

    Args:
        sensor_type: Filter to one sensor type.
        feature: Filter to one ADAS feature.
        days_back: Restrict to records within the last N days.
    """
    where_sql, params = _build_where(
        sensor_type=sensor_type, feature=feature, days_back=days_back
    )

    with closing(get_connection()) as conn:
        totals = conn.execute(
            f"""
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN result='pass' THEN 1 ELSE 0 END)    AS passes,
              SUM(CASE WHEN result='fail' THEN 1 ELSE 0 END)    AS fails,
              SUM(CASE WHEN result='warning' THEN 1 ELSE 0 END) AS warns,
              AVG(confidence_score)       AS mean_conf,
              AVG(detection_distance_m)   AS mean_dist,
              AVG(false_positive_rate)    AS mean_fp,
              AVG(execution_time_ms)      AS mean_exec
            FROM tests
            {where_sql}
            """,
            params,
        ).fetchone()

    total = totals["total"] or 0
    pass_rate = (totals["passes"] / total) if total else 0.0
    fail_rate = (totals["fails"] / total) if total else 0.0
    warn_rate = (totals["warns"] / total) if total else 0.0

    filter_parts = []
    if sensor_type:
        filter_parts.append(sensor_type.capitalize())
    if feature:
        filter_parts.append(feature)
    if days_back:
        filter_parts.append(f"last {days_back} days")
    filter_desc = " · ".join(filter_parts) if filter_parts else "All tests"

    narrative = _build_narrative(
        filter_desc,
        total,
        pass_rate,
        totals["mean_conf"] or 0.0,
        totals["mean_dist"] or 0.0,
        totals["mean_fp"] or 0.0,
    )

    return {
        "filter": {
            k: v
            for k, v in {
                "sensor_type": sensor_type,
                "feature": feature,
                "days_back": days_back,
            }.items()
            if v is not None
        },
        "total_tests": total,
        "pass_rate": round(pass_rate, 4),
        "fail_rate": round(fail_rate, 4),
        "warning_rate": round(warn_rate, 4),
        "mean_confidence": round(totals["mean_conf"] or 0.0, 3),
        "mean_detection_distance_m": round(totals["mean_dist"] or 0.0, 2),
        "mean_false_positive_rate": round(totals["mean_fp"] or 0.0, 5),
        "mean_execution_time_ms": int(totals["mean_exec"] or 0),
        "narrative": narrative,
    }


# ---------------------------------------------------------------------------
# Registry for the real agent
# ---------------------------------------------------------------------------

ALL_TOOLS = [query_tests, generate_chart_data, generate_test_cases, summarize_results]

# Map tool name → callable for mock dispatcher (bypasses LangChain wrapper)
TOOL_IMPL: dict[str, Any] = {
    "query_tests": query_tests.func,
    "generate_chart_data": generate_chart_data.func,
    "generate_test_cases": generate_test_cases.func,
    "summarize_results": summarize_results.func,
}
