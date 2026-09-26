import { useCurrentFrame } from "remotion";
import evidence from "../../public/v2/evidence.json";
import { Stage, Footer, Picture, Caption, Cursor, ramp, BLUE } from "../shared";
// Values are measured from the real R editor. Only the selection outline follows
// the pointer during dragging; the real exported figure replaces it on release.
export function Edit() {
  const f = useCurrentFrame();
  const changed = f >= 75;
  const dragging = f >= 156 && f < 220;
  const moved = f >= 220;
  const scale = ramp(f, 111, 150, 1, 1.12);
  const paperX = 745 + ramp(f, 111, 150, 0, 40),
    paperY = 165;
  const w = 1050;
  const h = 750;
  const dx = ramp(f, 163, 218, 0, -0.65 * w * scale),
    dy = ramp(f, 163, 218, 0, 0.23 * h * scale);
  const legendW =
      (evidence.legendBefore.width / evidence.plot.width) * w * scale,
    legendH = (evidence.legendBefore.height / evidence.plot.height) * h * scale;
  const lx =
    paperX +
    0.8 * w * (1 - scale) +
    ((evidence.legendBefore.x - evidence.plot.x) / evidence.plot.width) *
      w *
      scale;
  const ly =
    paperY +
    0.55 * h * (1 - scale) +
    ((evidence.legendBefore.y - evidence.plot.y) / evidence.plot.height) *
      h *
      scale;
  const ex = lx + dx,
    ey = ly + dy;
  return (
    <Stage>
      <Caption
        index={f < 129 ? "01 / 调字号" : "02 / 拖图例"}
        title={
          f < 129 ? "“字号小一些。”\n直接调。" : "“图例放左下。”\n拖过去。"
        }
        detail={
          f < 129
            ? "选中后调整，立即看到结果。"
            : "选中图例，拖到你想要的位置。"
        }
      />
      <div
        style={{
          position: "absolute",
          left: paperX,
          top: paperY,
          width: w,
          transform: `scale(${scale})`,
          transformOrigin: "80% 55%",
          boxShadow: "0 24px 75px #0008",
          opacity: ramp(f, 0, 17),
          border: "1px solid #393d44",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -46,
            left: -1,
            right: -1,
            height: 46,
            background: "#181b20",
            border: "1px solid #393d44",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            fontSize: 18,
            color: "#b7bec9",
          }}
        >
          <span>figure.R</span>
          <span>ggplot2 · 编辑演示</span>
        </div>
        <Picture state={moved ? "after" : changed ? "size" : "before"} />
      </div>
      {f < 139 && (
        <div
          style={{
            position: "absolute",
            left: 104,
            top: 575,
            width: 360,
            padding: "25px 28px",
            background: "#181b20",
            border: "1px solid #363c46",
            borderRadius: 10,
            opacity: ramp(f, 22, 34),
            transform: `translateY(${ramp(f, 22, 40, 15, 0)}px)`,
          }}
        >
          <div style={{ fontSize: 24, color: "#a8adb4", marginBottom: 19 }}>
            基础字号
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 59,
              fontWeight: 500,
            }}
          >
            <span style={{ color: changed ? BLUE : "#f5f6f7" }}>
              {changed ? "10" : "12"}
              <small style={{ fontSize: 23, color: "#a8adb4", marginLeft: 16 }}>
                pt
              </small>
            </span>
            <span style={{ fontSize: 21, color: "#828993" }}>− / ＋</span>
          </div>
        </div>
      )}
      {f >= 139 && (
        <div
          style={{
            position: "absolute",
            left: 104,
            top: 565,
            fontSize: 33,
            color: moved ? BLUE : "#a8adb4",
            opacity: ramp(f, 139, 154),
          }}
        >
          {moved ? "已移到图内左下方" : "右侧 → 左下方"}
        </div>
      )}
      {dragging && (
        <div
          style={{
            position: "absolute",
            left: ex,
            top: ey,
            width: legendW,
            height: legendH,
            border: "2px solid #659cff",
            boxShadow: "0 0 0 3px #659cff18",
          }}
        />
      )}
      {f >= 42 && f < 125 && (
        <Cursor
          x={ramp(f, 42, 60, 535, 366)}
          y={ramp(f, 42, 60, 820, 688)}
          click={f >= 66 && f < 78}
          opacity={1 - ramp(f, 106, 122)}
        />
      )}
      {f >= 143 && f < 242 && (
        <Cursor
          x={ex + legendW / 2}
          y={ey + legendH / 2}
          click={f >= 156 && f < 168}
          opacity={ramp(f, 143, 155) * (1 - ramp(f, 230, 241))}
        />
      )}
      {moved && (
        <div
          style={{
            position: "absolute",
            left: 108,
            top: 662,
            fontSize: 25,
            color: "#a8adb4",
            opacity: ramp(f, 223, 236),
          }}
        >
          修改仍然属于这张图。
        </div>
      )}
      <Footer label="真实 ggplot2 渲染 · 12 pt → 10 pt · 图例移动" />
    </Stage>
  );
}
