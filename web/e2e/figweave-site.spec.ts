import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createHash } from 'node:crypto'

// Subject: the built standalone site, including navigation under a path prefix.
// No backend or DNS is involved. A missing build must fail, not skip this check.
const dist = path.resolve(import.meta.dirname, '..', 'dist-site')
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, video: 'off' })
let server: Server
let origin: string
test.beforeAll(async () => {
  statSync(path.join(dist, 'index.html'))
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const relative = url.pathname.replace(/^\/preview\//, '/').replace(/^\//, '')
    const file = path.resolve(dist, relative.endsWith('/') || !relative ? `${relative}index.html` : relative)
    if (!file.startsWith(dist + path.sep)) { res.writeHead(404).end(); return }
    try {
      const content = readFileSync(file)
      const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.zip': 'application/zip' }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' }).end(content)
    } catch { res.writeHead(404).end() }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

test('ggplot2 real runtime: style, undo, PNG, PDF and reproducible R export', async ({ page }) => {
  test.setTimeout(360_000)
  await page.goto(`${origin}/r/?lang=en`)
  await page.locator('[data-r-run]').click()
  await expect.poll(async () => {
    const error = page.locator('[data-r-error]')
    if (await error.count()) throw new Error(await error.innerText())
    return page.locator('[data-r-status]').innerText()
  }, { timeout: 280_000 }).toBe('Preview ready')
  const image = page.locator('[data-r-preview]')
  const originalUrl = await image.getAttribute('src')
  await page.locator('[data-r-label="title"]').fill('FigWeave edited title')
  await page.locator('[data-r-label="title"]').press('Enter')
  await expect(page.locator('[data-r-run]')).toBeEnabled()
  await expect(image).not.toHaveAttribute('src', originalUrl!)
  const downloadR = page.waitForEvent('download')
  await page.locator('[data-r-export]').click()
  const rPath = await (await downloadR).path()
  expect(readFileSync(rPath!, 'utf-8')).toContain('title = "FigWeave edited title"')
  const png = page.waitForEvent('download')
  await page.locator('[data-r-png]').click()
  const changed = readFileSync((await (await png).path())!)
  expect(changed.subarray(1, 4).toString()).toBe('PNG')
  const pdf = page.waitForEvent('download')
  await page.locator('[data-r-pdf]').click()
  expect(readFileSync((await (await pdf).path())!).subarray(0, 5).toString()).toBe('%PDF-')
  await page.locator('[data-r-undo]').click()
  await expect(page.locator('[data-r-run]')).toBeEnabled()
  await expect(page.locator('[data-r-label="title"]')).toHaveValue('')
  const undoPng = page.waitForEvent('download')
  await page.locator('[data-r-png]').click()
  const restored = readFileSync((await (await undoPng).path())!)
  expect(createHash('sha256').update(restored).digest('hex')).not.toBe(createHash('sha256').update(changed).digest('hex'))
  await page.screenshot({ path: test.info().outputPath('ggplot2-editor.png'), fullPage: true })
})

test('seaborn, pandas plotting and NetworkX share the real Python editor', async ({ page }) => {
  test.setTimeout(420_000)
  await page.goto(`${origin}/try/?lang=en`)
  await page.locator('input[type=file]').setInputFiles({
    name: 'libraries.py', mimeType: 'text/x-python',
    buffer: Buffer.from(`import matplotlib.pyplot as plt\nimport seaborn as sns\nimport pandas as pd\nimport networkx as nx\nfig, axes = plt.subplots(1, 3)\nsns.scatterplot(x=[1,2,3], y=[1,4,2], ax=axes[0])\npd.Series([1,3,2]).plot(ax=axes[1])\nnx.draw(nx.path_graph(4), ax=axes[2], pos={0:(0,0),1:(1,1),2:(2,0),3:(3,1)})\nfig.suptitle('Python libraries')\nfig.tight_layout()\n`),
  })
  await expect(page.locator('[data-element-svg] svg')).toBeVisible({ timeout: 360_000 })
  // Matplotlib embeds labels as glyph paths; its SVG comments preserve the label.
  await expect.poll(() => page.locator('[data-element-svg]').innerHTML()).toContain('Python libraries')
  await page.screenshot({ path: test.info().outputPath('python-libraries.png'), fullPage: true })
})
test.afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()))
})

