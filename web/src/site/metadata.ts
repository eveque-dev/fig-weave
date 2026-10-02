import { PRODUCT_NAME, WEBSITE_URL } from '@/lib/brand'

export function updateSiteMetadata(locale: string, tagline: string, description: string) {
  const title = `${PRODUCT_NAME} — ${tagline}`
  document.title = title
  const meta = (attribute: 'name' | 'property', key: string, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.append(element) }
    element.content = content
  }
  meta('name', 'description', description)
  meta('property', 'og:title', title); meta('property', 'og:description', description)
  meta('property', 'og:locale', locale === 'zh-CN' ? 'zh_CN' : 'en_US')
  meta('property', 'og:type', 'website'); meta('property', 'og:site_name', PRODUCT_NAME)
  meta('property', 'og:url', `${WEBSITE_URL}/`)
  meta('property', 'og:image', `${WEBSITE_URL}/share.png`)
  meta('name', 'twitter:card', 'summary_large_image')
  meta('name', 'twitter:title', title); meta('name', 'twitter:description', description)
  meta('name', 'twitter:image', `${WEBSITE_URL}/share.png`)
}
