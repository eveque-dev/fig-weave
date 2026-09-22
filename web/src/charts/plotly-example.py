import plotly.graph_objects as go

fig = go.Figure()
fig.add_scatter(x=[1, 2, 3, 4, 5], y=[2, 5, 4, 8, 7], mode="lines+markers", name="Sample A")
fig.add_scatter(x=[1, 2, 3, 4, 5], y=[1, 3, 5, 6, 9], mode="lines+markers", name="Sample B")
fig.update_layout(
    title="Response over time",
    template="plotly_white",
    xaxis_title="Time (h)",
    yaxis_title="Response",
)
fig.show()
