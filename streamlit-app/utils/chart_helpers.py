"""Convert backend SSE `chart` events into Plotly figures.

Backend chart payload shape (from api/tools.py):
    {
      "chart_type": "bar" | "stacked-bar" | "line" | "donut",
      "title": str,
      "x_key": str,
      "y_keys": list[str],
      "data": list[dict],
      "series_colors": dict[str, str],
    }
"""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


def chart_event_to_plotly(event: dict) -> go.Figure:
    chart_type = event.get("chart_type", "bar")
    title = event.get("title", "")
    data = event.get("data", [])
    x_key = event.get("x_key", "")
    y_keys = event.get("y_keys", [])
    colors = event.get("series_colors", {}) or {}

    df = pd.DataFrame(data)

    if chart_type == "donut":
        # donut: one slice per row, value = first y_key, label = x_key
        value_key = y_keys[0] if y_keys else (df.columns[1] if len(df.columns) > 1 else df.columns[0])
        fig = px.pie(
            df,
            names=x_key,
            values=value_key,
            hole=0.5,
            title=title,
        )
        return fig

    if chart_type == "line":
        fig = go.Figure()
        for key in y_keys:
            fig.add_trace(
                go.Scatter(
                    x=df[x_key],
                    y=df[key],
                    mode="lines+markers",
                    name=key,
                    line=dict(color=colors.get(key)) if colors.get(key) else None,
                )
            )
        fig.update_layout(title=title, xaxis_title=x_key)
        return fig

    # bar + stacked-bar
    fig = go.Figure()
    for key in y_keys:
        fig.add_trace(
            go.Bar(
                x=df[x_key],
                y=df[key],
                name=key,
                marker_color=colors.get(key),
            )
        )
    barmode = "stack" if chart_type == "stacked-bar" else "group"
    fig.update_layout(title=title, barmode=barmode, xaxis_title=x_key)
    return fig
