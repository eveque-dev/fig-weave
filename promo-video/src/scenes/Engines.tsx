import { CanvasImage, Interactive, staticFile } from "remotion";
import { Shell } from "../shared";
export const Engines = () => (
  <Shell>
    <Interactive.Div
      name="Workflow title"
      style={{ fontSize: 88, fontWeight: 730 }}
    >
      从绘图脚本出发。
    </Interactive.Div>
    <div style={{ fontSize: 36, color: "#5c7666", marginTop: 25 }}>
      接着熟悉的 Python / R 工作流，完成最后的细节。
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 24,
        marginTop: 68,
      }}
    >
      {[
        { name: "Matplotlib", img: "matplotlib.webp", lang: "Python" },
        { name: "Plotly", img: "plotly.png", lang: "Python" },
        { name: "pyecharts", img: "pyecharts.png", lang: "Python" },
        { name: "ggplot2", img: "r-after.png", lang: "R" },
      ].map((e) => (
        <div
          key={e.name}
          style={{
            background: "white",
            border: "1px solid #d0ddd2",
            borderRadius: 25,
            overflow: "hidden",
          }}
        >
          <div
            style={{ height: 280, overflow: "hidden", background: "#f7f9f6" }}
          >
            <CanvasImage
              src={staticFile(`screens/${e.img}`)}
              style={{
                width: "100%",
                height: 280,
                objectFit: e.name === "Matplotlib" ? "contain" : "cover",
                objectPosition:
                  e.name === "ggplot2" ? "center bottom" : "right center",
              }}
            />
          </div>
          <div style={{ padding: 27 }}>
            <div style={{ fontSize: 35, fontWeight: 650 }}>{e.name}</div>
            <div style={{ fontSize: 24, marginTop: 12, color: "#678572" }}>
              {e.lang}
            </div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ fontSize: 26, color: "#617969", marginTop: 28 }}>
      各引擎支持的编辑范围不同，以对应工作台为准。
    </div>
  </Shell>
);
