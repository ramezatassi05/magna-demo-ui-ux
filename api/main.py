"""
FastAPI backend for the Magna ADAS Test Agent demo.

Serves ADAS sensor test records from SQLite. Both the Streamlit MVP
(localhost:8501) and the Next.js production app (localhost:3000) consume
these endpoints.

Run locally:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent import run_agent_stream
from database import get_connection, row_to_dict, seed_database

# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------


class TestRecord(BaseModel):
    test_id: str
    sensor_type: str
    scenario: str
    scenario_tags: list[str]
    feature: str
    result: Literal["pass", "fail", "warning"]
    confidence_score: float
    detection_distance_m: float
    false_positive_rate: float
    execution_time_ms: int
    timestamp: str
    vehicle_model: str
    firmware_version: str
    notes: str


class PaginatedTests(BaseModel):
    items: list[TestRecord]
    page: int
    page_size: int
    total: int
    total_pages: int


class TestStats(BaseModel):
    total_tests: int
    pass_rate: float
    counts_by_sensor: dict[str, int]
    counts_by_feature: dict[str, int]
    counts_by_result: dict[str, int]
    mean_detection_distance: float
    mean_false_positive_rate: float


class TrendPoint(BaseModel):
    date: str                     # YYYY-MM-DD
    pass_count: int = Field(alias="pass")
    fail: int
    warning: int

    model_config = {"populate_by_name": True}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    session_id: str | None = None


# ---------------------------------------------------------------------------
# App lifecycle — seed DB on startup (idempotent)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    n = seed_database()
    print(f"[startup] database ready — {n} records")
    yield


app = FastAPI(
    title="ADAS Test Agent API",
    description="Magna R&D — ADAS sensor test results API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Root / health
# ---------------------------------------------------------------------------


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "adas-test-agent-api"}


# ---------------------------------------------------------------------------
# /api/tests — list with filters + pagination
# ---------------------------------------------------------------------------


@app.get("/api/tests", response_model=PaginatedTests)
def list_tests(
    sensor_type: str | None = Query(None, description="camera|radar|thermal|lidar"),
    result: str | None = Query(None, description="pass|fail|warning"),
    feature: str | None = Query(None, description="AEB|FCW|LCA|BSD|ACC|TSR"),
    date_from: str | None = Query(None, description="ISO date (inclusive)"),
    date_to: str | None = Query(None, description="ISO date (inclusive)"),
    search: str | None = Query(None, description="case-insensitive search across scenario + notes"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
) -> PaginatedTests:
    where: list[str] = []
    params: list = []

    if sensor_type:
        where.append("sensor_type = ?")
        params.append(sensor_type.lower())
    if result:
        where.append("result = ?")
        params.append(result.lower())
    if feature:
        where.append("feature = ?")
        params.append(feature.upper())
    if date_from:
        where.append("timestamp >= ?")
        params.append(date_from)
    if date_to:
        # Make date_to inclusive by pushing to end-of-day if user passed a bare date
        if len(date_to) == 10:
            date_to = date_to + "T23:59:59Z"
        where.append("timestamp <= ?")
        params.append(date_to)
    if search:
        where.append("(LOWER(scenario) LIKE ? OR LOWER(notes) LIKE ?)")
        like = f"%{search.lower()}%"
        params.extend([like, like])

    where_clause = f"WHERE {' AND '.join(where)}" if where else ""

    conn = get_connection()
    try:
        total = conn.execute(
            f"SELECT COUNT(*) FROM tests {where_clause}", params
        ).fetchone()[0]

        offset = (page - 1) * page_size
        rows = conn.execute(
            f"""
            SELECT * FROM tests
            {where_clause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
            """,
            [*params, page_size, offset],
        ).fetchall()
    finally:
        conn.close()

    items = [TestRecord(**row_to_dict(r)) for r in rows]
    total_pages = (total + page_size - 1) // page_size if total else 0
    return PaginatedTests(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# /api/tests/{test_id}
# ---------------------------------------------------------------------------


@app.get("/api/tests/{test_id}", response_model=TestRecord)
def get_test(test_id: str) -> TestRecord:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM tests WHERE test_id = ?", (test_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Test {test_id} not found")
    return TestRecord(**row_to_dict(row))


# ---------------------------------------------------------------------------
# /api/stats
# ---------------------------------------------------------------------------


@app.get("/api/stats", response_model=TestStats)
def get_stats() -> TestStats:
    conn = get_connection()
    try:
        total = conn.execute("SELECT COUNT(*) FROM tests").fetchone()[0]

        by_sensor = {
            row["sensor_type"]: row["c"]
            for row in conn.execute(
                "SELECT sensor_type, COUNT(*) AS c FROM tests GROUP BY sensor_type"
            ).fetchall()
        }
        by_feature = {
            row["feature"]: row["c"]
            for row in conn.execute(
                "SELECT feature, COUNT(*) AS c FROM tests GROUP BY feature"
            ).fetchall()
        }
        by_result = {
            row["result"]: row["c"]
            for row in conn.execute(
                "SELECT result, COUNT(*) AS c FROM tests GROUP BY result"
            ).fetchall()
        }

        agg = conn.execute(
            """
            SELECT
              AVG(detection_distance_m) AS mean_dist,
              AVG(false_positive_rate)  AS mean_fp
            FROM tests
            """
        ).fetchone()
    finally:
        conn.close()

    pass_count = by_result.get("pass", 0)
    pass_rate = (pass_count / total) if total else 0.0

    return TestStats(
        total_tests=total,
        pass_rate=round(pass_rate, 4),
        counts_by_sensor=by_sensor,
        counts_by_feature=by_feature,
        counts_by_result=by_result,
        mean_detection_distance=round(agg["mean_dist"] or 0.0, 2),
        mean_false_positive_rate=round(agg["mean_fp"] or 0.0, 5),
    )


# ---------------------------------------------------------------------------
# /api/stats/trends — daily counts, 90-day window
# ---------------------------------------------------------------------------


@app.get("/api/stats/trends", response_model=list[TrendPoint])
def get_trends() -> list[TrendPoint]:
    """Daily pass/fail/warning counts for the last 90 days.

    Emits an entry for every day in the window (zero-filled) so the frontend
    can render a stable time-axis with no gaps.
    """
    conn = get_connection()
    try:
        # Anchor the window to the most recent timestamp in the DB
        max_ts_row = conn.execute("SELECT MAX(timestamp) AS m FROM tests").fetchone()
        if not max_ts_row or not max_ts_row["m"]:
            return []
        max_ts = datetime.strptime(max_ts_row["m"][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        window_start = max_ts - timedelta(days=89)

        rows = conn.execute(
            """
            SELECT
              SUBSTR(timestamp, 1, 10) AS day,
              result,
              COUNT(*) AS c
            FROM tests
            WHERE timestamp >= ?
            GROUP BY day, result
            """,
            (window_start.strftime("%Y-%m-%dT00:00:00Z"),),
        ).fetchall()
    finally:
        conn.close()

    by_day: dict[str, dict[str, int]] = {}
    for r in rows:
        by_day.setdefault(r["day"], {"pass": 0, "fail": 0, "warning": 0})
        by_day[r["day"]][r["result"]] = r["c"]

    trend: list[TrendPoint] = []
    for offset in range(90):
        day = (window_start + timedelta(days=offset)).strftime("%Y-%m-%d")
        bucket = by_day.get(day, {"pass": 0, "fail": 0, "warning": 0})
        trend.append(
            TrendPoint(
                date=day,
                **{"pass": bucket["pass"]},
                fail=bucket["fail"],
                warning=bucket["warning"],
            )
        )
    return trend


# ---------------------------------------------------------------------------
# /api/chat — streaming SSE endpoint for the LangGraph agent
# ---------------------------------------------------------------------------


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Stream agent events as Server-Sent Events.

    Each event is emitted as `data: {json}\\n\\n`. Event types:
      thinking | tool_call | tool_result | text | table | chart | test_cases | done | error

    Mode switches on OPENAI_API_KEY: real LangGraph ReAct agent when set,
    keyword-dispatched mock agent otherwise. Both modes emit the same
    event schema so the frontend renders identically.
    """
    messages = [m.model_dump() for m in req.messages]

    async def event_stream():
        async for event in run_agent_stream(messages):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
