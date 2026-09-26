import { useCurrentFrame } from "remotion";
import { Stage, Brand, WEBSITE_URL, BLUE, ramp } from "../shared";
export function Closing() {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          opacity: ramp(f, 0, 15),
          transform: `translateY(${ramp(f, 0, 28, 25, 0)}px)`,
        }}
      >
        <Brand size={133} />
        <div
          style={{
            fontSize: 46,
            marginTop: 64,
            fontWeight: 500,
            letterSpacing: -1,
          }}
        >
          少补一轮 prompt。多一点直接。
        </div>
        <div style={{ fontSize: 42, marginTop: 55, color: BLUE }}>
          {WEBSITE_URL.replace("https://", "")}
        </div>
        <div style={{ fontSize: 24, marginTop: 24, color: "#a8adb4" }}>
          在线体验 · 默认中文 · 曜石黑
        </div>
      </div>
    </Stage>
  );
}
