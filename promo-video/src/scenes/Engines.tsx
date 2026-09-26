import { useCurrentFrame } from "remotion";
import { Stage, Footer, Picture, ramp } from "../shared";
export function Engines() {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 105,
          fontSize: 76,
          fontWeight: 650,
          letterSpacing: -2,
        }}
      >
        把时间留给研究。
      </div>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 235,
          fontSize: 30,
          color: "#a8adb4",
        }}
      >
        图表导出，继续下一步。
      </div>
      <div
        style={{
          position: "absolute",
          left: 760,
          top: 58,
          width: 770,
          height: 1000,
          padding: 55,
          background: "#fff",
          color: "#14181d",
          transform: `perspective(1700px) rotateY(${ramp(f, 0, 60, -12, 0)}deg) scale(${ramp(f, 0, 65, 0.89, 0.77)})`,
          transformOrigin: "50% 45%",
          boxShadow: "0 30px 100px #0009",
        }}
      >
        <div style={{ fontSize: 29, fontWeight: 600, marginBottom: 18 }}>
          Response over time
        </div>
        <div
          style={{
            height: 4,
            width: "70%",
            background: "#cbd0d6",
            marginBottom: 38,
          }}
        />
        <Picture state="after" />
        <div style={{ fontSize: 16, marginTop: 14, marginBottom: 35 }}>
          Figure 01 · Control / Treatment
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[0, 1].map((col) => (
            <div key={col} style={{ flex: 1 }}>
              {Array.from({ length: 13 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: 5,
                    marginBottom: 12,
                    width: `${i % 5 === 4 ? 76 : 100}%`,
                    background: "#dce0e5",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <Footer label="页面为排版示意 · 图表为实际导出结果" />
    </Stage>
  );
}
