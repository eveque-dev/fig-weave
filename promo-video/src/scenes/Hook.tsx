import { useCurrentFrame } from "remotion";
import { Stage, Footer, Picture, ramp, BLUE } from "../shared";
const messages = [
  { at: 24, text: "字体不要新罗马，换 Arial", x: 130, y: 330, rotate: -3 },
  { at: 57, text: "图例放左下角", x: 1210, y: 130, rotate: 3 },
  { at: 88, text: "字号再小一点", x: 1160, y: 700, rotate: -2 },
  { at: 121, text: "再往左一点", x: 130, y: 750, rotate: 2 },
  { at: 147, text: "等等，标题也要改", x: 900, y: 430, rotate: -3 },
];
export function Hook() {
  const f = useCurrentFrame();
  const out = ramp(f, 211, 240);
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${1 + out * 0.15})`,
          opacity: 1 - out,
          filter: `blur(${out * 12}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 104,
            top: 92,
            fontSize: 79,
            fontWeight: 650,
            letterSpacing: -2,
            opacity: ramp(f, 0, 15),
          }}
        >
          图画好了。
        </div>
        <div
          style={{
            position: "absolute",
            left: 560 - ramp(f, 70, 190, 0, 30),
            top: 230 - ramp(f, 40, 190, 0, 42),
            width: 1010,
            transform: `perspective(1800px) rotateY(${ramp(f, 0, 170, -6, 2)}deg) rotateZ(${ramp(f, 0, 160, 2, -2)}deg) scale(${ramp(f, 0, 190, 0.89, 1.04)})`,
            boxShadow: "0 35px 90px #000b",
          }}
        >
          <Picture />
          <div
            style={{
              position: "absolute",
              right: 20,
              bottom: 18,
              padding: "10px 16px",
              background: "#fff",
              fontSize: 19,
              color: "#555",
            }}
          >{`figure_v${Math.min(8, 1 + Math.floor(f / 27))}.R`}</div>
        </div>
        {messages.map((m, i) => {
          const a = ramp(f, m.at, m.at + 12);
          return (
            <div
              key={m.text}
              style={{
                position: "absolute",
                left: m.x,
                top: m.y,
                opacity: a,
                transform: `translateY(${(1 - a) * 28}px) rotate(${m.rotate}deg)`,
                padding: "25px 33px",
                border: "1px solid #42464d",
                borderRadius: 13,
                background: i % 2 ? "#edf2fa" : "#1b1e23",
                color: i % 2 ? "#15191f" : "#f5f6f7",
                fontSize: 36,
                fontWeight: 500,
                boxShadow: "0 12px 36px #0006",
              }}
            >
              {m.text}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: 205,
            top: 630,
            background: "#121519",
            border: "1px solid #363c46",
            padding: "17px 30px",
            fontFamily: "monospace",
            fontSize: 23,
            color: BLUE,
            opacity: ramp(f, 75, 88),
          }}
        >
          $ Rscript figure_v{Math.min(8, 1 + Math.floor(f / 27))}.R{" "}
          <span style={{ color: "#b1b7c0", marginLeft: 80 }}>重新运行…</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 795,
          padding: "18px 26px",
          background: "#090a0bea",
          borderLeft: "3px solid #9cbfff",
          fontSize: 46,
          fontWeight: 600,
          opacity: ramp(f, 175, 195) * (1 - out),
        }}
      >
        为了几处小改动，又补了一轮 prompt。
      </div>
      <Footer label="AI 写初稿，细节还在来回改" />
    </Stage>
  );
}
