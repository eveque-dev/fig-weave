# 宣传内容核验

- R 演示使用真实线上工作台运行 `promo-video/public/demo/original.R`。
- 基础字号从 12 改为 10；图例从右侧拖至图内左下方。
- 实际下载的 `figure-styled.R` 同时包含字号修改与 `legend:0` 显示偏移。
- 视频使用前后截图与指针动画，不把它宣称为连续屏幕录制。
- 原始 R 数据与代码保留；不宣传任意引擎的全部拖拽都自动改写原始源码。
- 音效为确定性合成波形，32 秒、48 kHz、双声道，峰值低于 0.23，无削波；无人声、无配乐。
- GitHub 完整历史经 Gitleaks 扫描；唯一命中为 `test_diagnostics_bundle_redacts_secrets_and_home` 的脱敏测试占位值。提供的服务器凭据未出现在历史对象中。
- 新工作流使用 GitHub 托管 runner。原看护用例把固定版本标签误计为自托管池；修正仅影响自定义标签集合，不改变 PR 三平台和缓存矩阵。手工将视频 runner 变为未登记标签后用例退出 1，恢复后四条 runner 信任区用例通过。

成片由 GitHub Actions `figweave-promo.yml` 生成，并附媒体参数、校验值及七张审阅帧。
