# FigWeave 宣传短片

32 秒、1920 × 1080、30 fps。只有原创合成界面音效，无配乐、无人声。
主线：反复补 prompt → 在图上编辑 → 修改随可复现脚本导出。

```sh
npm ci
npm run sfx
npm run dev
npm run render
```

Node.js 24；Remotion 4.0.527。依赖默认走 npmmirror。
推荐 Ubuntu 24.04 / macOS 15 或更新系统渲染；旧版 macOS 的原生编码器不兼容。
也可在 GitHub Actions 手动运行 **FigWeave promo video**，下载视频及检查帧。

- `src/scenes/`：六个独立场景，基于帧数的动画。
- `public/screens/`：真实工作台截图，R 示例已实际运行。
- `public/demo/`：原始 R 代码、真实导出的 R 代码及节选。
- `scripts/generate-sfx.mjs`：确定性生成音效，无第三方录音。
- `../docs/promo/xiaohongshu.md`：小红书文案。

视频中的 R 脚本为实际导出的节选，图例偏移数值为阅读方便四舍五入。
拖拽演示使用实际修改前后截图与指针动画；没有伪装成逐帧屏幕录像。
当前支持的修改可随导出脚本重放，不声称任意引擎、任意对象均自动修改原始源码。

项目源代码为 AGPL-3.0-only，沿用仓库 LICENSE。Remotion 等第三方依赖遵循各自许可证；
Noto Sans SC 字体使用 SIL Open Font License，许可文件在其 npm 包中。
制作参考 [Remotion 官方 skills](https://github.com/remotion-dev/skills)。
