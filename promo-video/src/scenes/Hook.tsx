import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { Brand, Shell } from "../shared";
export const Hook = () => {
  const frame = useCurrentFrame();
  return (
    <Shell>
      <Brand />
      <Interactive.Div
        name="Hook title"
        style={{
          fontSize: 96,
          fontWeight: 750,
          letterSpacing: -3,
          marginTop: 62,
          lineHeight: 1.25,
        }}
      >
        图画好了，
        <br />
        还在补 prompt？
      </Interactive.Div>
      <div style={{ position: "absolute", right: 116, top: 272, width: 770 }}>
        {["字体不要新罗马，换 Arial", "图例放左下角", "字号再小一点"].map(
          (text, i) => (
            <Interactive.Div
              key={text}
              name="Prompt bubble"
              style={{
                background: "#fff",
                border: "1px solid #d2ded4",
                borderRadius: 28,
                padding: "35px 40px",
                marginBottom: 24,
                marginLeft: i === 1 ? 65 : 0,
                fontSize: 37,
                boxShadow: "0 12px 34px #25432e0c",
                opacity: interpolate(
                  frame,
                  [18 + i * 29, 32 + i * 29],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                ),
                translate: `0 ${interpolate(frame, [18 + i * 29, 32 + i * 29], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px`,
              }}
            >
              {text}
            </Interactive.Div>
          ),
        )}
      </div>
      <Interactive.Div
        name="Pain point"
        style={{
          position: "absolute",
          left: 112,
          bottom: 155,
          fontSize: 37,
          color: "#597163",
          opacity: interpolate(frame, [108, 123], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        为了几处小改动，又来回聊了一轮。
      </Interactive.Div>
    </Shell>
  );
};
