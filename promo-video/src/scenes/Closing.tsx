import { useCurrentFrame } from "remotion";
import {
  Stage,
  Brand,
  PRODUCT_NAME,
  UPSTREAM_PRODUCT_NAME,
  WEBSITE_URL,
  BLUE,
  ramp,
} from "../shared";
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
          代码画图，网页改图。
        </div>
        <div style={{ fontSize: 42, marginTop: 55, color: BLUE }}>
          {WEBSITE_URL.replace("https://", "")}
        </div>
        <div style={{ fontSize: 24, marginTop: 24, color: "#a8adb4" }}>
          {PRODUCT_NAME} 独立派生项目 · 基于 {UPSTREAM_PRODUCT_NAME} ·
          AGPL-3.0-only
        </div>
      </div>
    </Stage>
  );
}
