import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createHash } from 'node:crypto'

// Subject: the built standalone site, including navigation under a path prefix.
// No backend or DNS is involved. A missing build must fail, not skip this check.
const dist = path.resolve(import.meta.dirname, '..', 'dist-site')
const rRuntime = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../../packaging/r-browser-runtime.json'), 'utf8')) as { base_url: string }
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
      const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.zip': 'application/zip' }
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
test('online always opens obsidian black and preserves language choice', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } })
    })
    await page.goto(origin)
    await page.evaluate(() => localStorage.setItem('tavotto.onlineBackground', 'sage'))
    for (const route of ['', 'try/', 'r/', 'charts/']) {
      await page.goto(`${origin}/${route}`)
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
      await expect(page.locator('html')).toHaveAttribute('data-online-background', 'black')
    }
    await page.goto(origin)
    const colors = new Set<string>()
    for (const choice of ['black', 'paper', 'white', 'slate', 'blue', 'sage', 'lavender']) {
      await page.locator('[data-background-picker]').click()
      await page.locator(`[data-background-choice="${choice}"]`).click()
      await expect(page.locator('html')).toHaveAttribute('data-online-background', choice)
      colors.add(await page.locator('.site-page').evaluate((el) => getComputedStyle(el).backgroundColor))
    }
    expect(colors.size).toBe(7)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-online-background', 'black')
    await page.locator('[data-site-language]').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    for (const route of ['try/', 'r/']) {
      await page.goto(`${origin}/${route}`)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
      await expect(page.locator('html')).toHaveAttribute('data-online-background', 'black')
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
    // SVG geometry ignores document scrolling and the wider transparent hit
    // stroke, which narrows when a curve is focused. DOM bounding boxes do not.
    const relativeX = () => page.locator(`[data-r-object="${id}"]`).evaluate((element) => (element as SVGGraphicsElement).getBBox().x / 1000)
    const before = await relativeX()
    const readPng = () => page.locator('[data-r-preview]').evaluate(async (img) => {
      const bytes = await (await fetch((img as HTMLImageElement).src)).arrayBuffer()
      return Array.from(new Uint8Array(bytes))
    })
    const baselinePng = await readPng()
    await target.focus()
    await target.press('ArrowRight')
    await expect(page.locator('[data-r-run]')).toBeEnabled()
    await expect(page.locator('[data-r-error]')).toHaveCount(0)
    const after = await relativeX()
    expect(after - before).toBeCloseTo(.005, 4)
    expect(await readPng()).not.toEqual(baselinePng)
    const exported = page.waitForEvent('download')
    await page.locator('[data-r-export]').click()
    const code = readFileSync((await (await exported).path())!, 'utf8')
    expect(code).toContain(`"${id}" = c(0.005,0)`)
    await page.locator('[data-r-undo]').click()
    await expect(page.locator('[data-r-run]')).toBeEnabled()
    expect(await relativeX()).toBeCloseTo(before, 4)
    expect(await readPng()).toEqual(baselinePng)
  }
})

