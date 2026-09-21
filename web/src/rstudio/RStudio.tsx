import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { TextArea, TextInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { currentLocale } from '@/i18n'
import { PRODUCT_NAME, playgroundHomeHref } from '@/lib/brand'
import { DEFAULT_STYLE, RPlotClient, styleExpression, type PlotStyle } from './client'
import example from './example.R?raw'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** ggplot2 styles are replayed from p; this is not a Matplotlib artist editor. */
export function RStudio() {
  const { t } = useTranslation('dialogs')
  const [source, setSource] = useState(example)
  const [loadedSource, setLoadedSource] = useState('')
  const [style, setStyle] = useState<PlotStyle>({ ...DEFAULT_STYLE })
  const [history, setHistory] = useState<PlotStyle[]>([])
  const [future, setFuture] = useState<PlotStyle[]>([])
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loadingRuntime' | 'loadingPackages' | 'running' | 'ready'>('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const client = useRef<RPlotClient | null>(null)
  const seq = useRef(0)
  const active = !!loadedSource && !busy
  useEffect(() => () => { seq.current++; client.current?.close() }, [])
  useEffect(() => {
    const url = preview ? URL.createObjectURL(preview) : ''
    setPreviewUrl(url)
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [preview])
  useEffect(() => {
    document.title = `${PRODUCT_NAME} · ${t('rStudio.title')}`
    document.documentElement.lang = currentLocale()
  }, [t])

  const cancel = () => {
    seq.current++; client.current?.close(); client.current = null
    setBusy(false); setLoadedSource(''); setPreview(null); setPhase('idle')
  }
  const run = async () => {
    const id = ++seq.current
    client.current?.close()
    const r = new RPlotClient(); client.current = r
    setBusy(true); setError(''); setLoadedSource(''); setPreview(null)
    try {
      await r.load(source, (key) => { if (seq.current === id) setPhase(key) })
      const blob = await r.render(DEFAULT_STYLE)
      if (seq.current !== id) return
      setPreview(blob); setLoadedSource(source); setStyle({ ...DEFAULT_STYLE })
      setHistory([]); setFuture([]); setPhase('ready')
    } catch (e) {
      r.close()
      if (seq.current === id) { setError(String(e)); setPhase('idle') }
    } finally { if (seq.current === id) setBusy(false) }
  }
  const apply = async (next: PlotStyle, direction: 'edit' | 'undo' | 'redo' = 'edit') => {
    if (!client.current || busy || !loadedSource) return
    const id = seq.current
    setBusy(true); setError('')
    try {
      const blob = await client.current.render(next)
      if (id !== seq.current) return
      if (direction === 'undo') { setHistory(history.slice(0, -1)); setFuture([...future, style]) }
      else if (direction === 'redo') { setFuture(future.slice(0, -1)); setHistory([...history, style]) }
      else { setHistory([...history, style].slice(-50)); setFuture([]) }
      setStyle(next); setPreview(blob)
    } catch (e) {
      if (id === seq.current) setError(String(e))
    } finally { if (id === seq.current) setBusy(false) }
  }
  const exportPdf = async () => {
    if (!client.current || !active) return
    const id = seq.current; setBusy(true); setError('')
    try {
      const blob = await client.current.pdf(style)
      if (seq.current === id) download(blob, 'figure.pdf')
    } catch (e) { if (seq.current === id) setError(String(e)) }
    finally { if (seq.current === id) setBusy(false) }
  }
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <a href={playgroundHomeHref(currentLocale())} className="font-medium">{PRODUCT_NAME}</a>
        <h1 className="text-lg font-medium">{t('rStudio.title')}</h1>
        <a href={`../try/?lang=${currentLocale() === 'zh-CN' ? 'zh' : 'en'}`} className="text-sm">{t('rStudio.python')}</a>
      </header>
      <main className="mx-auto max-w-[1400px] space-y-5 p-6">
        <p className="max-w-[90ch] text-sm leading-relaxed text-ink-2">{t('rStudio.scope')}</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <section className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t('rStudio.source')}</span>
              <TextArea data-r-source aria-label={t('rStudio.source')} value={source} disabled={busy} onChange={(e) => setSource(e.target.value)} className="min-h-[260px] font-mono text-sm" />
            </label>
            <label className="block text-sm">
              {t('rStudio.upload')}
              <input data-r-upload type="file" accept=".r,.R" disabled={busy} className="mt-2 block w-full text-sm" onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 256 * 1024) { setError(t('rStudio.tooLarge')); return }
                setSource(await file.text())
              }} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button data-r-run variant="primary" disabled={busy || !source.trim()} onClick={() => void run()}>{t('rStudio.run')}</Button>
              {busy && <Button data-r-cancel onClick={cancel}>{t('rStudio.cancel')}</Button>}
              <Button disabled={busy} onClick={() => setSource(example)}>{t('rStudio.example')}</Button>
            </div>
            <p data-r-status className="text-sm text-ink-3">{t(`rStudio.${phase}`)}</p>
            {loadedSource && source !== loadedSource && <p className="text-sm text-ink-2">{t('rStudio.changed')}</p>}
            {error && <pre data-r-error role="alert" className="whitespace-pre-wrap break-words text-sm text-danger">{error}</pre>}
            <fieldset disabled={!active} className="space-y-3 border-t border-border pt-4">
              <legend className="text-sm font-medium">{t('rStudio.style')}</legend>
              {(['title', 'x', 'y'] as const).map((key) => (
                <label key={key} className="block space-y-1 text-sm">
                  <span>{t(`rStudio.${key === 'title' ? 'plotTitle' : key}`)}</span>
                  <TextInput data-r-label={key} key={`${key}:${style[key]}`} defaultValue={style[key] ?? ''} placeholder={t('rStudio.keepOriginal')} onBlur={(e) => {
                    const value = e.target.value
                    if (value !== (style[key] ?? '')) void apply({ ...style, [key]: value })
                  }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
                </label>
              ))}
              <Select ariaLabel={t('rStudio.theme')} disabled={!active} value={style.theme} onChange={(theme) => void apply({ ...style, theme })} options={(['original', 'minimal', 'classic', 'bw'] as const).map((value) => ({ value, label: t(`rStudio.${value}`) }))} />
              <Select ariaLabel={t('rStudio.legend')} disabled={!active} value={style.legend} onChange={(legend) => void apply({ ...style, legend })} options={(['right', 'bottom', 'none'] as const).map((value) => ({ value, label: t(`rStudio.${value}`) }))} />
              {(['fontSize', 'width', 'height'] as const).map((key) => (
                <label key={key} className="flex items-center justify-between gap-4 text-sm">
                  <span>{t(`rStudio.${key}`)}</span>
                  <TextInput data-r-number={key} key={`${key}:${style[key]}`} type="number" className="max-w-24" defaultValue={style[key]} min={key === 'fontSize' ? 6 : 1} max={key === 'fontSize' ? 48 : 20} step="1" onBlur={(e) => {
                    const value = Number(e.target.value)
                    if (value !== style[key]) void apply({ ...style, [key]: value })
                  }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
                </label>
              ))}
              <div className="flex gap-2">
                <Button data-r-undo disabled={!active || !history.length} onClick={() => void apply(history[history.length - 1], 'undo')}>{t('rStudio.undo')}</Button>
                <Button data-r-redo disabled={!active || !future.length} onClick={() => void apply(future[future.length - 1], 'redo')}>{t('rStudio.redo')}</Button>
                <Button disabled={!active} onClick={() => void apply({ ...DEFAULT_STYLE })}>{t('rStudio.reset')}</Button>
              </div>
            </fieldset>
          </section>
          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button data-r-png disabled={!active || !preview} onClick={() => { if (preview) download(preview, 'figure.png') }}>{t('rStudio.png')}</Button>
              <Button data-r-pdf disabled={!active} onClick={() => void exportPdf()}>{t('rStudio.pdf')}</Button>
              <Button data-r-export disabled={!active} onClick={() => download(new Blob([`${loadedSource}\n\n# ${PRODUCT_NAME} styling\nfigweave_plot <- ${styleExpression(style)}\nprint(figweave_plot)\n`], { type: 'text/plain;charset=utf-8' }), 'figure-styled.R')}>{t('rStudio.exportR')}</Button>
            </div>
            <div className="flex min-h-[350px] items-center justify-center rounded-md border border-border bg-surface p-4">
              {previewUrl ? <img data-r-preview src={previewUrl} alt={t('rStudio.preview')} className="h-auto max-w-full" /> : <p className="text-sm text-ink-3">{t('rStudio.empty')}</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
