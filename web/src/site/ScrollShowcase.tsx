import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUpRight, Check, Download, FileCodeCorner, Layers, MousePointerClick, SlidersHorizontal } from '@/components/ui/icons'
import { ICON_SIZE } from '@/components/ui/Icon'
import { PRODUCT_NAME } from '@/lib/brand'
import source from './generated/scroll-source.svg'
import typography from './generated/scroll-type.svg'
import legend from './generated/scroll-legend.svg'
import './scroll-showcase.css'

const CHAPTERS = ['source', 'select', 'type', 'legend', 'export'] as const
// Example document content is not UI copy and keeps its original filename and unit.
const SOURCE_NAME = 'kinetics.py'
const OUTPUT_NAME = 'kinetics.png'
const POINT_UNIT = 'pt'
const clamp = (v: number) => Math.min(1, Math.max(0, v))

/** A scroll-driven product demonstration. No Python, user code or figure worker loads here. */
export function ScrollShowcase({ tryHref }: { tryHref: string }) {
  const { t } = useTranslation('dialogs')
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [reduced, setReduced] = useState(false)
  const [manualChapter, setManualChapter] = useState(0)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => setReduced(media.matches)
    syncMotion()
    media.addEventListener('change', syncMotion)
    let frame = 0
    const update = () => {
      frame = 0
      if (!root.current || !pin.current || media.matches) return
      const rect = root.current.getBoundingClientRect()
      const offset = parseFloat(getComputedStyle(pin.current).top) || 0
      const travel = rect.height - pin.current.offsetHeight
      setProgress(travel > 0 ? clamp((offset - rect.top) / travel) : 0)
    }
    // rAF only batches scroll measurements; there is no autonomous playback or wheel interception.
    const request = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    request()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      media.removeEventListener('change', syncMotion)
    }
  }, [])
  const chapter = reduced ? manualChapter : Math.min(4, Math.floor(progress * 5))
  const reveal = reduced ? 1 : clamp(progress / 0.16)
  const go = (index: number) => {
    if (reduced) { setManualChapter(index); return }
    if (!root.current || !pin.current) return
    const rect = root.current.getBoundingClientRect()
    const offset = parseFloat(getComputedStyle(pin.current).top) || 0
    const travel = rect.height - pin.current.offsetHeight
    window.scrollTo({ top: window.scrollY + rect.top - offset + travel * ((index + 0.3) / 5), behavior: 'instant' })
  }
  const key = CHAPTERS[chapter]
  const style = { '--story-reveal': reveal, '--story-progress': progress } as CSSProperties
  return (
    <section id="workflow" ref={root} className="scroll-story" data-scroll-story data-chapter={key} style={style}>
      <div ref={pin} className="story-pin" data-story-pin>
        <div className="story-layout">
          <figure className="story-stage" data-story-scene aria-label={t('site.story.previewLabel')}>
            <div className="story-window" aria-hidden="true">
              <div className="story-windowbar"><span>{PRODUCT_NAME}</span><span><FileCodeCorner size={ICON_SIZE.sm} />{SOURCE_NAME}</span><span className="story-export-action" data-highlight={chapter === 4}><Download size={ICON_SIZE.sm} />{t('playground.exportPng')}</span></div>
              <div className="story-elements"><Layers size={ICON_SIZE.md} /><span>{t('playground.workspaceLayers')}</span><p>{t('site.story.objectTitle')}</p><p>{t('site.story.objectAxes')}</p><p>{t('site.story.objectSeries')}</p><p className={chapter === 3 ? 'story-selected' : ''}>{t('site.story.objectLegend')}</p></div>
              <div className="story-inspector"><SlidersHorizontal size={ICON_SIZE.md} /><span>{t('playground.workspaceProperties')}</span><p>{t('site.story.fontSize')}</p><strong>{chapter >= 2 ? '12' : '9'} {POINT_UNIT}</strong><p>{t('site.story.legendPosition')}</p><strong>{t(chapter >= 3 ? 'site.story.upperLeft' : 'site.story.lowerRight')}</strong></div>
            </div>
            <div className="story-paper" data-story-paper>
              <img src={source} alt={t('site.previewAlt')} width="340" height="250" fetchPriority="high" style={{ opacity: chapter < 2 ? 1 : 0 }} />
              <img src={typography} alt="" aria-hidden width="340" height="250" style={{ opacity: chapter === 2 ? 1 : 0 }} />
              <img src={legend} alt="" aria-hidden width="340" height="250" style={{ opacity: chapter >= 3 ? 1 : 0 }} />
              <span aria-hidden className="story-selection" data-focus={chapter === 1 || chapter === 2 ? 'title' : chapter === 3 ? 'legend' : 'none'} />
              {chapter > 0 && chapter < 4 && <span className="story-cursor" data-target={chapter === 3 ? 'legend' : 'title'} aria-hidden><MousePointerClick size={ICON_SIZE.lg} /></span>}
            </div>
            <div className="story-file" aria-hidden data-visible={chapter === 4}><span className="story-file-icon"><Check size={ICON_SIZE.lg} /></span><div><strong>{OUTPUT_NAME}</strong><span>{t('site.story.outputSize')}</span></div><Download size={ICON_SIZE.lg} /></div>
            <figcaption>{t('site.story.previewLabel')}</figcaption>
          </figure>
          <div className="story-copy">
            <p className="story-kicker">{PRODUCT_NAME} / {t('site.story.kicker')}</p>
            <div className="story-copy-content">
              <span className="story-index" aria-hidden>0{chapter + 1} / 05</span>
              <h1>{t(`site.story.${key}.title`)}</h1>
              <p className="story-body">{t(`site.story.${key}.body`)}</p>
              <p className="story-detail">{t(`site.story.${key}.detail`)}</p>
            </div>
            <nav className="story-chapters" aria-label={t('site.story.chapters')}>
              {CHAPTERS.map((item, index) => <button key={item} data-story-jump={item} onClick={() => go(index)} aria-label={t(`site.story.${item}.title`)} aria-current={chapter === index ? 'step' : undefined}><span aria-hidden>0{index + 1}</span></button>)}
            </nav>
            <a data-site-try href={tryHref} className="site-primary">{t('site.tryAction')}<ArrowUpRight size={ICON_SIZE.md} aria-hidden /></a>
            <a href="#support" data-story-skip className="story-skip">{t('site.story.skip')}</a>
            <p className="story-scroll-cue"><ArrowDown size={ICON_SIZE.sm} aria-hidden />{t(reduced ? 'site.story.reducedHint' : 'site.story.scrollHint')}</p>
          </div>
        </div>
        <div className="story-progress" aria-hidden><span /></div>
      </div>
    </section>
  )
}