test('ggplot2 preserves source styling, places legends, resets one move and replays exported R', async ({ page }) => {
  test.setTimeout(360_000)
  const source = `library(ggplot2)
p <- ggplot(data.frame(x=1:5,y=c(2,4,3,6,5),group="A"),aes(x,y,colour=group)) +
  geom_line() + geom_point(size=3) + labs(title="Original 18 pt mono") +
  theme_minimal(base_size=18,base_family="mono") + theme(legend.position="bottom")`
  await page.goto(`${origin}/r/?lang=en`)
  await page.locator('[data-r-source]').fill(source)
  await page.locator('[data-r-run]').click()
  const ready = async () => {
    await expect(page.locator('[data-r-run]')).toBeEnabled({ timeout: 280_000 })
    await expect(page.locator('[data-r-error]')).toHaveCount(0)
  }
  await ready()
  const pixels = () => page.locator('[data-r-preview]').evaluate(async (node) => {
    const image = node as HTMLImageElement
    await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', context.getImageData(0, 0, canvas.width, canvas.height).data)))
  })
  const baseline = await pixels()
  await expect(page.locator('[data-r-number="fontSize"]')).toHaveValue('')
  const oracle = await page.evaluateHandle(async ({ base, repo, source }) => {
    const { WebR, ChannelType } = await import(base + 'webr.mjs')
    const r = new WebR({ baseUrl: base, repoUrl: repo, channelType: ChannelType.PostMessage })
    await r.init(); await r.installPackages(['ggplot2']); await r.evalRVoid(source)
    return r
  }, { base: rRuntime.base_url, repo: `${origin}/r/packages/`, source })
  try {
    const capture = (code: string) => oracle.evaluate(async (r, code) => {
      const shelter = await new r.Shelter()
      const result = await shelter.captureR(code, { captureGraphics: { width: 504, height: 360 }, withAutoprint: false })
      try {
        const image = result.images.at(-1)!
        if (!image) throw new Error(JSON.stringify(result.output))
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
        const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
        return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', context.getImageData(0, 0, canvas.width, canvas.height).data)))
      } finally { result.images.forEach((image: ImageBitmap) => image.close()); await shelter.purge() }
    }, code)
    // Independent oracle: the original ggplot rendered directly, without adapter styles.
    expect(baseline).toEqual(await capture('grid::grid.draw(ggplot2::ggplotGrob(p))'))
    await page.locator('[data-r-legend] button').click()
    await page.locator('[data-select-option="bottomLeft"]').click()
    await ready()
    const frame = (await page.locator('[data-r-preview]').boundingBox())!
    const legend = page.locator('[data-r-object="legend:0"]')
    const box = (await legend.boundingBox())!
    expect(box.x + box.width / 2).toBeLessThan(frame.x + frame.width / 2)
    expect(box.y + box.height / 2).toBeGreaterThan(frame.y + frame.height / 2)
    await page.locator('[data-r-font] button').click()
    await page.locator('[data-select-option="sans"]').click()
    await ready()
    await page.locator('[data-r-number="fontSize"]').fill('10')
    await page.locator('[data-r-number="fontSize"]').press('Enter')
    await ready()
    const beforeMoves = await pixels()
    await legend.focus(); await legend.press('ArrowRight'); await ready()
    const legendMoved = await pixels()
    expect(legendMoved).not.toEqual(beforeMoves)
    // First point in this fixed five-point fixture has a stable measured identity.
    const pointId = await page.locator('[data-r-kind="point"]').nth(0).getAttribute('data-r-object')
    const point = page.locator(`[data-r-object="${pointId}"]`)
    await point.focus(); await point.press('ArrowDown'); await ready()
    expect(await pixels()).not.toEqual(legendMoved)
    await page.locator('[data-r-reset-selected]').click(); await ready()
    expect(await pixels()).toEqual(legendMoved)
    await page.locator('[data-r-undo]').click(); await ready()
    expect(await pixels()).not.toEqual(legendMoved)
    await page.locator('[data-r-redo]').click(); await ready()
    expect(await pixels()).toEqual(legendMoved)
    // Escape cancels the in-progress pointer move without creating history.
    const pointBox = (await point.boundingBox())!
    await page.mouse.move(pointBox.x + pointBox.width / 2, pointBox.y + pointBox.height / 2)
    await page.mouse.down(); await page.mouse.move(pointBox.x + 30, pointBox.y + 20)
    await page.keyboard.press('Escape'); await page.mouse.up(); await ready()
    expect(await pixels()).toEqual(legendMoved)
    const download = page.waitForEvent('download')
    await page.locator('[data-r-export]').click()
    const exported = readFileSync((await (await download).path())!, 'utf8')
    expect(exported.startsWith(source)).toBe(true)
    // Real R execution; inspect the resulting ggplot values rather than source substrings.
    expect(await capture(exported)).toEqual(legendMoved)
    expect(await oracle.evaluate(async (r) => r.evalRString('paste(figweave_plot$theme$text$size, figweave_plot$theme$text$family, figweave_plot$theme$legend.position)'))).toBe('10 sans inside')
    await page.locator('[data-r-reset-moves]').click(); await ready()
    expect(await pixels()).toEqual(beforeMoves)
    await page.locator('[data-r-reset]').click(); await ready()
    expect(await pixels()).toEqual(baseline)
    await page.screenshot({ path: test.info().outputPath('ggplot2-original-restored.png'), fullPage: true })
  } finally { await oracle.evaluate((r) => r.close()); await oracle.dispose() }
})