test('built homepage → editor → homepage preserves language and desktop status', async ({ page }) => {
  const failedResponses: string[] = []
  const external: string[] = []
  page.on('response', (r) => { if (r.status() >= 400) failedResponses.push(r.url()) })
  page.on('request', (r) => { if (!r.url().startsWith(origin)) external.push(r.url()) })
  for (const prefix of ['', '/preview']) {
    await page.goto(`${origin}${prefix}/?lang=zh`)
    await expect(page).toHaveTitle('FigWeave — 让科研图表的最后一步，更直观。')
    await expect(page.locator('#downloads')).toContainText('预览版')
    await expect(page.locator('[data-site-download="windows"]')).toHaveAttribute('href', /^https:\/\/github\.com\/eveque-dev\/fig-weave\/releases\/download\/.+\/FigWeave_.+_windows_x64\.exe$/)
    await expect(page.locator('[data-site-download="macos"]')).toHaveAttribute('href', /^https:\/\/github\.com\/eveque-dev\/fig-weave\/releases\/download\/.+\/FigWeave_.+_macos_arm64\.dmg$/)
    await expect(page.locator('[data-site-download-access]')).toContainText('无需登录')
    await expect(page.locator('[data-site-github]')).toHaveAttribute('href', 'https://github.com/eveque-dev/fig-weave')
    await expect(page.locator('[data-site-video]')).toHaveAttribute('preload', 'none')
    await expect(page.locator('[data-site-video] source')).toHaveAttribute('src', /\.mp4$/)
    expect(external).toEqual([])
    await page.screenshot({ path: test.info().outputPath('homepage-desktop.png'), fullPage: true })
    // Prevent prewarm only after the homepage assertion above: its zero-request
    // result must come from the product, not from this fixture.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } })
    })
    await page.locator('[data-site-try]').click()
    await expect(page).toHaveURL(`${origin}${prefix}/try/?lang=zh`)
    await expect(page.locator('[data-example-card]')).toHaveCount(3)
    await page.locator('[data-playground-home]').click()
    await expect(page).toHaveURL(`${origin}${prefix}/?lang=zh`)
    await page.locator('[data-site-language]').click()
    await expect(page).toHaveTitle('FigWeave — A clearer final step for scientific figures.')
    await page.locator('[data-site-try]').click()
    await expect(page).toHaveURL(`${origin}${prefix}/try/?lang=en`)
    await page.locator('[data-playground-home]').click()
    await expect(page).toHaveURL(`${origin}${prefix}/?lang=en`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: test.info().outputPath('homepage-mobile.png'), fullPage: true })
  expect(failedResponses).toEqual([])
})

// Subject: rendered public entry layouts at supported mobile/tablet/desktop widths.
// Reuse the repository's HTML overflow ruler; SVG internals are not layout boxes.
test('public workspaces remain readable at mobile and desktop widths', async ({ page }) => {
  const { horizontalOffenders } = await import('./overflow')
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } })
  })
  for (const lang of ['zh', 'en']) {
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 960 })
      for (const route of ['', 'try/', 'r/', 'charts/']) {
        await page.goto(`${origin}/${route}?lang=${lang}`)
        await expect(page.locator('#root')).not.toBeEmpty()
        await expect.poll(() => horizontalOffenders(page, '#root')).toEqual([])
        if (width === 375 || width === 1440) {
          await page.screenshot({ path: test.info().outputPath(`${route.replace('/', '') || 'home'}-${lang}-${width}.png`), fullPage: true })
        }
      }
    }
    await page.goto(`${origin}/?lang=${lang}`)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(result.violations).toEqual([])
  }
})

