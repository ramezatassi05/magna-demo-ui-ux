"""Dashboard — KPIs, charts, and recent ADAS test results."""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st

from utils.api_client import APIError, get_stats, get_tests, get_trends

st.set_page_config(page_title="Dashboard — ADAS Test Agent", layout="wide")
st.title("Dashboard")


def fetch_all_tests() -> pd.DataFrame:
    """Paginate through /api/tests and return every record as a DataFrame."""
    all_items: list[dict] = []
    page = 1
    page_size = 200  # max allowed by the API
    while True:
        payload = get_tests(page=page, page_size=page_size)
        all_items.extend(payload["items"])
        if page >= payload["total_pages"] or not payload["items"]:
            break
        page += 1
    return pd.DataFrame(all_items)


# --- Load data ---------------------------------------------------------------
try:
    with st.spinner("Loading test data..."):
        stats = get_stats()
        trends = get_trends()
        df = fetch_all_tests()
except APIError as exc:
    st.error(f"{exc}")
    st.stop()


# --- KPI row -----------------------------------------------------------------
col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Tests", f"{stats['total_tests']:,}")
col2.metric("Pass Rate", f"{stats['pass_rate'] * 100:.1f}%")
col3.metric("Mean Detection Distance", f"{stats['mean_detection_distance']:.1f} m")
col4.metric("Mean False-Positive Rate", f"{stats['mean_false_positive_rate'] * 100:.2f}%")

st.divider()


# --- Chart row 1: sensor breakdown + result distribution ---------------------
left, right = st.columns(2)

with left:
    st.subheader("Results by sensor type")
    sensor_result = (
        df.groupby(["sensor_type", "result"]).size().unstack(fill_value=0).reset_index()
    )
    # Ensure consistent column order
    for col in ["pass", "fail", "warning"]:
        if col not in sensor_result.columns:
            sensor_result[col] = 0
    fig = px.bar(
        sensor_result,
        x="sensor_type",
        y=["pass", "fail", "warning"],
        color_discrete_map={"pass": "#10B981", "fail": "#EF4444", "warning": "#F59E0B"},
    )
    fig.update_layout(barmode="stack", xaxis_title="sensor", yaxis_title="tests", legend_title="")
    st.plotly_chart(fig, use_container_width=True)

with right:
    st.subheader("Overall result distribution")
    result_counts = stats["counts_by_result"]
    donut_df = pd.DataFrame(
        {"result": list(result_counts.keys()), "count": list(result_counts.values())}
    )
    fig2 = px.pie(
        donut_df,
        names="result",
        values="count",
        hole=0.5,
        color="result",
        color_discrete_map={"pass": "#10B981", "fail": "#EF4444", "warning": "#F59E0B"},
    )
    st.plotly_chart(fig2, use_container_width=True)


# --- Chart row 2: failures over last 30 days ---------------------------------
st.subheader("Failures — last 30 days")
trends_df = pd.DataFrame(trends).tail(30)
if not trends_df.empty:
    fig3 = px.line(
        trends_df,
        x="date",
        y="fail",
        markers=True,
    )
    fig3.update_traces(line_color="#EF4444")
    fig3.update_layout(xaxis_title="date", yaxis_title="fail count")
    st.plotly_chart(fig3, use_container_width=True)
else:
    st.info("No trend data available.")


# --- Recent tests table ------------------------------------------------------
st.subheader("Recent tests")
recent_cols = [
    "test_id",
    "sensor_type",
    "feature",
    "scenario",
    "result",
    "confidence_score",
    "timestamp",
]
# df is already sorted by timestamp DESC from the API
st.dataframe(df[recent_cols].head(25), use_container_width=True, hide_index=True)
