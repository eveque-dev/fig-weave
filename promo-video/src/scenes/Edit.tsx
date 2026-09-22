import {
  CanvasImage,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Shell } from "../shared";
export const Edit = () => {
  const frame = useCurrentFrame();
  return (
    <Shell>
      <div style={{ fontSize: 24, letterSpacing: 4, color: "#688372" }}>
        真实操作 / ggplot2
      </div>
      <Interactive.Div
        name="Edit title"
        style={{ fontSize: 82, fontWeight: 740, marginTop: 26 }}
      >
        拖图例。
        <br />
        调字号。
      </Interactive.Div>
      <div style={{ marginTop: 65, fontSize: 37, lineHeight: 1.9 }}>
        字号 <span style={{ color: "#779180" }}>12</span> → <b>10</b>
        <br />
        图例 右侧 → <b>左下方</b>
      </div>
      <div
        style={{
          marginTop: 45,
          fontSize: 27,
          color: "#627668",
          width: 540,
          lineHeight: 1.8,
        }}
      >
        保留绘图脚本，
        <br />
        把细节调整留在图上。
      </div>
      <div
        style={{
          position: "absolute",
          left: 780,
          top: 110,
          width: 1028,
          height: 825,
          borderRadius: 22,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 20px 65px #28433018",
        }}
      >
        <CanvasImage
          src={staticFile("screens/r-before.png")}
          style={{ position: "absolute", width: 1028, top: -72 }}
        />
        <CanvasImage
          src={staticFile("screens/r-after.png")}
          style={{
            position: "absolute",
            width: 1028,
            top: -72,
            opacity: interpolate(frame, [112, 126], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
        <div
          style={{
            position: "absolute",
            left: interpolate(frame, [52, 112], [880, 290], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            top: interpolate(frame, [52, 112], [405, 605], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            opacity: interpolate(frame, [30, 42, 145, 155], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <svg width="54" height="66" viewBox="0 0 32 40">
            <path
              d="M3 2 L27 24 L16 25 L11 37 Z"
              fill="#213f31"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 26,
            padding: "12px 23px",
            borderRadius: 30,
            background: "#edf4ee",
            color: "#254d36",
            fontSize: 24,
          }}
        >
          {frame < 119 ? "修改前" : "修改后 · 真实导出结果"}
        </div>
      </div>
    </Shell>
  );
};
