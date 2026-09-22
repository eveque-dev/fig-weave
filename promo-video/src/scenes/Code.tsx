import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { Shell } from "../shared";
export const Code = () => {
  const frame = useCurrentFrame();
  return (
    <Shell dark>
      <Interactive.Div
        name="Reproducible title"
        style={{ fontSize: 82, fontWeight: 700 }}
      >
        修改不只留在画面里。
      </Interactive.Div>
      <div style={{ fontSize: 37, color: "#bbcdc1", marginTop: 28 }}>
        支持的修改随脚本导出，下次运行还能重现。
      </div>
      <Interactive.Div
        name="Exported R code"
        style={{
          marginTop: 45,
          background: "#101f19",
          border: "1px solid #466152",
          borderRadius: 26,
          padding: "32px 46px",
          opacity: interpolate(frame, [12, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            fontSize: 25,
            color: "#abc2b2",
            paddingBottom: 28,
            borderBottom: "1px solid #304839",
          }}
        >
          figure-styled.R{" "}
          <span style={{ float: "right", color: "#acd7b6" }}>
            ✓ 实际导出脚本节选
          </span>
        </div>
        <pre
          style={{
            fontSize: 29,
            lineHeight: 1.65,
            color: "#dfece3",
            margin: "20px 0 0",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {
            "# 原脚本与重放辅助函数保留\nfigweave_plot <- p + ggplot2::theme(\n  text = ggplot2::element_text("
          }
          <span style={{ color: "#f1c17f" }}>size = 10</span>
          {
            '),\n  legend.position = "right"\n)\nfigweave_result <- figweave_scene(figweave_plot,\n  list('
          }
          <span style={{ color: "#f1c17f" }}>
            {'"legend:0" = c(-0.65, 0.23)'}
          </span>
          {"), 7, 5)\ngrid::grid.draw(figweave_result)"}
        </pre>
      </Interactive.Div>
      <div style={{ fontSize: 25, color: "#a7c0af", marginTop: 22 }}>
        演示：字号与图例显示偏移；偏移数值为便于阅读已四舍五入。
      </div>
    </Shell>
  );
};
