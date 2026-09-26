// Regenerate the raster/ICO companions from the single editable SVG source.
// Run with Node 24 from web/: node scripts/generate-site-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { PRODUCT_NAME } from '../src/lib/brand.ts'

const directory = new URL('../public/', import.meta.url)
const svg = readFileSync(new URL('favicon.svg', directory), 'utf8')
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
const files = []
try {
  const page = await browser.newPage()
  const render = async (size, opaque = false) => {
    const data = await page.evaluate(async ({ svg, size, opaque }) => {
      const img = new Image()
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const context = canvas.getContext('2d')
      if (opaque) {
        context.fillStyle = '#090a0b'
        context.fillRect(0, 0, size, size)
      }
      context.drawImage(img, 0, 0, size, size)
      return canvas.toDataURL('image/png').split(',')[1]
    }, { svg, size, opaque })
    return Buffer.from(data, 'base64')
  }
  for (const [name, size, opaque] of [
    ['favicon-32.png', 32, false],
    ['apple-touch-icon.png', 180, true],
    ['icon-192.png', 192, true],
    ['icon-512.png', 512, true],
  ]) {
    writeFileSync(new URL(name, directory), await render(size, opaque))
    files.push(name)
  }
  // ICO container with three PNG-compressed entries, preserving alpha at each size.
  const sizes = [16, 32, 48]
  const pictures = await Promise.all(sizes.map(size => render(size)))
  const header = Buffer.alloc(6 + 16 * sizes.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  sizes.forEach((size, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(pictures[i].length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += pictures[i].length
  })
  writeFileSync(new URL('favicon.ico', directory), Buffer.concat([header, ...pictures]))
  files.push('favicon.ico')
  const manifest = {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    lang: 'zh-CN',
    start_url: './?lang=zh',
    scope: './',
    display: 'browser',
    background_color: '#090a0b',
    theme_color: '#090a0b',
    icons: [192, 512].map(size => ({
      src: `./icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable',
    })),
  }
  writeFileSync(new URL('site.webmanifest', directory), JSON.stringify(manifest, null, 2) + '\n')
  files.push('site.webmanifest')
  console.log(`Generated ${files.join(', ')} from favicon.svg`)
} finally {
  await browser.close()
}
