import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { unzipSync, strFromU8 } from 'fflate'

// Subject: the built standalone site, including navigation under a path prefix.
// No backend or DNS is involved. A missing build must fail, not skip this check.
const dist = path.resolve(import.meta.dirname, '..', 'dist-site')
const previewModuleName = () => {
  const html = readFileSync(path.join(dist, 'r/index.html'), 'utf8')
  const entry = html.match(/src="([^\"]+[.]js)"/)![1]
  const code = readFileSync(path.resolve(dist, 'r', entry), 'utf8')
  return code.match(/pdfPreview-[\w-]+[.]js/)![0]
}
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
      const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.zip': 'application/zip' }
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
  const savedEvent = page.waitForEvent('download'); await page.locator('[data-project-save]').click()
  const savedProject = (await (await savedEvent).path())!
  const bundleEvent = page.waitForEvent('download'); await page.locator('[data-project-bundle]').click()
  const bundle = await bundleEvent
  await bundle.saveAs(test.info().outputPath('ggplot2-reproduction.zip'))
  const entries = unzipSync(readFileSync((await bundle.path())!))
  expect(strFromU8(entries['replay.R'])).toContain('FigWeave edited title')
  expect(JSON.parse(strFromU8(entries['environment.json'])).runtime.webr_version).toBe(rRuntime.base_url.split('/v')[1].replace('/', ''))
  const png = page.waitForEvent('download')
  await page.locator('[data-r-png]').click()
  const changed = readFileSync((await (await png).path())!)
  expect(changed.subarray(1, 4).toString()).toBe('PNG')
  expect(changed.readUInt32BE(16)).toBe(2400)
  expect(changed.readUInt32BE(20)).toBe(Math.round(2400 * 5 / 7))
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
  await page.locator('[data-project-file]').setInputFiles(savedProject)
  await expect(page.locator('[data-project-restored]')).toHaveCount(1)
  await expect(page.locator('[data-r-status]')).toHaveText('Not running')
  await page.locator('[data-r-run]').click()
  await expect(page.locator('[data-r-status]')).toHaveText('Preview ready', { timeout: 240_000 })
  await expect(page.locator('[data-r-label="title"]')).toHaveValue('FigWeave edited title')
  const replayPng = page.waitForEvent('download'); await page.locator('[data-r-png]').click()
  expect(readFileSync((await (await replayPng).path())!)).toEqual(changed)
  await page.locator('[data-r-undo]').click(); await expect(page.locator('[data-r-run]')).toBeEnabled()
  await expect(page.locator('[data-r-label="title"]')).toHaveValue('')
  await page.screenshot({ path: test.info().outputPath('ggplot2-editor.png'), fullPage: true })
})

