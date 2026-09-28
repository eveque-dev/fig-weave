# FigWeave 展示素材

当前 README 的六张界面截图统一位于 [`screenshots/2026-09-28/`](screenshots/2026-09-28/)，
由线上真实操作产生。默认中文、曜石黑；首页拍摄滚动演示的字号调整章节，Matplotlib、
Plotly、pyecharts 和 ggplot2 均运行真实脚本。背景选择截图展示七种选择。

[`capture.json`](screenshots/2026-09-28/capture.json) 记录准确部署提交、拍摄时间、Chrome 版本、
各张尺寸与 SHA-256，以及四种引擎实际下载的 PNG 尺寸和校验值。没有替换页面内容、覆盖样式或修图。

安装 `web` 开发依赖后，从仓库根目录执行：

```sh
node scripts/capture_figweave_screenshots.mjs https://fig-weave.com assets/figweave/screenshots/YYYY-MM-DD
```

需要已安装的 Chrome，可用 `PLAYWRIGHT_CHANNEL` 选择已有的 Playwright 浏览器通道。
目标站点必须提供有效的 `version.json`；脚本会等待运行完成、验证下载，并在拍摄中途
部署版本变化时失败。拍完仍需人工检查画面裁剪、字形、控件状态和可读性，再更新 README 引用。
日期目录让 GitHub 使用新图片 URL，避免继续显示旧缓存。

`promo-poster.png`、`promo-cover-v3.png` 与 `promo.mp4` 是 2026-09-26 第三版宣传素材；
封面是概念插画，视频是当日录制的演示，不作为当前 UI 的截图证据。
`assets/readme/` 与有日期的 UX / 验收文档保留上游历史材料，不能据此承诺 FigWeave 当前功能。
