import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import cover from "../../../assets/figweave/promo-cover-v3.png";
import timing from "../../timing.json";
import { ramp } from "../shared";

/** The cover is encoded into the film, starting at frame zero. */
export function Cover() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#090a0b", overflow: "hidden" }}>
      <Img
        src={cover}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${ramp(frame, 0, timing.coverFrames - 1, 1, 1.016)})`,
          opacity: 1 - ramp(frame, timing.coverFrames - 7, timing.coverFrames),
        }}
      />
    </AbsoluteFill>
  );
}
