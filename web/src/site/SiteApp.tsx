import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { currentLocale, setLocale } from '@/i18n'
import { PRODUCT_NAME, REPO_URL, UPSTREAM_PRODUCT_NAME, WEBSITE_URL } from '@/lib/brand'
import { Button } from '@/components/ui/Button'
import preview from '@/playground/generated/kinetics.webp'
import exampleManifest from '@/playground/generated/examples-manifest.json'

/** Public entry point. No playground session or Python runtime is started here. */
export function SiteApp() {
  const { t } = useTranslation('dialogs')
  const locale = currentLocale()
  const tryHref = `./try/?lang=${locale === 'zh-CN' ? 'zh' : 'en'}`
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = `${PRODUCT_NAME} — ${t('site.tagline')}`
  }, [locale, t])

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <a href="./" aria-label={PRODUCT_NAME} className="text-base font-medium tracking-tight">
          {PRODUCT_NAME}
        </a>
        <nav className="flex items-center gap-4" aria-label={t('site.navigation')}>
          <a href="#support" className="text-sm text-ink-2 hover:text-ink">{t('site.supportTitle')}</a>
          <a href="#downloads" className="text-sm text-ink-2 hover:text-ink">{t('site.desktopTitle')}</a>
          <Button
            data-site-language
            onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
            lang={locale === 'zh-CN' ? 'en' : 'zh-Hans'}
          >
            {locale === 'zh-CN' ? 'English' : '简体中文'}
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-[1120px] px-6">
        <section className="grid items-center gap-8 py-12 md:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <p className="text-sm text-ink-3">{t('site.previewLabel')}</p>
            <h1 className="text-[28px] leading-tight font-medium tracking-tight">{t('site.tagline')}</h1>
            <p className="max-w-[48ch] text-base leading-relaxed text-ink-2">{t('site.intro')}</p>
            <a data-site-try href={tryHref} className="inline-flex h-9 items-center rounded-sm bg-ink px-4 text-sm text-white hover:opacity-90">
              {t('site.tryAction')}
            </a>
            <p className="text-xs leading-relaxed text-ink-3">{t('site.tryNote')}</p>
          </div>
          <figure className="rounded-md border border-border bg-surface p-5">
            <img src={preview} width={exampleManifest.kinetics.width} height={exampleManifest.kinetics.height} alt={t('site.previewAlt')} className="h-auto w-full" />
            <figcaption className="mt-3 text-xs leading-relaxed text-ink-3">{t('site.previewCaption')}</figcaption>
          </figure>
        </section>

        <section id="support" className="scroll-mt-6 border-t border-border py-8">
          <h2 className="text-[19px] font-medium">{t('site.supportTitle')}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <article className="rounded-md border border-border bg-surface p-5">
              <p className="text-xs text-ink-3">{t('site.available')}</p>
              <h3 className="mt-2 text-base font-medium">{t('site.matplotlibTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{t('site.matplotlibBody')}</p>
            </article>
            <article className="rounded-md border border-border p-5">
              <p className="text-xs text-ink-3">{t('site.available')}</p>
              <h3 className="mt-2 text-base font-medium">{t('site.pythonTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{t('site.pythonBody')}</p>
            </article>
            <article className="rounded-md border border-border p-5">
              <p className="text-xs text-ink-3">{t('site.experimental')}</p>
              <h3 className="mt-2 text-base font-medium">{t('site.rTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{t('site.rBody')}</p>
              <a data-site-r href={`./r/?lang=${locale === 'zh-CN' ? 'zh' : 'en'}`} className="mt-3 inline-block text-sm underline">{t('site.rAction')}</a>
            </article>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-3">{t('site.scope')}</p>
        </section>

        <section id="downloads" className="scroll-mt-6 border-t border-border py-8">
          <h2 className="text-[19px] font-medium">{t('site.desktopTitle')}</h2>
          <p className="mt-3 text-base leading-relaxed text-ink-2">{t('site.desktopBody', { product: PRODUCT_NAME })}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">{t('site.desktopNote')}</p>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-3 border-t border-border px-6 py-6 text-xs leading-relaxed text-ink-3">
        <p>{t('site.attribution', { product: PRODUCT_NAME, upstream: UPSTREAM_PRODUCT_NAME })}</p>
        <div className="flex gap-4">
          <a href={REPO_URL} className="hover:text-ink">{t('site.upstreamSource')}</a>
          <a href="./source/figweave-source.zip" className="hover:text-ink">{t('site.sourceDownload')}</a>
          <a href="./LICENSE" className="hover:text-ink">{t('site.license')}</a>
          <a href={WEBSITE_URL} className="hover:text-ink">{PRODUCT_NAME}</a>
        </div>
      </footer>
    </div>
  )
}