// Subject: fresh online browser with an English OS locale, then explicit preferences.
test('online defaults to Chinese and preserves language and background choices', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } })
    })
    for (const route of ['', 'try/', 'r/', 'charts/']) {
      await page.goto(`${origin}/${route}`)
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    }
    await page.goto(origin)
    const colors = new Set<string>()
    for (const choice of ['paper', 'white', 'slate', 'blue', 'sage', 'lavender']) {
      await page.locator('[data-background-picker]').click()
      await page.locator(`[data-background-choice="${choice}"]`).click()
      await expect(page.locator('html')).toHaveAttribute('data-online-background', choice)
      colors.add(await page.locator('.site-page').evaluate((el) => getComputedStyle(el).backgroundColor))
    }
    expect(colors.size).toBe(6)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-online-background', 'lavender')
    await page.locator('[data-site-language]').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    for (const route of ['try/', 'r/']) {
      await page.goto(`${origin}/${route}`)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
      await expect(page.locator('html')).toHaveAttribute('data-online-background', 'lavender')
    }
  } finally { await context.close() }
})

test('ggplot2 drag targets: text, legend, point and curve replay and undo', async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto(`${origin}/r/?lang=en`)
  await page.locator('[data-r-source]').fill(`library(ggplot2)
p <- ggplot(data.frame(x=1:5,y=c(2,4,3,6,5),group="A"),aes(x,y,colour=group))+geom_line()+geom_point(size=3)+labs(title="Drag objects")+theme_minimal()`)
  await page.locator('[data-r-run]').click()
  await expect(page.locator('[data-r-status]')).toHaveText('Preview ready', { timeout: 240_000 })
  for (const kind of ['text', 'legend', 'point', 'curve']) {
    const targets = page.locator(`[data-r-kind="${kind}"]`)
    expect(await targets.count()).toBeGreaterThan(0)
    // Deterministic ordinal in this fixture; every category is exercised.
    const target = targets.nth(0)
    const id = await target.getAttribute('data-r-object')
    const before = await target.boundingBox()
    const readPng = () => page.locator('[data-r-preview]').evaluate(async (img) => {
      const bytes = await (await fetch((img as HTMLImageElement).src)).arrayBuffer()
      return Array.from(new Uint8Array(bytes))
    })
    const baselinePng = await readPng()
    await target.focus()
    await target.press('ArrowRight')
    await expect(page.locator('[data-r-run]')).toBeEnabled()
    await expect(page.locator('[data-r-error]')).toHaveCount(0)
    const after = await page.locator(`[data-r-object="${id}"]`).boundingBox()
    expect(after!.x).toBeGreaterThan(before!.x + 1)
    expect(await readPng()).not.toEqual(baselinePng)
    const exported = page.waitForEvent('download')
    await page.locator('[data-r-export]').click()
    const code = readFileSync((await (await exported).path())!, 'utf8')
    expect(code).toContain(`"${id}" = c(0.005,0)`)
    await page.locator('[data-r-undo]').click()
    await expect(page.locator('[data-r-run]')).toBeEnabled()
    const undone = await page.locator(`[data-r-object="${id}"]`).boundingBox()
    expect(undone!.x).toBeCloseTo(before!.x, 1)
    expect(await readPng()).toEqual(baselinePng)
  }
})

