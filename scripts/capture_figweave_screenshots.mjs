// Run from the repository root after installing web's development dependencies.
// node scripts/capture_figweave_screenshots.mjs https://fig-weave.com assets/figweave/screenshots/YYYY-MM-DD
// Captures real UI only; no HTML replacement, CSS overrides, or image retouching.
import { chromium, expect } from '../web/node_modules/@playwright/test/index.mjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'

const base = new URL(process.argv[2] || 'https://fig-weave.com')
const output = resolve(process.argv[3] || `/tmp/figweave-screenshots-${new Date().toISOString().slice(0, 10)}`)
const version = await (await fetch(new URL('version.json', base))).json()
if (!/^[a-f0-9]{40}$/.test(version.git_commit)) throw new Error('A deployed version.json is required')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const manifest = {
  captured_at: new Date().toISOString(), base_url: base.href, deployed_commit: version.git_commit,
  deployed_release: version.release, browser: browser.version(), locale: 'zh-CN',
  images: [], downloads: [], page_errors: [],
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'zh-CN', deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  page.on('pageerror', error => manifest.page_errors.push(String(error)))
  const open = async (route) => {
    await page.goto(new URL(`${route}?lang=zh`, base).href)
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await expect(page.locator('html')).toHaveAttribute('data-online-background', 'black')
  }
  const capture = async (name, description) => {
    await page.evaluate(() => document.fonts.ready)
    await page.locator('img').evaluateAll(async images => {
      // Off-screen lazy images should remain lazy; only pixels in this capture matter.
      const visible = images.filter(image => {
        const box = image.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight
          && box.right > 0 && box.left < innerWidth
      })
      let timer
      try {
        await Promise.race([
          Promise.all(visible.map(image => image.decode())),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Visible image decode timed out')), 30_000) }),
        ])
      } finally { clearTimeout(timer) }
    })
    await page.mouse.move(0, 0)
    const bytes = await page.screenshot({ path: join(output, `${name}.png`), animations: 'disabled' })
    manifest.images.push({ file: `${name}.png`, description, url: page.url(), viewport: page.viewportSize(), sha256: hash(bytes) })
    console.log(`Captured ${name}`)
  }
  const png = async (selector, engine) => {
    await expect(page.locator(selector)).toBeEnabled({ timeout: 90_000 })
    const received = page.waitForEvent('download', { timeout: 90_000 })
    await page.locator(selector).click()
    const download = await received
    const bytes = await readFile(await download.path())
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    manifest.downloads.push({ engine, filename: download.suggestedFilename(), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: hash(bytes) })
  }
  const ready = async (engine) => {
    await expect.poll(async () => {
      const errors = await page.locator(`[data-${engine}-error]`).allTextContents()
      if (errors.length) throw new Error(errors.join('\n'))
      return page.locator(`[data-${engine}-status]`).innerText()
    }, { timeout: 360_000 }).toBe('预览就绪')
    await expect(page.locator(`[data-${engine}-run]`)).toBeEnabled()
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await open('')
  await page.locator('[data-story-jump="type"]').click()
  await expect(page.locator('[data-scroll-story]')).toHaveAttribute('data-chapter', 'type')
  await capture('homepage', '首页滚动演示：调整字号；该区域是产品演示，不是编辑器。')

  await page.setViewportSize({ width: 1440, height: 1000 })
  await open('try/')
  await page.locator('[data-example-card="kinetics"]').press('Enter')
  await expect(page.locator('[data-playground-export]')).toBeEnabled({ timeout: 360_000 })
  const title = page.locator('[data-element-svg] svg [id="axes_0.title"]')
  const box = await title.boundingBox()
  if (!box) throw new Error('Missing Matplotlib title')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('[data-inspector-prop="fontsize"]')).toBeVisible()
  await page.locator('[data-inspector-prop="fontsize"]').fill('12')
  await page.locator('[data-inspector-prop="fontsize"]').press('Enter')
  await page.locator('[data-guided-task] > button').click()
  await png('[data-playground-export]', 'Matplotlib')
  await capture('matplotlib', 'Matplotlib 实际运行 kinetics.py，选中标题，右上角导出 PNG。')
  await page.locator('[data-background-picker]').click()
  await expect(page.locator('[data-background-choice="sage"]')).toBeVisible()
  await capture('backgrounds', '曜石黑工作台与七种背景选择；白色图纸独立。')

  await page.setViewportSize({ width: 1440, height: 1100 })
  await open('charts/')
  for (const kind of ['plotly', 'pyecharts']) {
    if (kind === 'pyecharts') {
      await page.locator('[data-chart-kind] button').click()
      await page.locator('[data-select-option="pyecharts"]').click()
    }
    await page.locator('[data-chart-run]').click()
    await ready('chart')
    await expect(page.locator('[data-chart-preview]')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await png('[data-chart-png]', kind)
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture(kind, `${kind} 自带示例真实运行，中文黑色界面，PNG / Python / JSON 导出入口。`)
  }

  await open('r/')
  await page.locator('[data-r-assets="data"]').setInputFiles({
    name: 'experiment.csv', mimeType: 'text/csv',
    buffer: Buffer.from('x,y,group\n1,2.0,实验组\n2,3.1,实验组\n3,4.2,实验组\n4,5.0,实验组\n5,6.2,实验组\n1,1.4,对照组\n2,2.0,对照组\n3,2.8,对照组\n4,3.2,对照组\n5,4.1,对照组\n'),
  })
  await expect(page.locator('[data-r-asset="experiment.csv"]')).toBeVisible()
  await page.locator('[data-r-source]').fill(`library(ggplot2)
data <- read.csv("experiment.csv")
p <- ggplot(data, aes(x, y, colour = group)) +
  geom_line(linewidth = 0.8) +
  geom_point(size = 3) +
  labs(title = "让每一处修改，都留在图里",
       x = "浓度（mg/L）", y = "响应强度",
       colour = "组别") +
  theme_minimal(base_size = 12,
                base_family = "wqy-microhei")`)
  await page.locator('[data-r-run]').click()
  await ready('r')
  await page.locator('[data-r-text="让每一处修改，都留在图里"]').focus()
  const originalPreview = await page.locator('[data-r-preview]').getAttribute('src')
  const size = page.locator('[data-r-text-editor] [data-prop="fontsize"] input')
  await size.fill('18')
  await size.press('Enter')
  await expect(page.locator('[data-r-preview]')).not.toHaveAttribute('src', originalPreview, { timeout: 90_000 })
  await ready('r')
  await png('[data-r-png]', 'ggplot2')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture('ggplot2', '导入 CSV 后运行 ggplot2，选中文字并修改字号，显示数据、字体与三种导出入口。')
  expect(manifest.page_errors).toEqual([])
  const after = await (await fetch(new URL('version.json', base))).json()
  expect(after.git_commit).toBe(version.git_commit)
  await writeFile(join(output, 'capture.json'), JSON.stringify(manifest, null, 2) + '\n')
} finally {
  await browser.close()
}
