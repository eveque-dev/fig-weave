# FigWeave 在线入口

本工作副本是 Tavotto 的派生项目，用户于 2026-09-21 确认产品名 FigWeave，
域名 https://fig-weave.com。保留上游版权与 AGPL-3.0-only 许可证。

## 本阶段

- 网站默认中文，支持中英文、七种界面背景（默认曜石黑），提供 Matplotlib、Plotly/pyecharts 与实验性 R 工作台。
- `/try/` 复用现有编辑器与 Pyodide worker；首页不加载 Python 运行时。
- 在线页面里的桌面入口统一指向本站 `#downloads`，明确安装包尚未发布。
- 显示名与官网地址在 Python / TypeScript 品牌常量中保持一致。
- 上游仓库地址仍用于来源、既有引擎开发与历史文档，不是 FigWeave 发行仓库。

本阶段通过公开 GitHub Release 分发未签名桌面预览构建，不发布正式安装器，不启用 FigWeave 自动更新。既有桌面壳、PyPI 包名、
CLI、Codex 插件、文档格式及存储键仍带有 tavotto 标识。后续桌面迁移必须同时
处理签名、安装路径、更新源、遥测归属和发行仓库，不能只修改窗口标题后发布。
跨标签页文档占用频道也保持原标识，不随显示名变化，避免新旧页面互相失联。
Python 在线环境支持 seaborn、pandas plotting 与 NetworkX 生成的 Matplotlib 图，
复用原有对象编辑器。Plotly 与 pyecharts 在 `/charts/` 使用各自引擎接入；Bokeh、Altair 尚未接入。

`/r/` 通过 webR 运行 ggplot2 脚本，脚本需要将图赋给 `p`。支持标题、轴标签、
主题、基础字体与字号、图例位置、尺寸、撤销与 PNG/PDF/R 脚本导出。首次运行保留
脚本中的字号、字体与图例位置；字体选择为 R 通用的 sans / serif / mono，具体字形
取决于浏览器或导出设备，不保证指定商业字体。图例可选外侧四边、图内四角或隐藏。
标准文字、图例、散点和
折线支持拖拽与键盘显示偏移；不改变测量值，不写回原始 R 文件。布局编辑清空偏移，
撤销可恢复，界面会提示清除；支持单独恢复选中对象的位置或恢复全部偏移，Esc 取消
当前拖拽。依赖加载与脚本执行独立计时，用户脚本运行上限 30 秒，超时关闭会话，
重新运行可恢复。自定义 grob、栅格对象未接入。当前不包含本机离线 R 环境。
R 的默认 PDF 字体对非拉丁文字有限制，中文图建议先用 PNG 导出检查效果。
运行时与依赖分别锁定在 `packaging/r-browser-runtime.json` 和
`packaging/r-packages.lock.json`，构建时校验哈希并将 R 包随网站部署。

## 构建

使用仓库锁文件安装前端依赖，然后从仓库根执行：

```sh
cd web
pnpm install --frozen-lockfile
cd ..
python scripts/build_figweave_site.py
```

产物是 `web/dist-site/`，包含首页 `index.html`、`try/index.html`、`r/index.html`、`charts/index.html`、
静态资源、编辑引擎、R 包和许可证。整个目录作为网站根目录部署，保留目录尾斜杠。
静态服务器应返回真实文件或 404，不把缺失资源回退成首页 HTML。
首页 `?lang=zh` / `?lang=en` 与体验页双向链接，不依赖另一个网站仓库或 `/zh/`。

浏览器 Python 按 `packaging/playground-runtime.json` 从本站下载。部署前执行：

```sh
python scripts/mirror_pyodide_runtime.py /var/www/fig-weave/runtime/pyodide/v314.0.5
```

