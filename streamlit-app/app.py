"""ADAS Test Agent — Streamlit MVP (prototype)

Entry point for the multi-page Streamlit app. Files in `pages/` are auto-
populated into the sidebar by Streamlit.
"""

import streamlit as st

from utils.api_client import API_BASE, health

st.set_page_config(
    page_title="ADAS Test Agent",
    layout="wide",
)

st.warning(
    "⚡ **This is the Streamlit prototype.** "
    "See the production Next.js version at http://localhost:3000 →",
    icon="⚡",
)

st.title("ADAS Test Agent — Internal R&D Prototype")

st.markdown(
    """
    Chat with an AI agent to query ADAS sensor test results, auto-generate
    test cases, and visualize quality metrics. This prototype backs the
    Magna AI & SW Technologies team's rapid-iteration workflow.
    """
)

# --- API health check ---------------------------------------------------------
st.subheader("Backend status")
ok = health()
if ok:
    st.success(f"✓ API reachable at {API_BASE}")
else:
    st.error(
        f"✗ Cannot reach API at {API_BASE}. "
        "Start it with `uvicorn main:app --reload --port 8000` from the `api/` directory."
    )

st.divider()

st.markdown(
    """
    ### Pages
    Use the sidebar to navigate:
    - **dashboard** — KPI summary, charts, and recent test results
    - **test_generator** — generate structured test cases from a natural-language requirement
    - **agent_chat** — open-ended conversation with the AI agent
    """
)

st.caption("Streamlit MVP · v0.1 · Phase 3 prototype")
