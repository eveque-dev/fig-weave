import { useCurrentFrame } from "remotion";
import { Stage, Footer, ramp, BLUE, MUTED } from "../shared";
const entries = [
  {
    path: "/try/",
    name: "Matplotlib",
    body: "对象编辑 · 撤销",
    output: "PNG",
    note: "seaborn / pandas / NetworkX",
    color: BLUE,
  },
  {
    path: "/charts/",
    name: "Plotly / pyecharts",
    body: "图表配置 · 在线 Python",
    output: "PNG · JSON · Python",
    note: "按当前配置重建图表",
    color: "#acd5cb",
  },
  {
    path: "/r/",
    name: "ggplot2",
    body: "字号样式 · 对象拖拽",
    output: "PNG · PDF · R",
    note: "实验性 · 支持的修改随脚本导出",
    color: "#d1c1a4",
  },
];
export function Engines() {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 106,
          fontSize: 73,
          fontWeight: 650,
          letterSpacing: -2,
        }}
      >
        选你的绘图库，打开就开始。
      </div>
      <div
        style={{
          position: "absolute",
          left: 108,
          top: 222,
          fontSize: 29,
          color: MUTED,
        }}
      >
        三个在线入口 · 按引擎提供编辑与导出
      </div>
      <div
        style={{
          position: "absolute",
          left: 104,
          right: 104,
          top: 354,
          display: "flex",
          gap: 24,
        }}
      >
        {entries.map((entry, i) => (
          <div
            key={entry.path}
            style={{
              flex: 1,
              minWidth: 0,
              height: 434,
              padding: "34px 32px",
              border: "1px solid #35404b",
              borderTop: `3px solid ${entry.color}`,
              borderRadius: 8,
              background: "#12161b",
              opacity: ramp(f, i * 5, i * 5 + 14),
              transform: `translateY(${ramp(f, i * 5, i * 5 + 20, 28, 0)}px)`,
            }}
          >
            <div
              style={{
                color: entry.color,
                fontSize: 24,
                marginBottom: 36,
                fontFamily: "monospace",
              }}
            >
              {entry.path}
            </div>
            <div
              style={{
                fontSize: i === 1 ? 39 : 49,
                fontWeight: 600,
                height: 71,
              }}
            >
              {entry.name}
            </div>
            <div style={{ fontSize: 26, color: MUTED, marginTop: 13 }}>
              {entry.body}
            </div>
            <div style={{ fontSize: 28, marginTop: 51, color: entry.color }}>
              {entry.output}
            </div>
            <div style={{ fontSize: 21, marginTop: 23, color: MUTED }}>
              {entry.note}
            </div>
          </div>
        ))}
      </div>
      <Footer label="默认中文 · 曜石黑 · 背景色可切换" />
    </Stage>
  );
}
