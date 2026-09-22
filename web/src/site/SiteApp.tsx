import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { currentLocale } from '@/i18n'
import { setOnlineLocale } from '@/lib/onlineLocale'
import { DESKTOP_PREVIEW, PRODUCT_NAME, REPO_URL, UPSTREAM_PRODUCT_NAME, WEBSITE_URL } from '@/lib/brand'
import { BackgroundPicker } from '@/components/ui/BackgroundPicker'
import { Button } from '@/components/ui/Button'
import { ArrowUpRight, Check, FileCodeCorner, MousePointerClick, Download, ShieldCheck } from '@/components/ui/icons'
import { ICON_SIZE } from '@/components/ui/Icon'
import preview from '@/playground/generated/kinetics.webp'
import calibration from '@/playground/generated/calibration.webp'
import spectrum from '@/playground/generated/spectrum.webp'
import exampleManifest from '@/playground/generated/examples-manifest.json'
import './site.css'

const PREVIEW_FILENAME = 'kinetics.py'
const PREVIEW_INDEX = '01 / 03'
const R_LIBRARY = 'ggplot2'

/** Public entry point: previews are real example covers; execution starts in /try/. */
export function SiteApp() {
  const { t } = useTranslation('dialogs')
  const locale = currentLocale()
  const language = locale === 'zh-CN' ? 'zh' : 'en'
  const tryHref = `./try/?lang=${language}`
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = `${PRODUCT_NAME} — ${t('site.tagline')}`
  }, [locale, t])

  return (
    <div className="site-page">
      <a href="#main" className="site-skip">{t('site.skip')}</a>
      <header className="site-header site-container">
        <a href={`./?lang=${language}`} aria-label={PRODUCT_NAME} className="site-brand">
          <span className="site-brand-mark" aria-hidden><span /><span /><span /></span>
          {PRODUCT_NAME}
        </a>
        <nav aria-label={t('site.navigation')}>
          <a href="#workflow">{t('site.workflow')}</a>
          <a href="#support">{t('site.supportTitle')}</a>
          <a href="#downloads">{t('site.desktopTitle')}</a>
          <BackgroundPicker />
          <Button data-site-language variant="ghost" onClick={() => setOnlineLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')} lang={locale === 'zh-CN' ? 'en' : 'zh-Hans'}>
            {locale === 'zh-CN' ? 'English' : '简体中文'}
          </Button>
        </nav>
      </header>

      <main id="main" className="site-container">
        <section className="site-hero">
          <div className="site-hero-copy">
            <p className="site-eyebrow"><span className="site-dot" aria-hidden />{t('site.previewLabel')}</p>
            <h1 className="site-headline text-[28px]">{t('site.tagline')}</h1>
            <p className="site-intro">{t('site.intro')}</p>
            <div className="site-actions">
              <a data-site-try href={tryHref} className="site-primary">{t('site.tryAction')}<ArrowUpRight aria-hidden size={ICON_SIZE.md} /></a>
              <a href="#workflow" className="site-text-link">{t('site.workflow')}<ArrowUpRight aria-hidden /></a>
            </div>
            <p className="site-note">{t('site.tryNote')}</p>
          </div>
          <figure className="site-figure">
            <div className="site-figure-bar"><span className="site-file"><FileCodeCorner aria-hidden size={ICON_SIZE.md} />{PREVIEW_FILENAME}</span><span>{t('site.figurePreview')}</span></div>
            <div className="site-figure-paper">
              <div className="site-paper-label"><span>{t('site.figureLabel')}</span><span aria-hidden>{PREVIEW_INDEX}</span></div>
              <img src={preview} width={exampleManifest.kinetics.width} height={exampleManifest.kinetics.height} alt={t('site.previewAlt')} fetchPriority="high" />
              <div className="site-figure-detail"><MousePointerClick aria-hidden size={ICON_SIZE.md} /><span>{t('site.editHint')}</span></div>
            </div>
            <figcaption><Check aria-hidden /><span>{t('site.previewCaption')}</span></figcaption>
          </figure>
        </section>

        <div className="site-library-strip">
          <p>{t('site.libraryLabel')}</p>
          <div>{['Matplotlib', 'seaborn', 'pandas', 'NetworkX', 'Plotly', 'pyecharts'].map((name) => <span key={name}>{name}</span>)}<span>{R_LIBRARY} <small>{t('site.experimental')}</small></span></div>
        </div>

        <section id="workflow" className="site-section">
          <div className="site-section-heading"><p className="site-eyebrow">{t('site.workflow')}</p><h2>{t('site.workflowTitle')}</h2><p>{t('site.workflowIntro')}</p></div>
          <div className="site-workflow-grid">
            <article><span className="site-step">01</span><FileCodeCorner aria-hidden size={ICON_SIZE.lg} /><h3>{t('site.stepSource')}</h3><p>{t('site.stepSourceBody')}</p></article>
            <article><span className="site-step">02</span><MousePointerClick aria-hidden size={ICON_SIZE.lg} /><h3>{t('site.stepEdit')}</h3><p>{t('site.stepEditBody')}</p></article>
            <article><span className="site-step">03</span><Download aria-hidden size={ICON_SIZE.lg} /><h3>{t('site.stepExport')}</h3><p>{t('site.stepExportBody')}</p></article>
          </div>
        </section>

        <a data-site-charts href={`./charts/?lang=${language}`} className="site-primary">{t('charts.open')}<ArrowUpRight aria-hidden /></a>
        <section id="support" className="site-section">
          <div className="site-section-heading"><p className="site-eyebrow">{t('site.libraryLabel')}</p><h2 className="text-[19px]">{t('site.supportTitle')}</h2><p>{t('site.supportIntro')}</p></div>
          <div className="site-support-grid">
            <article className="site-python-card">
              <div className="site-card-copy"><p className="site-eyebrow">{t('site.available')}</p><h3>{t('site.matplotlibTitle')}</h3><p>{t('site.matplotlibBody')}</p></div>
              <div className="site-example-pair">
                <img src={calibration} width={exampleManifest.calibration.width} height={exampleManifest.calibration.height} alt={t('site.calibrationAlt')} loading="lazy" />
                <img src={spectrum} width={exampleManifest.spectrum.width} height={exampleManifest.spectrum.height} alt={t('site.spectrumAlt')} loading="lazy" />
              </div>
              <div className="site-card-copy"><h4>{t('site.pythonTitle')}</h4><p>{t('site.pythonBody')}</p><a href={tryHref} className="site-text-link">{t('site.tryAction')}<ArrowUpRight aria-hidden /></a></div>
            </article>
            <article className="site-r-card">
              <p className="site-eyebrow">{t('site.experimental')}</p><h3>{t('site.rTitle')}</h3><p>{t('site.rBody')}</p>
              <pre className="site-code" aria-label={t('site.rCodeLabel')}><code>{'ggplot(data, aes(x, y)) +\n  geom_point() +\n  theme_minimal()'}</code></pre>
              <p className="site-r-note">{t('site.rBoundary')}</p>
              <a data-site-r href={`./r/?lang=${language}`} className="site-text-link">{t('site.rAction')}<ArrowUpRight aria-hidden /></a>
            </article>
          </div>
          <p className="site-scope">{t('site.scope')}</p>
        </section>

        <section className="site-privacy"><ShieldCheck aria-hidden size={ICON_SIZE.lg} /><div><h2>{t('site.privacyTitle')}</h2><p>{t('site.privacyBody')}</p></div><span>{t('site.privacyTag')}</span></section>
        <section id="downloads" className="site-downloads">
          <div><p className="site-eyebrow">{t('site.nextChapter')}</p><h2 className="text-[19px]">{t('site.desktopTitle')}</h2></div>
          <div>
            <p>{t('site.desktopBody', { product: PRODUCT_NAME, version: DESKTOP_PREVIEW.version })}</p>
            <div className="site-download-links">
              <a data-site-download="windows" href={DESKTOP_PREVIEW.windowsUrl} className="site-text-link rounded-sm border border-border bg-surface px-4"><Download aria-hidden />{t('site.downloadWindows')}</a>
              <a data-site-download="macos" href={DESKTOP_PREVIEW.macosUrl} className="site-text-link rounded-sm border border-border bg-surface px-4"><Download aria-hidden />{t('site.downloadMac')}</a>
            </div>
            <p data-site-download-access className="site-note">{t('site.downloadAccess')}</p>
            <p className="site-note">{t('site.desktopNote')}</p>
            <p className="site-note">{t('site.desktopScope')}</p>
            <a data-site-release href={DESKTOP_PREVIEW.releaseUrl} className="site-text-link">{t('site.releaseNotes')}<ArrowUpRight aria-hidden /></a>
          </div>
        </section>
      </main>
      <footer className="site-footer site-container"><div><a href={WEBSITE_URL} className="site-brand">{PRODUCT_NAME}</a><p>{t('site.attribution', { product: PRODUCT_NAME, upstream: UPSTREAM_PRODUCT_NAME })}</p></div><div className="site-footer-links"><a href={REPO_URL}>{t('site.upstreamSource')}</a><a href="./source/figweave-source.zip">{t('site.sourceDownload')}</a><a href="./LICENSE">{t('site.license')}</a></div></footer>
    </div>
  )
}
