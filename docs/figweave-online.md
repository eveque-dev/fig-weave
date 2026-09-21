# FigWeave 在线入口

本工作副本是 Tavotto 的派生项目，用户于 2026-09-21 确认产品名 FigWeave，
域名 https://fig-weave.com。保留上游版权与 AGPL-3.0-only 许可证。

## 本阶段

- 网站首页支持中英文，明确区分当前 Matplotlib 能力与后续 Python / R 计划。
- `/try/` 复用现有编辑器与 Pyodide worker；首页不加载 Python 运行时。
- 在线页面里的桌面入口统一指向本站 `#downloads`，明确安装包尚未发布。
- 显示名与官网地址在 Python / TypeScript 品牌常量中保持一致。
- 上游仓库地址仍用于来源、既有引擎开发与历史文档，不是 FigWeave 发行仓库。

本阶段不发布桌面安装器，不启用 FigWeave 自动更新。既有桌面壳、PyPI 包名、
CLI、Codex 插件、文档格式及存储键仍带有 tavotto 标识。后续桌面迁移必须同时
处理签名、安装路径、更新源、遥测归属和发行仓库，不能只修改窗口标题后发布。
跨标签页文档占用频道也保持原标识，不随显示名变化，避免新旧页面互相失联。
ggplot2 与额外 Python 绘图库尚未接入，不将路线图写成已支持功能。

## 构建

使用仓库锁文件安装前端依赖，然后从仓库根执行：

```sh
cd web
pnpm install --frozen-lockfile
cd ..
python scripts/build_figweave_site.py
```

产物是 `web/dist-site/`，包含首页 `index.html`、`try/index.html`、两套静态资源、
编辑引擎和许可证。整个目录作为网站根目录部署，保留 `/try/` 的尾斜杠。
静态服务器应返回真实文件或 404，不把缺失资源回退成首页 HTML。
首页 `?lang=zh` / `?lang=en` 与体验页双向链接，不依赖另一个网站仓库或 `/zh/`。

首页只是入口，浏览器 Python 仍按 `packaging/playground-runtime.json` 下载。
服务器 TLS / DNS 的配置独立于这个构建；本次代码修改不会自动覆盖线上部署。

## 验证

```sh
cd web
pnpm build
pnpm test src/playground
pnpm i18n:check
cd ..
python scripts/build_browser_playground.py --check
```

独立站构建后，`cd web` 再执行
`pnpm exec playwright test e2e/figweave-site.spec.ts --project=chromium`，
验证根路径与子路径部署、中英文往返导航、静态资源和桌面版状态。
Windows PowerShell 使用已安装 Chrome 时先设置 `$env:PLAYWRIGHT_CHANNEL='chrome'`。
运行 Vitest 时可先设置 `$env:NODE_OPTIONS='--no-experimental-webstorage'`，
再执行 `pnpm exec vitest run --maxWorkers=4`（现有 `pnpm test` 的环境变量写法只适用于 POSIX）。

发布前还需在真实浏览器验证首页 → 案例运行 → 改图 → 返回首页，以及中英文
与窄屏布局。公开分发修改版时一并提供对应源码与构建说明。
