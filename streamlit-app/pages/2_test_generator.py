"""Test Case Generator — AI-authored structured test cases from a requirement.

Sends the requirement as a chat message; the agent's mock dispatcher or real
LangGraph agent routes to the `generate_test_cases` tool and emits a
`test_cases` SSE event with the structured output.
"""

from __future__ import annotations

import json

import pandas as pd
import streamlit as st

from utils.api_client import APIError, stream_chat

st.set_page_config(page_title="Test Generator — ADAS Test Agent", layout="wide")
st.title("Test Case Generator")

st.markdown("Enter an ADAS requirement and let the agent draft structured test cases for it.")

PLACEHOLDER = (
    "The AEB system shall detect pedestrians at \u226550m in daylight "
    "with \u22640.1% false positive rate."
)

requirement = st.text_area(
    "Requirement",
    placeholder=PLACEHOLDER,
    height=120,
    key="req_input",
)

col_btn, _ = st.columns([1, 5])
with col_btn:
    generate = st.button("Generate Test Cases", type="primary")


def generate_cases(req: str) -> list[dict]:
    """Call the chat endpoint and collect test_cases from the SSE stream."""
    user_msg = f"Generate 5 test cases for: {req}"
    cases: list[dict] = []
    errors: list[str] = []
    for event in stream_chat([{"role": "user", "content": user_msg}]):
        etype = event.get("type")
        if etype == "test_cases":
            cases.extend(event.get("cases", []))
        elif etype == "error":
            errors.append(event.get("message", "unknown error"))
        elif etype == "done":
            break
    if errors and not cases:
        raise APIError("; ".join(errors))
    return cases


if generate:
    if not requirement.strip():
        st.warning("Enter a requirement first.")
    else:
        try:
            with st.spinner("Agent is generating test cases..."):
                cases = generate_cases(requirement.strip())
            st.session_state["generated_cases"] = cases
            st.session_state["generated_for"] = requirement.strip()
        except APIError as exc:
            st.error(f"{exc}")


# --- Display generated cases -------------------------------------------------
cases = st.session_state.get("generated_cases")
if cases:
    st.divider()
    st.caption(
        f"Generated {len(cases)} test case(s) for: "
        f"_{st.session_state.get('generated_for', '')}_"
    )

    for case in cases:
        label = (
            f"{case.get('test_id', '?')} — {case.get('title', '')} "
            f"[{case.get('priority', '?')}]"
        )
        with st.expander(label):
            st.markdown("**Preconditions**")
            for item in case.get("preconditions", []):
                st.markdown(f"- {item}")

            st.markdown("**Steps**")
            for i, step in enumerate(case.get("steps", []), start=1):
                st.markdown(f"{i}. {step}")

            st.markdown("**Expected Result**")
            st.markdown(case.get("expected_result", ""))

            st.markdown("**Pass Criteria**")
            st.markdown(case.get("pass_criteria", ""))

            st.caption(
                f"Confidence: {case.get('confidence', '?')} · "
                f"Est. duration: {case.get('estimated_duration_min', '?')} min · "
                f"{case.get('rationale', '')}"
            )

    # --- Export buttons ------------------------------------------------------
    st.divider()
    st.subheader("Export")
    exp_col1, exp_col2 = st.columns(2)

    # Flatten list fields for CSV
    csv_df = pd.DataFrame(
        [
            {
                **c,
                "preconditions": " | ".join(c.get("preconditions", [])),
                "steps": " | ".join(c.get("steps", [])),
            }
            for c in cases
        ]
    )
    exp_col1.download_button(
        "Download CSV",
        data=csv_df.to_csv(index=False).encode("utf-8"),
        file_name="test_cases.csv",
        mime="text/csv",
    )
    exp_col2.download_button(
        "Download JSON",
        data=json.dumps(cases, indent=2).encode("utf-8"),
        file_name="test_cases.json",
        mime="application/json",
    )
