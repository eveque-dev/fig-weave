import { useCurrentFrame } from "remotion";
import { Stage, Footer, Picture, ramp, BLUE } from "../shared";
import evidence from "../../public/v2/evidence.json";
const offset =
  evidence.exportExcerpt.match(/"legend:0" = c\(([^)]+)\)/)?.[1].split(",") ??
  [];
export function Code() {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 86,
          fontSize: 75,
          fontWeight: 650,
          letterSpacing: -2,
        }}
      >
        改动，带着代码一起走。
      </div>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 204,
          fontSize: 29,
          color: "#a8adb4",
        }}
      >
        导出 R 脚本，保留字号和图例位置。
      </div>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 306,
          width: 978,
          height: 618,
          background: "#12151a",
          border: "1px solid #353b45",
          borderRadius: 10,
          opacity: ramp(f, 4, 22),
          transform: `translateY(${ramp(f, 4, 22, 25, 0)}px)`,
        }}
      >
        <div
          style={{
            height: 67,
            padding: "17px 28px",
            fontSize: 24,
            borderBottom: "1px solid #30363f",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>figure-styled.R</span>
          <span style={{ fontSize: 20, color: BLUE }}>实际导出脚本 · 节选</span>
        </div>
        <pre
          style={{
            padding: "23px 30px",
            fontFamily: "monospace",
            fontSize: 24,
            lineHeight: 1.5,
            color: "#d7dce4",
            margin: 0,
          }}
        >
          {
            "figweave_plot <- p + ggplot2::theme(\n  text = ggplot2::element_text("
          }
          <span
            style={{
              background: f > 36 ? "#24334c" : "transparent",
              color: BLUE,
            }}
          >
            {"size = 10"}
          </span>
          {
            '),\n  legend.position = "right"\n)\n\nfigweave_result <- figweave_scene(\n  figweave_plot, list(\n    "legend:0" = c(\n      '
          }
          <span style={{ color: BLUE }}>{offset[0]}</span>
          {",\n      "}
          <span style={{ color: BLUE }}>{offset[1]}</span>
          {"\n    )), 7, 5\n)\ngrid::grid.draw(figweave_result)"}
        </pre>
      </div>
      <div
        style={{
          position: "absolute",
          right: 104,
          top: 360,
          width: 608,
          transform: `translateX(${ramp(f, 23, 52, 65, 0)}px)`,
          opacity: ramp(f, 23, 46),
        }}
      >
        <Picture state="after" />
        <div
          style={{
            fontSize: 24,
            color: BLUE,
            marginTop: 26,
            textAlign: "center",
          }}
        >
          图里的改动，脚本里也有。
        </div>
        <div
          style={{
            fontSize: 23,
            color: "#a8adb4",
            marginTop: 14,
            textAlign: "center",
          }}
        >
          ggplot2：支持的修改随导出脚本保存
        </div>
      </div>
      <Footer label="保留原始脚本 · 导出可复现版本" />
    </Stage>
  );
}