镜像脚本从锁定版本的上游地址获取运行时和允许包的传递依赖，按上游锁文件逐包
核对版本与 SHA-256；不会下载整个包仓库。Nginx 将 `/runtime/` 映射到该目录的
`runtime/` 根，允许静态资源跨域读取，以支持本地预览。浏览器仍在本机执行代码，
服务器只提供静态文件。运行时目录独立于网站发布目录，以便切换版本和回滚。
网站同时发布 `/source/figweave-source.zip`，Git 工作区发布时内容对应 `version.txt` 中的 Git 提交；无 Git 的源码快照发布时，
该文件明确记录 `git_commit: null`、源码包 SHA-256 和 playground 指纹，不冒充提交。

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
同时真实运行三个 Python 库与 ggplot2，检查 R 样式、撤销和导出。
Windows PowerShell 使用已安装 Chrome 时先设置 `$env:PLAYWRIGHT_CHANNEL='chrome'`。
运行 Vitest 时可先设置 `$env:NODE_OPTIONS='--no-experimental-webstorage'`，
再执行 `pnpm exec vitest run --maxWorkers=4`（现有 `pnpm test` 的环境变量写法只适用于 POSIX）。

发布前还需在真实浏览器验证首页 → 案例运行 → 改图 → 返回首页，以及中英文
与窄屏布局。公开分发修改版时一并提供对应源码与构建说明。

## 国内依赖源（2026-09-22）

前端仓库的 `web/.npmrc` 默认使用阿里系 `https://registry.npmmirror.com/`。
继续通过 `pnpm install --frozen-lockfile` 安装，保留锁文件完整性检查，不更换依赖版本。
Python 开发环境需要安装包时，可按次指定阿里云源：

```sh
python -m pip install --index-url https://mirrors.aliyun.com/pypi/simple/ -r requirements-dev.txt
```

浏览器运行的 Pyodide/webR 包不是普通 PyPI/CRAN 的本机二进制包，不能直接替换成
普通镜像地址。Pyodide 已通过锁文件校验后自托管；R 包由构建脚本校验后随站点分发，
webR 核心目前仍来自锁定版本的官方地址。不要用取消哈希或浮动版本来换取镜像命中。


## 交互图表与桌面预览（2026-09-22）

`/charts/` 在独立 Pyodide Worker 中执行 Python。Plotly 对象名 `fig`，pyecharts
对象名 `chart`。运行超时 30 秒（依赖冷启动另给 360 秒），取消直接终止 Worker。
支持标题、轴名、原生 JSON 配置修改与撤销；Plotly 支持其原生文字编辑、图例与注释
拖拽。导出 PNG、JSON、重建当前图表的 Python。导出的 Python 不保留数据处理过程，
原始源码仍在输入区。每次运行新 Worker；源码不写浏览器存储、不由应用上传。
只接受单图，拒绝 JsCode / JS 回调，不接本地数据文件、外部地图或任意 pip 安装。
纯 Python 包由 `packaging/chart-wheels.json` 锁定，优先阿里云镜像并验 SHA-256；
Pyodide 原生包使用同一个官方运行时锁，部署到自托管 runtime。

Windows x64 EXE、macOS Apple Silicon DMG 由公开仓库的 `figweave-preview.yml` 构建，
属于未签名预览包，更新渠道关闭。当前在线新增 R / Plotly / pyecharts 工作台尚未
打进桌面离线引擎；桌面包保持原有 Matplotlib 编辑能力。


Plotly 浏览器归档从已验 SHA-256 的官方 wheel 确定性生成，仅移除 Jupyter 扩展与
widget JavaScript 资源；保留 Python、普通 HTML 渲染资源和许可证。归档本身也有
独立锁定的 SHA-256，从约 9.7 MB 缩小为 5.2 MB。工作台不提供 Jupyter FigureWidget。

### Matplotlib 在线 PNG 下载

编辑器工具栏下方提供“导出 PNG”，使用同一 Pyodide 会话按点击时的修改快照
生成宽 2400 像素的图片，保留图形比例。导出不会上传脚本，不改变撤销历史。
导出中禁止重复提交；切换脚本会放弃旧会话的下载。当前此入口仅支持 PNG，
不代表已实现 PDF/SVG 或 Python 源码写回。

2026-09-26：在线界面采用黑底白字主题，Matplotlib 编辑器分为文件栏、工具栏和元素／画布／属性三区；导出位于右上角。每次打开默认曜石黑，旧的背景存储不覆盖默认值，界面主题不改变图表和导出颜色。

首页使用原生页面滚动驱动固定图表舞台；五个阶段依次展示图表、对象选择、字号、图例与导出，倒滚可回看。章节按钮和跳过链接可直接导航，减少动态效果模式使用静态章节切换。演示是实际 Matplotlib 渲染的图表，不会在首页启动 Python Worker。