test('seaborn, pandas plotting and NetworkX share the real Python editor', async ({ page }) => {
  test.setTimeout(420_000)
  await page.goto(`${origin}/try/?lang=en`)
  await page.locator('[data-playground-upload]').setInputFiles({
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

test('failed R runtime download retains input and a retry recovers without reload', async ({ page }) => {
  test.setTimeout(300_000)
  let blocked = false
  await page.route((url) => `${url.origin}${url.pathname}` === `${rRuntime.base_url}webr.mjs`, async (route) => {
    if (!blocked) { blocked = true; await route.abort('failed') }
    else await route.continue()
  })
  await page.goto(`${origin}/r/?lang=en`)
  const source = await page.locator('[data-r-source]').inputValue()
  await page.locator('[data-r-run]').click()
  await expect(page.locator('[data-r-error]')).toBeVisible()
  await expect(page.locator('[data-r-source]')).toHaveValue(source)
  await page.locator('[data-load-retry]').click()
  await expect(page.locator('[data-r-status]')).toHaveText('Preview ready', { timeout: 240_000 })
  await expect(page.locator('[data-r-error]')).toHaveCount(0)
  await expect(page.locator('[data-load-seconds]')).toContainText('Load time:')
})

test('built homepage → editor → homepage preserves language and desktop status', async ({ page, browser }) => {
  const html = readFileSync(path.join(dist, 'index.html'), 'utf8')
  expect(html).toContain('property="og:image"')
  expect(html).toContain('https://fig-weave.com/share.png')
  expect(html).toContain('Matplotlib、Plotly、pyecharts')
  const staticContext = await browser.newContext({ javaScriptEnabled: false })
  try {
    const staticPage = await staticContext.newPage()
    await staticPage.goto(`${origin}/preview/`)
    await expect(staticPage.locator('[data-static-intro]')).toContainText('保存本地项目并下载复现包')
    await expect(staticPage.locator('[data-static-intro] nav a')).toHaveCount(3)
    await expect(staticPage.locator('[data-static-intro] nav a').first()).toHaveAttribute('href', './try/?lang=zh')
  } finally { await staticContext.close() }
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
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /R ggplot2/)
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
  const initialDownload = page.waitForEvent('download')
  await page.locator('[data-r-export]').click()
  const initialExport = readFileSync((await (await initialDownload).path())!, 'utf8')
  const setup = initialExport.slice(0, initialExport.indexOf(source))
  const previewModule = previewModuleName()
  const oracle = await page.evaluateHandle(async ({ base, repo, source, setup }) => {
    const { WebR, ChannelType } = await import(base + 'webr.mjs')
    const r = new WebR({ baseUrl: base, repoUrl: repo, channelType: ChannelType.PostMessage })
    await r.init(); await r.installPackages(['ggplot2', 'showtext', 'jsonlite']); await r.evalRVoid(setup + source)
    return r
  }, { base: rRuntime.base_url, repo: `${origin}/r/packages/`, source, setup })
  try {
    const capture = async (code: string, filename = '/tmp/oracle.pdf') => {
      const bytes = await oracle.evaluate(async (r, { code, filename }) => {
        await r.evalRVoid(code)
        return Array.from(await r.FS.readFile(filename)) as number[]
      }, { code, filename })
      return page.evaluate(async ({ bytes, url }) => {
        const { pdfPreview } = await import(url)
        const blob = await pdfPreview(new Uint8Array(bytes))
        const image = await createImageBitmap(blob)
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
        const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0); image.close()
        return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', context.getImageData(0, 0, canvas.width, canvas.height).data)))
      }, { bytes, url: `${origin}/r/assets/${previewModule}` })
    }
    // Independent original ggplot, same physical PDF device and actual font files.
    expect(baseline).toEqual(await capture('grDevices::pdf("/tmp/oracle.pdf",width=7,height=5,useDingbats=FALSE); showtext::showtext_begin(); grid::grid.draw(ggplot2::ggplotGrob(p)); showtext::showtext_end(); grDevices::dev.off()'))
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
    expect(exported).toContain(source)
    // Real R execution; inspect the resulting ggplot values rather than source substrings.
    expect(await capture(exported, 'figure-styled.pdf')).toEqual(legendMoved)
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
    // Subject: the backing under transparent rendered chart pixels, in the
    // actual browser after runtime execution. Workspace colors must not tint it.
    for (const background of ['black', 'sage']) {
      await page.locator('[data-background-picker]').click()
      await page.locator(`[data-background-choice="${background}"]`).click()
      await expect(page.locator('html')).toHaveAttribute('data-online-background', background)
      await expect(page.locator('[data-chart-preview]')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    }
    const original = await page.locator('[data-chart-label="title"]').inputValue()
    await page.locator('[data-chart-label="title"]').fill('Edited chart')
    await page.locator('[data-chart-apply]').click()
    await expect(page.locator('[data-chart-run]')).toBeEnabled()
    const json = page.waitForEvent('download')
    await page.locator('[data-chart-json]').click()
    expect(readFileSync((await (await json).path())!, 'utf8')).toContain('Edited chart')
    const savedEvent = page.waitForEvent('download'); await page.locator('[data-project-save]').click()
    const savedProject = (await (await savedEvent).path())!
    const bundleEvent = page.waitForEvent('download'); await page.locator('[data-project-bundle]').click()
    const entries = unzipSync(readFileSync((await (await bundleEvent).path())!))
    expect(strFromU8(entries['source.py'])).toBe(await page.locator('[data-chart-source]').inputValue())
    expect(strFromU8(entries['replay.py'])).toContain('Edited chart')
    expect(JSON.parse(strFromU8(entries['project.json'])).history.length).toBeGreaterThan(0)
    await page.locator('[data-export-width]').fill('1200'); await page.locator('[data-export-width]').press('Enter')
    const box = (await page.locator('[data-chart-preview]').boundingBox())!
    const png = page.waitForEvent('download')
    await page.locator('[data-chart-png]').click()
    const pngBytes = readFileSync((await (await png).path())!)
    expect(pngBytes.subarray(1,4).toString()).toBe('PNG')
    expect(pngBytes.readUInt32BE(16)).toBe(1200)
    expect(Math.abs(pngBytes.readUInt32BE(20) - 1200 * (box.height - 2) / (box.width - 2))).toBeLessThan(3)
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
    await page.locator('[data-project-file]').setInputFiles(savedProject)
    await expect(page.locator('[data-project-restored]')).toHaveCount(1)
    await expect(page.locator('[data-chart-options]')).toHaveValue('')
    await page.locator('[data-chart-run]').click()
    await expect(page.locator('[data-chart-status]')).toHaveText('Preview ready', { timeout: 240_000 })
    await expect(page.locator('[data-chart-label="title"]')).toHaveValue('Edited chart')
    await page.locator('[data-chart-undo]').click()
    await expect(page.locator('[data-chart-label="title"]')).toHaveValue(original)
  }
})

// The downloaded bytes must reflect current edits, and undo must restore the image.
test('Matplotlib PNG download includes edits and undo restores the original', async ({ page }) => {
  // Cold runtime and scientific package downloads have separate product deadlines.
  // Leave time for both phases and the actual edit/reopen/export assertions.
  test.setTimeout(600_000)
  await page.goto(`${origin}/try/?lang=zh`)
  await page.locator('[data-playground-upload]').setInputFiles({
    name: 'export-proof.py', mimeType: 'text/x-python',
    buffer: Buffer.from('import matplotlib.pyplot as plt\nfig, ax = plt.subplots(figsize=(6,4))\nax.plot([0,1,2],[0,1,0])\nax.set_title("Export proof", fontsize=10)\nplt.show()\n'),
  })
  const button = page.locator('[data-playground-export]')
  await expect(button).toBeEnabled({ timeout: 420_000 })
  let pngIndex = 0
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
    await test.info().attach(`png-${pngIndex++}`, { body: bytes, contentType: 'image/png' })
    return createHash('sha256').update(bytes).digest('hex')
  }
  const original = await downloadPng()
  // A persistent download link must leave the toolbar reachable with a pointer.
  await page.locator('[data-background-picker]').click()
  await page.locator('[data-background-choice="sage"]').click()
  await expect(page.locator('html')).toHaveAttribute('data-online-background', 'sage')
  await page.locator('[data-background-picker]').click()
  await page.locator('[data-background-choice="black"]').click()
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
  const savedEvent = page.waitForEvent('download'); await page.locator('[data-project-save]').click()
  const savedProject = (await (await savedEvent).path())!
  const bundleEvent = page.waitForEvent('download'); await page.locator('[data-project-bundle]').click()
  const reproduction = await bundleEvent
  await reproduction.saveAs(test.info().outputPath('matplotlib-reproduction.zip'))
  const entries = unzipSync(readFileSync((await reproduction.path())!))
  expect(JSON.parse(strFromU8(entries['project.json'])).state.overrides).toContainEqual({ gid: 'axes_0.title', prop: 'fontsize', value: 22 })
  expect(strFromU8(entries['source.py'])).toContain('fontsize=10')
  await page.locator('[data-playground-undo]').click()
  await expect(size).toHaveValue('10', { timeout: 60_000 })
  await expect(button).toBeEnabled()
  const undoEvent = page.waitForEvent('download', { timeout: 15_000 }); await page.locator('[data-project-save]').click()
  const undoProject = readFileSync((await (await undoEvent).path())!)
  await test.info().attach('undo-project', { body: undoProject, contentType: 'application/zip' })
  expect(JSON.parse(strFromU8(unzipSync(undoProject)['project.json'])).state.overrides).toEqual([])
  expect(await downloadPng()).toBe(original)
  await page.locator('[data-project-file]').setInputFiles(savedProject)
  await expect(page.locator('[data-project-restored]')).toHaveCount(1)
  await expect(page.locator('[data-element-svg]')).toHaveCount(0)
  await page.locator('[data-project-run]').click()
  await expect(button).toBeEnabled({ timeout: 240_000 })
  expect(await downloadPng()).toBe(changed)
  await page.locator('[data-playground-undo]').click()
  expect(await downloadPng()).toBe(original)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(button).toBeVisible()
  await page.locator('[data-background-picker]').click()
  await expect(page.locator('[data-background-choice="sage"]')).toBeVisible()
})

// Subject: the built homepage's scene position and visible figure at real scroll offsets.
// A changing chapter label alone is insufficient: the scene must stay pinned and the
// rendered figure must change, then restore when scrolling back.
test('homepage scroll keeps the workbench pinned and reverses figure changes', async ({ page }) => {
  const { horizontalOffenders } = await import('./overflow')
  for (const lang of ['zh', 'en']) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport)
      await page.goto(`${origin}/?lang=${lang}`)
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
      await page.screenshot({ path: test.info().outputPath(`scroll-export-${lang}-${viewport.width}.png`) })
      await page.mouse.wheel(0, selectedScroll - await page.evaluate(() => window.scrollY))
      await expect(story).toHaveAttribute('data-chapter', 'select')
      expect(await visibleFigure()).toEqual(sourceFigure)
      expect((await scene.boundingBox())!.y).toBeCloseTo(pinnedY, 0)
      await page.locator('[data-story-skip]').click()
      await expect(page).toHaveURL(/#support$/)
      await expect.poll(async () => (await page.locator('#support').boundingBox())!.y).toBeLessThan(100)
    }
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

test('ggplot2 imports data and fonts, edits one label, and retains offsets through layout changes', async ({ page }) => {
  test.setTimeout(420_000)
  await page.goto(`${origin}/r/?lang=en`)
  const ready = async () => {
    await expect(page.locator('[data-r-run]')).toBeEnabled({ timeout: 280_000 })
    await expect(page.locator('[data-r-error]')).toHaveCount(0)
  }
  // Generate a real RDS file and obtain the bundled open font from the same locked runtime.
  const oracle = await page.evaluateHandle(async ({ base, repo }) => {
    const { WebR, ChannelType } = await import(base + 'webr.mjs')
    const r = new WebR({ baseUrl: base, repoUrl: repo, channelType: ChannelType.PostMessage })
    await r.init(); await r.installPackages(['ggplot2', 'showtext', 'jsonlite'])
    return r
  }, { base: rRuntime.base_url, repo: `${origin}/r/packages/` })
  try {
    const assets = await oracle.evaluate(async (r) => {
      await r.evalRVoid('saveRDS(data.frame(x=1:3,y=c(2L,4L,3L)),"/tmp/input.rds")')
      const font = await r.evalRString('system.file("fonts/LiberationSans-Regular.ttf",package="sysfonts")')
      return { rds: Array.from(await r.FS.readFile('/tmp/input.rds')) as number[], font: Array.from(await r.FS.readFile(font)) as number[] }
    })
    const csv = 'x,y\n1,2\n2,4\n3,3\n', tsv = 'x\ty\n1\t2\n2\t4\n3\t3\n'
    await page.locator('[data-r-assets="data"]').setInputFiles([
      { name: '实验.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) },
      { name: 'table.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from(tsv) },
      { name: 'input.rds', mimeType: 'application/octet-stream', buffer: Buffer.from(assets.rds) },
    ])
    await expect(page.locator('[data-r-asset]')).toHaveCount(3)
    await page.locator('[data-r-assets="font"]').setInputFiles({ name: 'ImportedSans.ttf', mimeType: 'font/ttf', buffer: Buffer.from(assets.font) })
    await expect(page.locator('[data-r-asset]')).toHaveCount(4)
    const source = `library(ggplot2)
a <- read.csv("实验.csv"); b <- read.delim("table.tsv"); d <- readRDS("input.rds")
stopifnot(identical(a,b), identical(a,d))
p <- ggplot(a,aes(x,y,colour="Group A")) + geom_point(size=3) + geom_line() +
  labs(title="中文图表",x="Input X",y="Input Y",colour="Group") + theme_minimal(base_family="ImportedSans")`
    await page.locator('[data-r-source]').fill(source)
    await page.locator('[data-r-run]').click(); await ready()
    await expect(page.locator('[data-r-kind="point"]')).toHaveCount(3)
    await expect(page.locator('[data-r-font-warnings]')).toContainText('wqy-microhei')
    const title = page.locator('[data-r-text="中文图表"]')
    const id = (await title.getAttribute('data-r-object'))!
    const text = page.locator(`[data-r-object="${id}"]`)
    const x = () => text.evaluate((el) => (el as SVGGraphicsElement).getBBox().x / 1000)
    await title.focus(); await title.press('ArrowRight'); await ready()
    const moved = await x()
    await expect(page.locator('[data-r-text-editor]')).toBeVisible()
    await expect(page.locator('[data-r-actual-font]')).toContainText('wqy-microhei')
    await page.locator('[data-r-text-editor] [data-prop="fontsize"] input').fill('22')
    await page.locator('[data-r-text-editor] [data-prop="fontsize"] input').press('Enter')
    await expect(page.locator('[data-r-run]')).toBeDisabled(); await ready()
    await page.locator('[data-r-text-editor] [data-prop="color"] input[type="color"]').fill('#CC2255')
    await page.locator('[data-r-text-editor] [data-prop="color"] input[type="color"]').blur()
    await expect(page.locator('[data-r-run]')).toBeDisabled(); await ready()
    // Font/content edits must stay bound to this title, not move onto a tick or legend label.
    await page.locator('[data-r-text-content]').fill('Edited Arial-like title')
    await page.locator('[data-r-text-content]').press('Enter'); await ready()
    await expect(text).toHaveAttribute('data-r-text', 'Edited Arial-like title')
    await expect(page.locator('[data-r-actual-font]')).toContainText('ImportedSans')
    expect(await x()).toBeCloseTo(moved, 5)
    await page.locator('[data-r-label="title"]').fill('Global title')
    await page.locator('[data-r-label="title"]').press('Enter'); await ready()
    await expect(text).toHaveAttribute('data-r-text', 'Global title')
    await expect(page.locator('[data-r-text-editor] [data-prop="fontsize"] input')).toHaveValue('22')
    await page.locator('[data-r-number="fontSize"]').fill('14')
    await page.locator('[data-r-number="fontSize"]').press('Enter'); await ready()
    await page.locator('[data-r-label="x"]').fill('Changed X')
    await page.locator('[data-r-label="x"]').press('Enter'); await ready()
    await expect(page.locator('[data-r-unmatched]')).toHaveCount(0)
    const afterLayout = await x()
    await text.focus(); await page.locator('[data-r-reset-selected]').click(); await ready()
    expect(afterLayout - await x()).toBeCloseTo(.005, 5)
    await page.locator('[data-r-undo]').click(); await ready()
    expect(await x()).toBeCloseTo(afterLayout, 5)
    // One legend label is independently editable, and can be restored by undo.
    await page.locator('[data-r-text="Group A"]').focus()
    await page.locator('[data-r-text-content]').fill('Changed group')
    await page.locator('[data-r-text-content]').press('Enter'); await ready()
    await expect(page.locator('[data-r-text="Changed group"]')).toHaveCount(1)
    await page.locator('[data-r-undo]').click(); await ready()
    await expect(page.locator('[data-r-text="Group A"]')).toHaveCount(1)
    // Exported code runs with the same companion assets and generates the same pixels.
    const download = page.waitForEvent('download'); await page.locator('[data-r-export]').click()
    const exported = readFileSync((await (await download).path())!, 'utf8')
    const pdfBytes = await oracle.evaluate(async (r, { csv, tsv, assets, exported }) => {
      await r.FS.writeFile('实验.csv', new TextEncoder().encode(csv)); await r.FS.writeFile('table.tsv', new TextEncoder().encode(tsv))
      await r.FS.writeFile('input.rds', new Uint8Array(assets.rds)); await r.FS.writeFile('ImportedSans.ttf', new Uint8Array(assets.font))
      await r.evalRVoid(exported)
      // Inspect the replayed grid object itself, independently of UI draft values.
      await r.evalRVoid(`local({
        grDevices::pdf(NULL, width=7, height=5)
        showtext::showtext_begin()
        on.exit({ showtext::showtext_end(); grDevices::dev.off() })
        grid::grid.draw(figweave_result); grid::grid.force()
        listing <- grid::grid.ls(print=FALSE)
        all <- lapply(seq_along(listing$name), function(i) {
          full <- paste(c(if(nzchar(listing$gPath[i])) listing$gPath[i], listing$name[i]),collapse="::")
          grid::grid.get(do.call(grid::gPath, as.list(strsplit(full,"::",fixed=TRUE)[[1]])),strict=TRUE)
        })
        all <- Filter(function(g) inherits(g,"text"),all)
        title <- Filter(function(g) any(as.character(g$label) == "Global title"), all)
        stopifnot(length(title) == 1L, title[[1]]$gp$fontsize == 22,
          all(grDevices::col2rgb(title[[1]]$gp$col) == c(204L,34L,85L)), title[[1]]$gp$fontfamily == "ImportedSans")
        others <- Filter(function(g) !any(as.character(g$label) == "Global title"), all)
        stopifnot(length(others) > 0, !any(vapply(others, function(g) any(toupper(g$gp$col) == "#CC2255"), FALSE)))
      })`)
      return Array.from(await r.FS.readFile('figure-styled.pdf')) as number[]
    }, { csv, tsv, assets, exported })
    const module = previewModuleName()
    const equal = await page.evaluate(async ({ pdfBytes, url }) => {
      const { pdfPreview } = await import(url)
      const output = await pdfPreview(new Uint8Array(pdfBytes))
      const current = await (await fetch((document.querySelector('[data-r-preview]') as HTMLImageElement).src)).blob()
      return Array.from(new Uint8Array(await output.arrayBuffer())).join(',') === Array.from(new Uint8Array(await current.arrayBuffer())).join(',')
    }, { pdfBytes, url: `${origin}/r/assets/${module}` })
    expect(equal).toBe(true)
    const archiveEvent = page.waitForEvent('download'); await page.locator('[data-project-bundle]').click()
    const archive = unzipSync(readFileSync((await (await archiveEvent).path())!))
    expect(strFromU8(archive['assets/实验.csv'])).toBe(csv)
    expect(strFromU8(archive['assets/table.tsv'])).toBe(tsv)
    expect(Array.from(archive['assets/input.rds'])).toEqual(assets.rds)
    expect(Array.from(archive['assets/ImportedSans.ttf'])).toEqual(assets.font)
    await text.focus()
    await page.screenshot({ path: test.info().outputPath('ggplot2-data-text-fonts.png'), fullPage: true })
  } finally { await oracle.evaluate((r) => r.close()); await oracle.dispose() }
})
