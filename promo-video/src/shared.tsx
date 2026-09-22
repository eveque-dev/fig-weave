import { AbsoluteFill, Interactive } from "remotion";
import type { ReactNode } from "react";
import { PRODUCT_NAME, WEBSITE_URL } from "../../web/src/lib/brand";
export { PRODUCT_NAME, WEBSITE_URL };

export const Shell = ({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) => (
  <AbsoluteFill
    style={{
      background: dark ? "#192c25" : "#edf4ee",
      color: dark ? "#edf4ee" : "#1b3026",
      fontFamily: "Noto Sans SC Variable",
      padding: 112,
    }}
  >
    {children}
    <div
      style={{
        position: "absolute",
        bottom: 48,
        left: 112,
        right: 112,
        display: "flex",
        justifyContent: "space-between",
        fontSize: 23,
        letterSpacing: 2,
        opacity: 0.6,
      }}
    >
      <span>{PRODUCT_NAME} / 绘图的最后一步</span>
      <span>PYTHON + R</span>
    </div>
  </AbsoluteFill>
);
export const Brand = () => (
  <Interactive.Div
    name="Brand"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      fontSize: 44,
      fontWeight: 650,
    }}
  >
    <div style={{ display: "flex", alignItems: "end", gap: 7, height: 43 }}>
      <i
        style={{
          width: 10,
          height: 25,
          background: "#3d7193",
          borderRadius: 3,
        }}
      />
      <i
        style={{
          width: 10,
          height: 43,
          background: "#779781",
          borderRadius: 3,
        }}
      />
      <i
        style={{
          width: 10,
          height: 34,
          background: "#d19b61",
          borderRadius: 3,
        }}
      />
    </div>
    {PRODUCT_NAME}
  </Interactive.Div>
);
