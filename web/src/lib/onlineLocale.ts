import { setLocale, type Locale } from '@/i18n'

/** Keep explicit online URLs in step with the user's persisted language choice. */
export async function setOnlineLocale(locale: Locale) {
  const url = new URL(window.location.href)
  url.searchParams.set('lang', locale === 'zh-CN' ? 'zh' : 'en')
  window.history.replaceState(window.history.state, '', url)
  await setLocale(locale)
}
