# 上游 Tavotto 插件安装说明

本页仅说明上游 Tavotto 插件，不是 FigWeave 的发行渠道。FigWeave 在线入口与安装包见 [项目说明](../README.md)。

### 在 Codex 中第一次使用 Tavotto

> **普通用户不要克隆或构建这个仓库。** 源码安装只用于参与 Tavotto 开发。

先选你需要的方式：

| 你要做什么 | 需要安装什么 |
| --- | --- |
| Codex 画完图后，在 Tavotto 桌面窗口里继续拖拽修改 | Tavotto 桌面版 + Codex 插件（不需要 Python 引擎） |
| 在 Codex 里直接使用 Tavotto 画布、预检、修改与导出工具 | Codex 插件 + Tavotto Python 引擎 |
| 修改 Tavotto 本身 | 见下方「贡献者：从源码开发」 |

#### 完整的 Codex 集成

在终端依次运行：

```sh
codex plugin marketplace add Tavotto/Tavotto --sparse .agents/plugins
codex plugin add tavotto@tavotto
pipx install "tavotto[worker]"
```

然后**关闭当前 Codex 会话并新开一个会话**。插件的 skill 与 MCP 工具不会在已经
打开的会话里热重载。

**Windows 上还要再跑一条**（macOS / Linux 不需要）：

```sh
tavotto codex install
```

**升级插件之后要再跑一次。** 插件钉的启动命令是 `python3`，Windows 上这个名字
常常是微软商店的别名——命令在、却起不来，表现是「插件已启用，工具一个都没有」。
这条命令会真的跑一遍看启动器起不起得来，起不来就把已装副本的启动命令换成一个
验证过的解释器（`tavotto codex doctor` 只诊断不改）。成因与症状见
[`codex-plugin/README.md`](../codex-plugin/README.md)。

新会话里可以直接说：

> 用 Tavotto 画这张图。先运行 Tavotto 健康检查；健康后再画，最后在 Tavotto 里
> 打开。不要安装或升级任何已经可用的组件。

之后 Codex 修改、新建或重命名绘图脚本时，会调用插件的 `tavotto_refresh_project`
工具：Tavotto 重新读一遍项目（只做静态分析，不运行脚本），开着的 Tavotto 窗口
自己更新——你不需要手动刷新或重启。工具会报告哪些图现在可编辑、哪些还需要你在
Tavotto 里点一次「试运行并连接」、哪些有源脚本冲突要你来裁决。

已经画好的图只要改宽度、字体或字号下限时，直接说「把这张图改成 8 cm 宽、
Times New Roman、字号不小于 8 pt」：Codex 会调用 `tavotto_normalize_figure`——只改你
点名的那几项，其余内容、配色、数据、子图结构一律不动；缩小后文字装不下时先做有上限
的边距调整，再检查最终导出的文件本身（PDF 页面尺寸与嵌入字体、PNG 像素与 dpi）。
装不下、字体没装或需要改结构时它会停下来告诉你需要放宽哪一条，不会替你改标准，也
不会留下一个看起来成功的文件。

第一次出现项目目录授权时，确认的是 Tavotto 可以访问的本地图库目录。图、脚本和
数据仍在本机处理。

插件装在你本机的 `~/.codex` 配置里，因此只有会读取本机插件的 Codex 界面才能
加载它——终端里的 Codex CLI 与 Codex 桌面应用。不读取本机插件的界面（纯云端
会话、不认 `~/.codex/plugins` 的 IDE 集成）永远不会出现 Tavotto 工具——先在
终端的 `codex` 会话里验证，不要在那些界面里反复排障。

#### 只交给桌面版收尾

装桌面版 + 插件（上面的两条 `codex plugin` 命令；这条路**不需要** `pipx` 那行）。
让 Codex「在 Tavotto 里打开」时，插件的 skill 会用自带的交接脚本完成交接——它会
自己找到桌面版内置的命令行：

```sh
python3 <插件目录>/skills/tavotto-figure/scripts/handoff.py path/to/figure.py
```

别让 Codex 直接跑裸的 `tavotto open`：桌面安装包**刻意不改你的 PATH**，那条命令
只在 PyPI 安装之后才存在。这条路径不要求 Codex 内嵌画布，也不需要 Python 引擎。
脚本与产物应放在同一目录，产物优先保存为矢量 PDF。

#### 让 Codex 代你安装

把下面一句完整发给 Codex：

> 请严格按照 README 的「在 Codex 中第一次使用 Tavotto」执行普通用户安装。
> 不要 clone 或构建源码，不要运行 pnpm、npm、cargo、Tauri、测试或 editable
> install。只安装 Codex 插件和所需的 Tavotto 引擎，运行健康检查；需要新会话时
> 明确告诉我并停止。


## 贡献者：从源码开发

只有明确开发 Tavotto 源码时才进入仓库开发流程；参见 [上游贡献指南](https://github.com/Tavotto/Tavotto/blob/main/CONTRIBUTING.md)。
