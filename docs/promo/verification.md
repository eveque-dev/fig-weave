# 宣传内容核验

## 第二版（2026-09-26）

- 参考 Tavotto 官网 33 秒宣传片的叙事：零散修改要求累积、直接操作图表、展示成品与品牌收束。
- 使用 FigWeave 自身素材与重新编排的动画，无 Tavotto 视频、画面或音轨拷贝。
- R 演示在 `https://fig-weave.com/r/?lang=zh` 运行 `promo-video/public/demo/original.R`。
- 实际调整基础字号 12 → 10；图例从右侧拖至图内左下方。
- 修改前、改字号后、移图例后的 PNG 均为真实下载；工作台截图与坐标存于 `promo-video/public/v2/`。
- `figure-styled.R` 包含 `size = 10` 与 `legend:0` 偏移；视频代码节选保留精确导出值，未四舍五入。
- 指针、选框和镜头为 Remotion 动画；释放前图例仍在原位，释放后切换至真实结果，不伪装成连续屏幕录像。
- 扩大的字号卡为演示标注；最终纸张为排版示意。原始数据、代码与图表修改分别保留。
- 不宣传任意引擎、任意对象的拖拽都自动覆盖原始源码。
- 原创合成点击、移动与完成提示音；32 秒、48 kHz、双声道，无人声、无配乐。
- 逐帧动画采用 30 fps，输出 960 帧；检查中文字体、选框落点、字幕遮挡与片尾地址。
- 可用 Remotion 标准渲染器，或本地 Remotion Player + Chrome + FFmpeg 产生同一时间轴。

## 历史核验

- 第一版曾由 GitHub Actions `figweave-promo.yml` 输出成片、媒体参数、校验值及审阅帧。
- GitHub 历史曾经 Gitleaks 扫描；唯一命中为脱敏测试中的占位值。
- 视频工作流使用 GitHub 托管 runner；原 runner 信任区用例修正不改变 PR 平台与缓存矩阵。
