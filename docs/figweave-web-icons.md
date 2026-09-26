# FigWeave 网页图标

可编辑真源是 `web/public/favicon.svg`，沿用网站的三条斜柱标识：曜石黑底、
白色与冰蓝色。独立于上游 Tavotto 的 `assets/icon/`，不复用其商标图案。

`web/public/` 随 Vite 构建复制到每个入口，因此首页、Matplotlib、R、
Plotly / pyecharts 都能加载同一组图标，子路径部署也使用相对地址。

| 文件 | 用途 |
| --- | --- |
| `favicon.svg` | 可缩放标签页图标，唯一手工编辑的视觉真源 |
| `favicon.ico` | 包含 16、32、48 像素的浏览器回退图标 |
| `favicon-32.png` | 32 像素 PNG 回退 |
| `apple-touch-icon.png` | 180 像素、不透明的 Apple 收藏/桌面图标 |
| `icon-192.png`、`icon-512.png` | Web manifest 图标，标识位于遮罩安全区内 |
| `site.webmanifest` | 图标及品牌元数据；仍以浏览器方式打开，不声明离线功能 |

修改 SVG 后，用现有 Node 24、Playwright 和 Chrome 重新生成其余文件：

```sh
cd web
node scripts/generate-site-icons.mjs
```

生成器从 `src/lib/brand.ts` 读取产品名，栅格尺寸与 ICO 都由同一 SVG 导出。
生成产物提交到仓库，普通构建不需要额外安装图形处理软件。
