"""Agent Chat — streaming conversation with the ADAS Test Agent.

Consumes SSE events from POST /api/chat and renders them progressively:
thinking → tool_call / tool_result → text | chart | table | test_cases → done.
"""

from __future__ import annotations

import pandas as pd
import streamlit as st

from utils.api_client import APIError, stream_chat
from utils.chart_helpers import chart_event_to_plotly

st.set_page_config(page_title="Agent Chat — ADAS Test Agent", layout="wide")
st.title("Agent Chat")

st.caption("Ask about test results, trends, failure patterns, or request charts.")


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------
if "chat_messages" not in st.session_state:
    st.session_state.chat_messages = []  # list of {role, content, attachments}

with st.sidebar:
    if st.button("Clear chat"):
        st.session_state.chat_messages = []
        st.rerun()


# ---------------------------------------------------------------------------
# Rendering helpers
# ---------------------------------------------------------------------------
def render_attachment(att: dict) -> None:
    """Render a stored attachment (chart / table / test_cases) inside a message."""
    atype = att.get("type")
    if atype == "chart":
        try:
            fig = chart_event_to_plotly(att)
            st.plotly_chart(fig, use_container_width=True)
        except Exception as exc:  # noqa: BLE001 — defensive; prototype
            st.warning(f"Could not render chart: {exc}")
    elif atype == "table":
        cols = att.get("columns", [])
        rows = att.get("rows", [])
        if rows:
            df = pd.DataFrame(rows)
            # Order columns to match the event's declared order when possible
            ordered = [c["key"] for c in cols if c.get("key") in df.columns]
            if ordered:
                df = df[ordered]
            # Rename to friendly labels
            label_map = {c["key"]: c.get("label", c["key"]) for c in cols}
            df = df.rename(columns=label_map)
            if att.get("title"):
                st.markdown(f"**{att['title']}**")
            st.dataframe(df, use_container_width=True, hide_index=True)
    elif atype == "test_cases":
        cases = att.get("cases", [])
        st.markdown(f"**Generated {len(cases)} test case(s)**")
        for case in cases:
            label = (
                f"{case.get('test_id', '?')} — {case.get('title', '')} "
                f"[{case.get('priority', '?')}]"
            )
            with st.expander(label):
                if case.get("preconditions"):
                    st.markdown("**Preconditions**")
                    for item in case["preconditions"]:
                        st.markdown(f"- {item}")
                if case.get("steps"):
                    st.markdown("**Steps**")
                    for i, s in enumerate(case["steps"], start=1):
                        st.markdown(f"{i}. {s}")
                if case.get("expected_result"):
                    st.markdown(f"**Expected:** {case['expected_result']}")
                if case.get("pass_criteria"):
                    st.markdown(f"**Pass criteria:** {case['pass_criteria']}")


# ---------------------------------------------------------------------------
# Render existing history
# ---------------------------------------------------------------------------
for msg in st.session_state.chat_messages:
    with st.chat_message(msg["role"]):
        if msg.get("content"):
            st.markdown(msg["content"])
        for att in msg.get("attachments", []):
            render_attachment(att)


# ---------------------------------------------------------------------------
# Chat input + streaming
# ---------------------------------------------------------------------------
prompt = st.chat_input("Ask the agent...")

if prompt:
    # Append + render user message
    st.session_state.chat_messages.append(
        {"role": "user", "content": prompt, "attachments": []}
    )
    with st.chat_message("user"):
        st.markdown(prompt)

    # Build message history for the API (only role+content)
    api_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in st.session_state.chat_messages
        if m.get("content")
    ]

    # Stream the assistant response
    with st.chat_message("assistant"):
        status = st.status("Analyzing...", expanded=True)
        text_placeholder = st.empty()
        attachments: list[dict] = []
        accumulated_text = ""
        fatal_error: str | None = None

        try:
            for event in stream_chat(api_messages):
                etype = event.get("type")

                if etype == "thinking":
                    status.update(label=event.get("message", "Thinking..."))

                elif etype == "tool_call":
                    tool = event.get("tool_name", "tool")
                    with status:
                        st.markdown(f"🔧 Calling `{tool}`")
                        if event.get("args"):
                            st.code(event["args"], language="json")

                elif etype == "tool_result":
                    tool = event.get("tool_name", "tool")
                    row_count = event.get("row_count")
                    suffix = f" ({row_count} rows)" if row_count is not None else ""
                    with status:
                        st.markdown(f"✓ `{tool}` done{suffix}")

                elif etype == "text":
                    accumulated_text += event.get("delta", "")
                    text_placeholder.markdown(accumulated_text)

                elif etype == "chart":
                    try:
                        fig = chart_event_to_plotly(event)
                        st.plotly_chart(fig, use_container_width=True)
                    except Exception as exc:  # noqa: BLE001
                        st.warning(f"Could not render chart: {exc}")
                    attachments.append(event)

                elif etype == "table":
                    render_attachment(event)
                    attachments.append(event)

                elif etype == "test_cases":
                    render_attachment(event)
                    attachments.append(event)

                elif etype == "done":
                    duration = event.get("duration_ms")
                    label = (
                        f"Done in {duration} ms" if duration is not None else "Done"
                    )
                    status.update(label=label, state="complete", expanded=False)
                    break

                elif etype == "error":
                    fatal_error = event.get("message", "agent error")
                    status.update(label="Error", state="error")
                    st.error(fatal_error)
                    break

        except APIError as exc:
            status.update(label="Connection error", state="error")
            st.error(f"{exc}")
            fatal_error = str(exc)

        # Save to history (so it persists across reruns)
        final_text = accumulated_text or (
            "" if fatal_error else "_(agent returned structured output above)_"
        )
        st.session_state.chat_messages.append(
            {
                "role": "assistant",
                "content": final_text,
                "attachments": attachments,
            }
        )
