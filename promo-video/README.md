# FigWeave 宣传短片

第三版封面修订（2026-09-26）：33 秒、1920 × 1080、30 fps，曜石黑背景。
采用独立设计的“代码与图形编织”视觉，只有原创合成音效，无配乐、无人声。

![代码画图，网页改图。](../assets/figweave/promo-cover-v3.png)

前 1 秒将封面直接编码进 MP4，随后以代码和真实图形的连接展开；中段演示实际 ggplot2 编辑与 R 脚本导出；
结尾介绍三个在线入口及它们各自的输出格式。封面是单独设计的概念插画。

| 时间 | 内容 |
| --- | --- |
| 0–1 秒 | 完整封面，从成片第一帧即可看到 |
| 1–9 秒 | 代码与真实图表通过编织线条连接；点出字体、字号、图例的零散要求 |
| 9–11.5 秒 | 「打开网页，接着改图」 |
| 11.5–21 秒 | 真实 ggplot2 图表：12 pt → 10 pt，图例右侧 → 图内左下方 |
| 21–27 秒 | 实际导出 R 代码的节选与修改后的图表并置 |
| 27–30 秒 | Matplotlib、Plotly / pyecharts、ggplot2 三个网页入口与导出格式 |
| 30–33 秒 | FigWeave 品牌、官网入口与派生关系 |

## 声音设计

10 类原创程序合成音色、29 个同步事件：低频启动、机械按键、编织连接、干燥点击、
字号调节卡点、拖拽摩擦、松手落位、代码写入、文件落定、空气转场。
拖图例时声像从右向左移动；按键有力度和时间变化；阅读字幕期间保留静默。
没有循环背景声、音乐、人声或第三方录音素材。

运行生成器会输出 `out/sound-design.json`，记录所有时间点、音色、声像和音量测量。
正文音效整体顺延 1 秒，封面配独立开启与转场声。
PCM 峰值 0.46（约 −6.74 dBFS），为 AAC 编码留出余量。

## 构建

Node.js 24；Remotion 4.0.527。依赖默认走 npmmirror。

```sh
npm ci
npm run lint
npm run dev
npm run render
```

推荐 Ubuntu 24.04 / macOS 15 或更新系统使用默认渲染器。
GitHub Actions 中可手动运行 **FigWeave promo video**，下载成片和审阅帧。
CI 使用专门制作的封面，不再从成片截帧作封面。

旧版 macOS 可通过 Remotion Player、Chrome 与兼容 FFmpeg 渲染相同的逐帧动画：

```sh
# 使用 PATH 中的 FFmpeg，或通过 FFMPEG_PATH 指定可执行文件。
npm run render:browser
# 检查封面、交界处与正文关键帧：
node scripts/render-browser.mjs --review
```

`render:browser` 需要 Chrome。逐帧等待字体与图像解码后截图；
FFmpeg 将 990 帧和音效编码为 MP4，不改变动画时间轴。
时长、帧率和关键帧由 `timing.json` 统一管理，两个渲染器与音效生成器共用。

## 素材、真实性与来源

- `public/v2/figure-*.png`：2026-09-26 在线 R 工作台实际下载的图表，继续用于第三版。
- `public/v2/workspace-*.png`：同一次真实操作的工作台截图。
- `public/v2/evidence.json`：图例拖拽前后坐标、实际导出代码和来源地址。
- `public/demo/`：原始 R 代码及实际导出的 R 脚本。
- `src/scenes/`：封面与六段正文动画；指针与选框按实测几何重建。
- `scripts/generate-sfx.mjs`：确定性原创合成音效。
- [封面提示词](../docs/promo/cover-prompt.md)、[差异与素材清单](../docs/promo/identity-and-sources.md)、[核验说明](../docs/promo/verification.md)。

画面由真实图表和操作动画组成，不宣称是连续屏幕录像。拖动时仅选框跟随指针，
释放后显示真实结果；放大的属性卡是演示标注。开场为流程示意，完整输入脚本在
`public/demo/original.R`。导出代码镜头保留实际数值，仅调整换行。
支持的修改保存在导出的可复现脚本中，不声称所有引擎都自动覆盖原始源码。

FigWeave 基于 Tavotto，保留上游版权、来源与 AGPL-3.0-only 许可证。
第三版不使用 Tavotto 的视频、封面、音轨或标志；更换了第二版中与参考片接近的
prompt 堆叠开场和纸张排版结尾。独立设计并不替代履行软件许可证。
Remotion 等依赖遵循各自许可证；Noto Sans SC 使用 SIL Open Font License。