test('Plotly and pyecharts execute Python, edit, undo and export', async ({ page }) => {
  test.setTimeout(600_000)
  for (const kind of ['plotly', 'pyecharts']) {
    await page.goto(`${origin}/charts/?lang=en`)
    if (kind === 'pyecharts') {
      await page.locator('[data-chart-kind] button').click()
      await page.locator('[data-select-option="pyecharts"]').click()
    }
    await expect(page.locator('[data-chart-kind] button')).toHaveText(kind === 'plotly' ? 'Plotly' : 'pyecharts')
    await expect(page.locator('[data-chart-source]')).toHaveValue(new RegExp(kind === 'plotly' ? 'import plotly' : 'from pyecharts'))
    await page.locator('[data-chart-run]').click()
    await expect.poll(async () => {
      const errors = await page.locator('[data-chart-error]').allTextContents()
      if (errors.length) throw new Error(errors.join('\n'))
      return page.locator('[data-chart-status]').innerText()
    }, { timeout: 280_000 }).toBe('Preview ready')
    const original = await page.locator('[data-chart-label="title"]').inputValue()
    await page.locator('[data-chart-label="title"]').fill('Edited chart')
    await page.locator('[data-chart-apply]').click()
    await expect(page.locator('[data-chart-run]')).toBeEnabled()
    const json = page.waitForEvent('download')
    await page.locator('[data-chart-json]').click()
    expect(readFileSync((await (await json).path())!, 'utf8')).toContain('Edited chart')
    const png = page.waitForEvent('download')
    await page.locator('[data-chart-png]').click()
    expect(readFileSync((await (await png).path())!).subarray(1,4).toString()).toBe('PNG')
    const py = page.waitForEvent('download')
    await page.locator('[data-chart-python]').click()
    const code = readFileSync((await (await py).path())!, 'utf8')
    expect(code).toContain('Edited chart')
    expect(code).toContain(kind === 'plotly' ? 'plotly' : 'pyecharts')
    await page.locator('[data-chart-undo]').click()
    await expect(page.locator('[data-chart-label="title"]')).toHaveValue(original)
    // Exported code must run in the same real Python runtime and preserve edits.
    await page.locator('[data-chart-source]').fill(code)
    await page.locator('[data-chart-run]').click()
    await expect(page.locator('[data-chart-status]')).toHaveText('Preview ready', { timeout: 240_000 })
    await expect(page.locator('[data-chart-label="title"]')).toHaveValue('Edited chart')
  }
})

// The downloaded bytes must reflect current edits, and undo must restore the image.
test('Matplotlib PNG download includes edits and undo restores the original', async ({ page }) => {
  test.setTimeout(360_000)
  await page.goto(`${origin}/try/?lang=zh`)
  await page.locator('input[type=file]').setInputFiles({
    name: 'export-proof.py', mimeType: 'text/x-python',
    buffer: Buffer.from('import matplotlib.pyplot as plt\nfig, ax = plt.subplots(figsize=(6,4))\nax.plot([0,1,2],[0,1,0])\nax.set_title("Export proof", fontsize=10)\nplt.show()\n'),
  })
  const button = page.locator('[data-playground-export]')
  await expect(button).toBeEnabled({ timeout: 240_000 })
  const downloadPng = async () => {
    await expect(button).toBeEnabled({ timeout: 60_000 })
    let received = false
    const download = page.waitForEvent('download', { timeout: 60_000 }).then((d) => { received = true; return d })
    await button.click()
    await expect(page.locator('[data-playground-download]')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(700)
    if (!received) await page.locator('[data-playground-download]').click()
    const bytes = readFileSync((await (await download).path())!)
    expect(bytes.subarray(1, 4).toString()).toBe('PNG')
    expect(bytes.readUInt32BE(16)).toBe(2400)
    return createHash('sha256').update(bytes).digest('hex')
  }
  const original = await downloadPng()
  const title = page.locator('[data-element-svg] svg [id="axes_0.title"]')
  await expect(title).toHaveCount(1)
  const box = (await title.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  const size = page.locator('[data-inspector-prop="fontsize"]')
  await expect(size).toHaveCount(1)
  await size.fill('22')
  await size.press('Enter')
  const changed = await downloadPng()
  expect(changed).not.toBe(original)
  await page.keyboard.press('Tab')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(size).toHaveValue('10', { timeout: 60_000 })
  expect(await downloadPng()).toBe(original)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(button).toBeVisible()
})