test('ggplot2 stops non-terminating user code and can run again', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto(`${origin}/r/?lang=en`)
  await page.locator('[data-r-source]').fill('while (TRUE) {}')
  await page.locator('[data-r-run]').click()
  await expect(page.locator('[data-r-status]')).toHaveText('Running script…', { timeout: 120_000 })
  await expect(page.locator('[data-r-error]')).toContainText('timed out', { timeout: 45_000 })
  await expect(page.locator('[data-r-run]')).toBeEnabled()
  await expect(page.locator('[data-r-png]')).toBeDisabled()
  await page.locator('[data-r-source]').fill('library(ggplot2)\np <- ggplot(mtcars, aes(wt, mpg)) + geom_point()')
  await page.locator('[data-r-run]').click()
  await expect(page.locator('[data-r-status]')).toHaveText('Preview ready', { timeout: 120_000 })
  await expect(page.locator('[data-r-error]')).toHaveCount(0)
  await expect(page.locator('[data-r-png]')).toBeEnabled()
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

// Subject: the built homepage's scene position and visible figure at real scroll offsets.
// A changing chapter label alone is insufficient: the scene must stay pinned and the
// rendered figure must change, then restore when scrolling back.
test('homepage scroll keeps the workbench pinned and reverses figure changes', async ({ page }) => {
  const { horizontalOffenders } = await import('./overflow')
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto(`${origin}/?lang=zh`)
    const story = page.locator('[data-scroll-story]')
    const scene = page.locator('[data-story-scene]')
    const paper = page.locator('[data-story-paper]')
    await expect(story).toHaveAttribute('data-chapter', 'source')
    await expect.poll(() => paper.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
    const originalWidth = (await paper.boundingBox())!.width
    await page.mouse.wheel(0, 800)
    await expect.poll(() => paper.boundingBox().then((box) => box!.width)).toBeLessThan(originalWidth * 0.85)
    await page.locator('[data-story-jump="select"]').click()
    await expect(story).toHaveAttribute('data-chapter', 'select')
    const pinnedY = (await scene.boundingBox())!.y
    const selectedScroll = await page.evaluate(() => window.scrollY)
    const visibleFigure = () => paper.locator('img').evaluateAll((images) => images.filter((img) => getComputedStyle(img).opacity === '1').map((img) => (img as HTMLImageElement).src))
    const sourceFigure = await visibleFigure()
    expect(sourceFigure).toHaveLength(1)
    for (const chapter of ['type', 'legend', 'export']) {
      await page.locator(`[data-story-jump="${chapter}"]`).click()
      await expect(story).toHaveAttribute('data-chapter', chapter)
      expect((await scene.boundingBox())!.y).toBeCloseTo(pinnedY, 0)
      expect(await visibleFigure()).not.toEqual(sourceFigure)
      expect(await horizontalOffenders(page, '#root')).toEqual([])
    }
    await page.screenshot({ path: test.info().outputPath(`scroll-export-${viewport.width}.png`) })
    await page.mouse.wheel(0, selectedScroll - await page.evaluate(() => window.scrollY))
    await expect(story).toHaveAttribute('data-chapter', 'select')
    expect(await visibleFigure()).toEqual(sourceFigure)
    expect((await scene.boundingBox())!.y).toBeCloseTo(pinnedY, 0)
    await page.locator('[data-story-skip]').click()
    await expect(page).toHaveURL(/#support$/)
    await expect.poll(async () => (await page.locator('#support').boundingBox())!.y).toBeLessThan(100)
  }
})

test('homepage reduced motion uses keyboard chapters without a pinned scroll scene', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${origin}/?lang=zh`)
  const story = page.locator('[data-scroll-story]')
  await expect(story).toHaveAttribute('data-chapter', 'source')
  await expect.poll(() => page.locator('[data-story-pin]').evaluate((el) => getComputedStyle(el).position)).toBe('relative')
  const chapter = page.locator('[data-story-jump="legend"]')
  await chapter.focus()
  const before = await page.evaluate(() => window.scrollY)
  await chapter.press('Enter')
  await expect(story).toHaveAttribute('data-chapter', 'legend')
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
  await expect(page.locator('[data-site-try]')).toBeInViewport()
})
