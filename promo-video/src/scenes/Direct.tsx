import { useCurrentFrame } from "remotion";
import { Stage, Footer, ramp, BLUE } from "../shared";
export function Direct() {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 235,
          fontSize: 123,
          fontWeight: 700,
          lineHeight: 1.35,
          letterSpacing: -5,
          transform: `translateY(${ramp(f, 0, 25, 45, 0)}px)`,
          opacity: ramp(f, 0, 16),
        }}
      >
        把最后几步，
        <br />
        <span style={{ color: BLUE }}>交给鼠标。</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 130,
          top: 320,
          width: 2,
          height: ramp(f, 12, 42, 0, 280),
          background: "#5e769a",
        }}
      />
      <Footer label="直接编辑 Python / R 生成的图表" />
    </Stage>
  );
}
