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
    await expect(page.locator('#downloads')).toContainText('尚未发布')
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
