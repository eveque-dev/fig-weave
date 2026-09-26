# FigWeave：产品方向、派生关系与宣传素材

更新日期：2026-09-26。适用于第三版宣传片及“代码画图，网页改图。”封面。

## 产品关系

FigWeave 是基于 [Tavotto](https://github.com/Tavotto/Tavotto) 的独立派生项目，
不是 Tavotto 官方发行，也不暗示获得上游背书。继承的对象编辑器、引擎与相关源码
继续保留原版权、AGPL-3.0-only 许可证和来源说明，不能因为重新设计宣传片就宣称
这些软件能力全部由 FigWeave 原创。

当前 FigWeave 的开发与宣传重点是多绘图库的网页入口、中文与可选背景体验、
按引擎提供的导出流程，以及自己的域名、仓库和预览发行渠道。
这里描述本项目的取向与已交付内容，不声称上游没有同类功能。

| FigWeave 当前入口 | 本片呈现的重点 | 宣传边界 |
| --- | --- | --- |
| `/try/` | 浏览器运行 Matplotlib 脚本，编辑对象，导出当前修改后的 PNG | 不声称将所有修改写回原始 Python 脚本 |
| `/charts/` | Plotly / pyecharts 在线 Python、图表配置及 PNG / JSON / Python 导出 | Python 导出按配置重建图表，不包含原数据处理过程 |
| `/r/` | ggplot2 字号与图例拖拽，以及可重放这些修改的 R 脚本 | 实验性；显示偏移不改数据值，不保证所有 grob 可编辑 |

能力以 [支持矩阵](../support-matrix.json) 和 [在线版说明](../figweave-online.md) 为准。

## 第三版采用的独立表达

- **封面**：新生成的“代码线条编织成图形”概念视觉；曜石黑、冰蓝与薄荷色，
  独立排版与“代码画图，网页改图。”标题。它是概念插画，不是产品截图；
  同时用于播放器预览图和成片内前 1 秒的画面。
- **开场**：代码输入与真实图表并置，以编织线条连接；移除第二版的悬浮 prompt
  堆叠、版本号递增和倾斜图纸镜头。
- **收束**：以三个网页入口及各自导出格式替换第二版的论文纸张排版镜头。
- **演示**：保留 FigWeave 线上实测的字号修改、图例移动及 R 导出证据。
  这些是功能演示，不据此宣称通用交互思路为本项目独有。
- **声音**：10 类程序合成音色、29 个同步事件；键盘、点击、字号卡点、拖拽摩擦、
  松手落位、代码写入、导出落定与转场分工；不使用参考片音轨或第三方采样。

## 素材来源

| 素材 | 来源与处理 |
| --- | --- |
| `assets/figweave/promo-cover-v3.png` | 内置 imagegen 新生成；未输入 Tavotto 画面作为参考。提示词见 [cover-prompt.md](cover-prompt.md) |
| `assets/figweave/promo-poster.png` | 上述专门设计封面的发布副本，不再从视频截帧 |
| `promo-video/public/v2/figure-*.png` | 自建示例脚本在 FigWeave 在线 R 工作台真实导出的图片 |
| `promo-video/public/v2/evidence.json` | 同一次操作的坐标和实际导出代码 |
| `promo-video/src/` | 本项目的 Remotion 动画、文字排版与品牌组件 |
| `promo-video/scripts/generate-sfx.mjs` | 本项目确定性合成音效；不包含任何录音素材 |
| Noto Sans SC | SIL Open Font License；许可随字体 npm 包提供 |
| Remotion 等构建依赖 | 各自许可证单独适用；项目的 AGPL 不替代依赖许可证 |

未将 Tavotto 视频、音轨、封面、标志放入这次宣传成片。原仓库保留的上游素材与
法律文档用于来源记录，不作为 FigWeave 自有品牌标识。

## 许可与发布

视觉差异不替代许可履行。源码保留 [LICENSE](../../LICENSE)、
[上游商标政策](../../TRADEMARKS.md) 和来源说明；网站保留源代码入口，
发布对应版本源码包。README、小红书文案与片尾明确派生关系。

WIPO 区分思想与其具体表达；AGPL 对修改、传播及网络交互源码有相应条件。
这些措施用于说明来源、避免误导和减少直接复用，不是“绝无版权风险”的法律结论。

参考：[WIPO Copyright Protection](https://www.wipo.int/en/web/copyright/protection)、
[GNU AGPL v3](https://www.gnu.org/licenses/agpl-3.0-standalone.html)。
