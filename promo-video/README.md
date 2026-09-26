# FigWeave 宣传短片

第二版：32 秒、1920 × 1080、30 fps，曜石黑背景。只有原创合成音效，无配乐、无人声。
参考 [Tavotto 官方 33 秒宣传片](https://www.tavotto.com/zh/#film) 的叙事与镜头节奏；
全部画面、图表、动画、文案和音效使用 FigWeave 自身素材重新制作，未复用其视频或音轨。

同一张图贯穿全片：零散 prompt 不断出现 → 直接调整字号与拖动图例 →
把修改保存在导出的 R 脚本中 → 展示图表成品。

| 时间 | 内容 |
| --- | --- |
| 0–8 秒 | 原始图表、逐渐堆叠的修改要求、脚本版本与运行提示 |
| 8–10.5 秒 | 「把最后几步，交给鼠标」 |
| 10.5–20 秒 | 真实 ggplot2 图表：12 pt → 10 pt，图例右侧 → 图内左下方 |
| 20–26 秒 | 实际导出 R 代码的节选与修改后的图表并置 |
| 26–29 秒 | 图表置入页面的排版示意 |
| 29–32 秒 | FigWeave 品牌与官网入口 |

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

旧版 macOS 可通过 Remotion Player、Chrome 与兼容的 FFmpeg 渲染同一份逐帧动画：

```sh
# FFmpeg 可从系统 PATH 获取，也可以用 FFMPEG_PATH 指定本机兼容的可执行文件。
npm run render:browser
# 只检查九个关键帧，不编码成片：
node scripts/render-browser.mjs --review
```

`render:browser` 需要安装 Chrome。使用真实 Remotion Player 定位每一帧，等待字体与
图像解码后截图；FFmpeg 只负责将这 960 帧与音效编码为 MP4，不改变动画时间轴。

## 素材与真实性

- `public/v2/figure-*.png`：2026-09-26 从线上 R 工作台实际下载的图表。
- `public/v2/workspace-*.png`：同一次操作的真实工作台截图，用于核验。
- `public/v2/evidence.json`：图例拖拽前后坐标、实际导出代码和来源地址。
- `public/demo/`：原始 R 代码、实际导出的 R 脚本。
- `src/scenes/`：六段逐帧动画；指针与选框根据实测几何重建。
- `scripts/generate-sfx.mjs`：确定性音效，无第三方录音。
- `../docs/promo/verification.md`：媒体与操作核验说明。

拖动时只有选框跟随指针，释放后展示真实修改结果，与当前 R 工作台行为一致。
画面是图表素材与操作动画的组合，不宣称连续屏幕录像；放大的属性卡是演示标注。
代码画面保留实际导出的完整数值，只调整换行，不省略末位或伪造改动。
支持的修改保存在导出的可复现脚本中，不声称所有引擎、所有对象自动覆盖原始源码。
最终纸张为排版示意，不代表已投稿或发表。

项目源代码为 AGPL-3.0-only，沿用仓库 LICENSE。Remotion 等依赖遵循各自许可证；
Noto Sans SC 使用 SIL Open Font License，许可文件在其 npm 包中。
