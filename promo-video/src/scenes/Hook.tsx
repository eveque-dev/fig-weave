import { useCurrentFrame } from "remotion";
import { Stage, Footer, Picture, ramp, BLUE, MUTED } from "../shared";
const lines = [
  "library(ggplot2)",
  "p <- ggplot(df, aes(time, response,",
  "            colour = condition)) +",
  "  geom_line() + geom_point() +",
  "  # … 其余样式",
  "  theme_minimal(base_size = 12)",
];
export function Hook() {
  const f = useCurrentFrame();
  const out = 1 - ramp(f, 226, 240);
  return (
    <Stage>
      <div style={{ opacity: out }}>
        <div
          style={{
            position: "absolute",
            left: 104,
            top: 94,
            fontSize: 76,
            fontWeight: 650,
            letterSpacing: -2,
            opacity: ramp(f, 0, 15),
          }}
        >
          让代码与图形，继续对话。
        </div>
        <div
          style={{
            position: "absolute",
            left: 108,
            top: 207,
            fontSize: 29,
            color: MUTED,
            opacity: ramp(f, 12, 29),
          }}
        >
          AI 写好初稿。最后的细节，在网页里调整。
        </div>
        <div
          style={{
            position: "absolute",
            left: 104,
            top: 336,
            width: 618,
            height: 422,
            background: "#13171c",
            border: "1px solid #36414c",
            borderRadius: 12,
            transform: `translateY(${ramp(f, 12, 35, 35, 0)}px)`,
            opacity: ramp(f, 12, 35),
          }}
        >
          <div
            style={{
              borderBottom: "1px solid #343d46",
              padding: "22px 26px",
              fontSize: 22,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>01 / 脚本输入</span>
            <span style={{ color: BLUE }}>Python · R</span>
          </div>
          <pre
            style={{
              fontSize: 23,
              lineHeight: 1.75,
              padding: "22px 26px",
              margin: 0,
              color: "#b6c7dc",
              fontFamily: "monospace",
            }}
          >
            {lines.map((line, i) => (
              <div
                key={line}
                style={{ opacity: ramp(f, 26 + i * 7, 36 + i * 7) }}
              >
                {line || " "}
              </div>
            ))}
          </pre>
          <div
            style={{
              position: "absolute",
              bottom: 25,
              left: 26,
              fontSize: 21,
              color: MUTED,
            }}
          >
            R 示例 · 代码节选
          </div>
        </div>
        <svg
          style={{
            position: "absolute",
            left: 722,
            top: 357,
            width: 420,
            height: 398,
          }}
          viewBox="0 0 420 398"
        >
          {Array.from({ length: 11 }, (_, i) => (
            <path
              key={i}
              d={`M 0 ${40 + i * 27} C 155 ${40 + i * 27}, 242 ${345 - i * 26}, 420 ${345 - i * 26}`}
              fill="none"
              stroke={i % 3 === 0 ? "#9fcfc9" : BLUE}
              strokeWidth={i % 3 === 0 ? 2.4 : 1.4}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - ramp(f, 53 + i * 2, 111 + i * 2)}
              opacity={0.42 + i * 0.035}
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            left: 1142,
            top: 313,
            width: 674,
            border: "1px solid #53606e",
            borderRadius: 10,
            overflow: "hidden",
            opacity: ramp(f, 75, 105),
            transform: `translateX(${ramp(f, 75, 112, 34, 0)}px)`,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              background: "#161c22",
              fontSize: 21,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>02 / 图形编辑</span>
            <span style={{ color: BLUE }}>浏览器工作台</span>
          </div>
          <Picture />
        </div>
        <div
          style={{
            position: "absolute",
            left: 108,
            top: 844,
            right: 108,
            display: "flex",
            alignItems: "center",
            gap: 48,
            fontSize: 31,
            opacity: ramp(f, 133, 157),
          }}
        >
          <span style={{ color: BLUE }}>那些零散要求</span>
          <span>“字体换 Arial”</span>
          <span>“字号小一些”</span>
          <span>“图例放左下”</span>
        </div>
      </div>
      <Footer label="脚本 → 图形 → 支持的修改随导出保留 · 流程示意" />
    </Stage>
  );
}
