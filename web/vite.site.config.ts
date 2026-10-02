import { defineConfig, mergeConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import playground from './vite.playground.config.ts'
import { readFileSync } from 'node:fs'
import { PRODUCT_NAME, WEBSITE_URL } from './src/lib/brand.ts'
import zh from './src/i18n/locales/zh-CN/dialogs.json' with { type: 'json' }

export default mergeConfig(playground, defineConfig({
  plugins: [{
    name: 'figweave-static-metadata',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'share.png', source: readFileSync(new URL('../assets/figweave/promo-poster.png', import.meta.url)) })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const title = `${PRODUCT_NAME} — ${zh.site.tagline}`
        const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
        const image = `${WEBSITE_URL}/share.png`
        const introduction = `<main data-static-intro><h1>${escape(PRODUCT_NAME)}</h1><p>${escape(zh.site.tagline)}</p><p>${escape(zh.site.description)}</p><nav aria-label="${escape(zh.site.navigation)}"><a href="./try/?lang=zh">${escape(zh.site.tryAction)}</a> · <a href="./charts/?lang=zh">${escape(zh.charts.title)}</a> · <a href="./r/?lang=zh">${escape(zh.site.rAction)}</a></nav></main>`
        return {
          html: html.replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(zh.site.description)}" />`).replace('<div id="root"></div>', `<div id="root">${introduction}</div>`),
          tags: [
            { tag: 'link', attrs: { rel: 'canonical', href: `${WEBSITE_URL}/` } },
            ...Object.entries({ 'og:type': 'website', 'og:site_name': PRODUCT_NAME, 'og:url': `${WEBSITE_URL}/`, 'og:locale': 'zh_CN', 'og:title': title, 'og:description': zh.site.description, 'og:image': image }).map(([property, content]) => ({ tag: 'meta', attrs: { property, content } })),
            ...Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': title, 'twitter:description': zh.site.description, 'twitter:image': image }).map(([name, content]) => ({ tag: 'meta', attrs: { name, content } })),
          ],
        }
      },
    },
  }],
  build: {
    outDir: 'dist-site',
    rollupOptions: { input: fileURLToPath(new URL('./site.html', import.meta.url)) },
  },
}))
