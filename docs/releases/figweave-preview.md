## FigWeave 0.15.0 预览版

官网：https://fig-weave.com

### 本次更新

- 新版中文优先界面，支持英文和六种背景颜色。
- 网页新增 Plotly / pyecharts：直接运行 Python，编辑图表，撤销并导出 PNG、JSON、Python。
- 网页 ggplot2 支持标准文字、图例、散点、曲线的显示偏移和 PNG / PDF / R 导出。
- Windows x64 与 macOS Apple Silicon 的独立预览安装包。

### 下载

- `FigWeave_0.15.0_windows_x64.exe`：Windows x64 安装包。
- `FigWeave_0.15.0_macos_arm64.dmg`：macOS Apple Silicon 安装包。
- `SHA256SUMS.txt`：安装包、源码和构建信息的 SHA-256。
- `build-info.json`：准确源码提交与构建记录。
- `figweave-source.zip`：本次构建对应源码。

### 预览范围

两个桌面包均未签名；macOS 包未公证，Windows 可能出现 SmartScreen 提示。
自动更新关闭，尚不作为正式签名发行版。Windows ARM、macOS Intel 无对应安装包。

桌面离线引擎目前支持 Matplotlib。本次新增的 Plotly / pyecharts / R 工作台先在网页版
提供，未宣称已经包含在桌面离线引擎中。ggplot2 拖拽保存显示偏移，不修改数据值。

构建通过 Windows/macOS 内置 Python 引擎冒烟测试。许可证为 AGPL-3.0-only；
FigWeave 基于 Tavotto，保留上游许可证与来源说明。
