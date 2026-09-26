import {
  AbsoluteFill,
  Img,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { PRODUCT_NAME, WEBSITE_URL } from "../../web/src/lib/brand";
export { PRODUCT_NAME, WEBSITE_URL };
export const INK = "#f5f6f7";
export const MUTED = "#a8adb4";
export const BLUE = "#9cbfff";
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const ramp = (
  frame: number,
  start: number,
  end: number,
  from = 0,
  to = 1,
) =>
  interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
export function Stage({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <AbsoluteFill
      style={{
        background: "#090a0b",
        color: INK,
        fontFamily: "Noto Sans SC Variable",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
export function Brand({ size = 35 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.32,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: -size * 0.045,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: size * 0.12,
          alignItems: "center",
          height: size,
        }}
      >
        {[0.94, 0.66, 0.42].map((v, i) => (
          <span
            key={i}
            style={{
              display: "block",
              height: size * v,
              width: size * 0.2,
              borderRadius: size * 0.065,
              background: i === 1 ? BLUE : INK,
              transform: "skewY(-15deg)",
            }}
          />
        ))}
      </div>
      {PRODUCT_NAME}
    </div>
  );
}
export function Footer({ label = "图表的最后一步" }: { label?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 104,
        right: 104,
        bottom: 52,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: MUTED,
        fontSize: 23,
      }}
    >
      <Brand size={30} />
      <span>{label}</span>
    </div>
  );
}
export function Picture({
  state = "before",
  style,
}: {
  state?: "before" | "size" | "after";
  style?: CSSProperties;
}) {
  return (
    <Img
      src={staticFile(`v2/figure-${state}.png`)}
      style={{ width: "100%", display: "block", background: "#fff", ...style }}
    />
  );
}
export function Cursor({
  x,
  y,
  click = false,
  opacity = 1,
}: {
  x: number;
  y: number;
  click?: boolean;
  opacity?: number;
}) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        filter: "drop-shadow(0 3px 6px #0009)",
        transform: click ? "scale(.91)" : "scale(1)",
        transformOrigin: "4px 4px",
      }}
    >
      {click && (
        <div
          style={{
            position: "absolute",
            left: -18,
            top: -18,
            width: 45,
            height: 45,
            border: "2px solid #9cbfff",
            borderRadius: 50,
            opacity: 0.65,
            transform: `scale(${1 + (f % 12) / 18})`,
          }}
        />
      )}
      <svg width="43" height="52" viewBox="0 0 34 42">
        <path
          d="M3 2V33L12 26L19 39L26 35L19 22H32Z"
          fill="#fff"
          stroke="#111318"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
export function Caption({
  index,
  title,
  detail,
}: {
  index: string;
  title: string;
  detail?: string;
}) {
  return (
    <div style={{ position: "absolute", left: 104, top: 96 }}>
      <div
        style={{
          fontSize: 21,
          color: BLUE,
          letterSpacing: 3,
          marginBottom: 24,
        }}
      >
        {index}
      </div>
      <div
        style={{
          fontSize: 70,
          fontWeight: 650,
          letterSpacing: -2,
          lineHeight: 1.3,
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>
      {detail && (
        <div
          style={{
            fontSize: 27,
            color: MUTED,
            marginTop: 22,
            lineHeight: 1.65,
            whiteSpace: "pre-line",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}
