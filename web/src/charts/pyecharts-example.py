from pyecharts import options as opts
from pyecharts.charts import Bar

chart = (
    Bar()
    .add_xaxis(["A", "B", "C", "D", "E"])
    .add_yaxis("Sample A", [12, 20, 16, 28, 23])
    .add_yaxis("Sample B", [9, 15, 19, 24, 30])
    .set_global_opts(
        title_opts=opts.TitleOpts(title="Sample comparison"),
        xaxis_opts=opts.AxisOpts(name="Group"),
        yaxis_opts=opts.AxisOpts(name="Response"),
    )
)
chart.render()
