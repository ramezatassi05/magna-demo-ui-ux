"""Thin client for the ADAS Test Agent FastAPI backend.

The API runs locally on :8000 (see api/main.py). This module wraps the
JSON endpoints and the SSE streaming chat endpoint so the Streamlit pages
can stay focused on UI.
"""

from __future__ import annotations

import json
from typing import Iterator

import requests

API_BASE = "http://localhost:8000"
DEFAULT_TIMEOUT = 10  # seconds


class APIError(RuntimeError):
    """Raised when the API returns a non-2xx response or is unreachable."""


def _get(path: str, params: dict | None = None) -> dict | list:
    try:
        resp = requests.get(f"{API_BASE}{path}", params=params, timeout=DEFAULT_TIMEOUT)
    except requests.RequestException as exc:
        raise APIError(f"Cannot reach API at {API_BASE} — is the backend running?") from exc
    if resp.status_code != 200:
        raise APIError(f"{path} returned {resp.status_code}: {resp.text[:200]}")
    return resp.json()


def health() -> bool:
    """Return True if the API root responds ok."""
    try:
        data = _get("/")
        return isinstance(data, dict) and data.get("status") == "ok"
    except APIError:
        return False


def get_stats() -> dict:
    """GET /api/stats — aggregate counts, pass rate, means."""
    return _get("/api/stats")  # type: ignore[return-value]


def get_trends() -> list[dict]:
    """GET /api/stats/trends — 90 days of daily pass/fail/warning counts."""
    return _get("/api/stats/trends")  # type: ignore[return-value]


def get_tests(
    sensor_type: str | None = None,
    result: str | None = None,
    feature: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """GET /api/tests — paginated list of test records with optional filters."""
    params = {
        "sensor_type": sensor_type,
        "result": result,
        "feature": feature,
        "search": search,
        "page": page,
        "page_size": page_size,
    }
    params = {k: v for k, v in params.items() if v is not None}
    return _get("/api/tests", params=params)  # type: ignore[return-value]


def stream_chat(messages: list[dict]) -> Iterator[dict]:
    """POST /api/chat — yields parsed SSE event dicts as they arrive.

    The backend emits `data: {json}\\n\\n` frames. Event types include:
    thinking, tool_call, tool_result, text, table, chart, test_cases, done, error.
    """
    url = f"{API_BASE}/api/chat"
    try:
        resp = requests.post(
            url,
            json={"messages": messages},
            stream=True,
            timeout=60,  # longer — agent streaming can take a few seconds
            headers={"Accept": "text/event-stream"},
        )
    except requests.RequestException as exc:
        raise APIError(f"Cannot reach API at {API_BASE} — is the backend running?") from exc

    if resp.status_code != 200:
        raise APIError(f"/api/chat returned {resp.status_code}: {resp.text[:200]}")

    for raw_line in resp.iter_lines(decode_unicode=True):
        if not raw_line:
            continue  # blank line = event separator
        if not raw_line.startswith("data:"):
            continue  # ignore comments/keepalives
        payload = raw_line[5:].lstrip()
        if not payload:
            continue
        try:
            yield json.loads(payload)
        except json.JSONDecodeError:
            continue
