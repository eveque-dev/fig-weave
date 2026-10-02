import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackgroundPicker } from '@/components/ui/BackgroundPicker'
import { Details, Summary } from '@/components/ui/Details'
import { Button } from '@/components/ui/Button'
import { TextArea, TextInput } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { currentLocale } from '@/i18n'
import { PRODUCT_NAME, playgroundHomeHref } from '@/lib/brand'
import { DEFAULT_STYLE, FONT_FAMILIES, LEGEND_POSITIONS, RPlotClient, exportR, type PlotStyle, type RObject } from './client'
import { AssetError, assetSignature, mergeAssets, readAssets, readSnippet, type RAsset, type AssetKind } from './assets'
import { ProjectControls } from '@/online/ProjectControls'
import { ExportWidth } from '@/online/ExportWidth'
import { DEFAULT_PNG_WIDTH } from '@/online/exportSize'
import { reproductionBundle } from '@/online/bundle'
import { emptyProject, type OnlineProject } from '@/online/project'
import { rProject } from '@/online/restore'
import { LoadFeedback } from '@/online/LoadFeedback'
import { TextInspector } from './TextInspector'
import { DragOverlay } from './DragOverlay'
import example from './example.R?raw'
import './studio.css'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** ggplot2 styles are replayed from p; this is not a Matplotlib artist editor. */
export function RStudio() {
  const { t } = useTranslation('dialogs')
  const [objects, setObjects] = useState<RObject[]>([])
  const [selected, setSelected] = useState('')
  const [data, setData] = useState<RAsset[]>([])
  const [fonts, setFonts] = useState<RAsset[]>([])
  const [reading, setReading] = useState(false)
  const [loadedAssets, setLoadedAssets] = useState('')
  const [source, setSource] = useState(example)
  const [loadedSource, setLoadedSource] = useState('')
  const [pngWidth, setPngWidth] = useState(DEFAULT_PNG_WIDTH)
  const restored = useRef<OnlineProject | null>(null)
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
  const pending = useRef(false)
  const active = !!loadedSource && !busy && !reading
  const families = client.current?.families ?? [...FONT_FAMILIES]
  const selectedObject = objects.find((object) => object.id === selected)
  const unmatched = Object.keys({ ...style.moves, ...style.textEdits }).filter((id) => !objects.some((o) => o.id === id)).length
  const fontWarnings = objects.filter((o) => o.font && (o.font.requested !== o.font.actual || o.font.missing || !o.font.checked))
  const assetsKey = assetSignature([...data, ...fonts])
  const importFiles = async (files: File[], kind: AssetKind) => {
    if (!files.length || reading || busy) return
    setReading(true); setError('')
    try {
      const incoming = await readAssets(files, kind)
      const next = mergeAssets(kind === 'data' ? data : fonts, incoming, kind)
      if (kind === 'data') setData(next); else setFonts(next)
    } catch (e) { setError(e instanceof AssetError ? t(`rStudio.assetError.${e.code}`, { name: e.filename }) : String(e)) }
    finally { setReading(false) }
  }
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
    pending.current = false; setObjects([]); setSelected('')
    setBusy(false); setLoadedSource(''); setPreview(null); setPhase('idle')
  }
  const run = async () => {
    const id = ++seq.current
    const saved = restored.current?.source === source && assetSignature(restored.current.assets) === assetsKey ? restored.current : null
    const replay = saved ? rProject(saved) : null
    client.current?.close()
    const r = new RPlotClient(); client.current = r
    pending.current = true; setObjects([]); setSelected('')
    setBusy(true); setError(''); setLoadedSource(''); setPreview(null)
    try {
      await r.load(saved?.renderedSource || source, (key) => { if (seq.current === id) setPhase(key) }, data, fonts)
      const nextStyle = replay?.state ?? DEFAULT_STYLE
      const blob = await r.render(nextStyle)
      if (seq.current !== id) return
      setObjects(r.objects); setPreview(blob); setLoadedSource(saved?.renderedSource || source); setLoadedAssets(assetsKey); setStyle(structuredClone(nextStyle))
      setHistory(replay?.history ?? []); setFuture(replay?.future ?? []); restored.current = null; setPhase('ready')
    } catch (e) {
      r.close()
      if (seq.current === id) { setError(String(e)); setPhase('idle') }
    } finally { if (seq.current === id) { pending.current = false; setBusy(false) } }
  }
  const apply = async (next: PlotStyle, direction: 'edit' | 'undo' | 'redo' = 'edit') => {
    if (!client.current || pending.current || !loadedSource) return
    if (JSON.stringify(next) === JSON.stringify(style)) return
    const id = seq.current
    pending.current = true
    setBusy(true); setError('')
    try {
      const blob = await client.current.render(next)
      if (id !== seq.current) return
      if (direction === 'undo') { setHistory(history.slice(0, -1)); setFuture([...future, style]) }
      else if (direction === 'redo') { setFuture(future.slice(0, -1)); setHistory([...history, style]) }
      else { setHistory([...history, style].slice(-50)); setFuture([]) }
      setObjects(client.current.objects); setStyle(next); setPreview(blob)
      if (!client.current.objects.some((object) => object.id === selected)) setSelected('')
    } catch (e) {
      if (id === seq.current) {
        if (client.current?.isClosed) { restored.current = snapshot(); cancel() }
        setError(String(e))
      }
    } finally { if (id === seq.current) { pending.current = false; setBusy(false) } }
  }
  const exportPdf = async (format: 'png' | 'pdf' = 'pdf') => {
    if (!client.current || !active || pending.current) return
    const id = seq.current; pending.current = true; setBusy(true); setError('')
    try {
      const blob = format === 'pdf' ? await client.current.pdf(style) : await client.current.png(style, pngWidth)
      if (seq.current === id) download(blob, `figure.${format}`)
    } catch (e) {
      if (seq.current === id) {
        if (client.current?.isClosed) { restored.current = snapshot(); cancel() }
        setError(String(e))
      }
    } finally { if (seq.current === id) { pending.current = false; setBusy(false) } }
  }
  const snapshot = (): OnlineProject => ({ ...emptyProject('ggplot2', source), renderedSource: loadedSource && assetsKey === loadedAssets ? loadedSource : '', state: style, history, future, assets: [...data, ...fonts], pngWidth })
  const restore = (project: OnlineProject) => {
    const checked = rProject(project)
    cancel(); restored.current = project; setSource(project.source); setData(checked.data); setFonts(checked.fonts); setStyle(checked.state ?? { ...DEFAULT_STYLE }); setHistory([]); setFuture([]); setPngWidth(project.pngWidth); setError('')
  }
  return (
    <div className="r-studio min-h-screen bg-bg text-ink">
      <header className="r-studio-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <a href={playgroundHomeHref(currentLocale())} className="font-medium">{PRODUCT_NAME}</a>
        <h1 className="text-lg font-medium">{t('rStudio.title')}</h1>
        <BackgroundPicker />
        <a href={`../try/?lang=${currentLocale() === 'zh-CN' ? 'zh' : 'en'}`} className="text-sm">{t('rStudio.python')}</a>
      </header>
      <main className="r-studio-main mx-auto max-w-[1400px] space-y-5 p-6">
        <p className="r-studio-scope text-sm leading-relaxed text-ink-2">{t('rStudio.scope')}</p>
        <ProjectControls snapshot={() => restored.current ? { ...restored.current, source, assets: [...data, ...fonts], pngWidth } : snapshot()} restore={restore} revision={JSON.stringify([source, style, history, future, assetsKey, pngWidth])} canSave={(!loadedSource || assetsKey === loadedAssets) && (!restored.current || assetSignature(restored.current.assets) === assetsKey)} disabled={busy || reading} bundle={active && assetsKey === loadedAssets ? async () => { const project = structuredClone(snapshot()); return reproductionBundle(project, exportR(project.renderedSource, project.state as PlotStyle, client.current!.fonts), await client.current!.pdf(style)) } : undefined} />
        {restored.current && <p data-project-restored className="text-sm text-ink-2">{t('onlineProject.restored')}</p>}
        <div className="r-studio-layout grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <section className="r-studio-controls space-y-4">
            {selectedObject?.typography && <TextInspector key={selectedObject.id} object={selectedObject} edit={style.textEdits[selected] ?? {}} families={families} disabled={!active} commit={(patch) => { const textEdits = { ...style.textEdits }; if (Object.keys(patch).length) textEdits[selected] = patch; else delete textEdits[selected]; void apply({ ...style, textEdits }) }} />}
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t('rStudio.source')}</span>
              <TextArea data-r-source aria-label={t('rStudio.source')} value={source} disabled={busy || reading} onChange={(e) => setSource(e.target.value)} className="min-h-[260px] font-mono text-sm" />
            </label>
            <label className="block text-sm">
              {t('rStudio.upload')}
              <input data-r-upload type="file" accept=".r,.R" disabled={busy || reading} className="mt-2 block w-full text-sm" onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 256 * 1024) { setError(t('rStudio.tooLarge')); return }
                setReading(true)
                try { setSource(await file.text()) } catch (e) { setError(String(e)) } finally { setReading(false) }
              }} />
            </label>
            <div className="space-y-3 border-t border-border pt-3">
              {(['data', 'font'] as const).map((kind) => <div key={kind} className="space-y-2 text-sm">
                <label className="block space-y-2"><span>{t(kind === 'data' ? 'rStudio.dataFiles' : 'rStudio.fontFiles')}</span>
                  <input data-r-assets={kind} type="file" multiple accept={kind === 'data' ? '.csv,.tsv,.rds' : '.ttf,.otf'} disabled={busy || reading} className="block w-full text-sm" onChange={(e) => {
                    const files = Array.from(e.target.files ?? []); e.target.value = ''; void importFiles(files, kind)
                  }} />
                </label>
                <p className="text-xs text-ink-3">{t(kind === 'data' ? 'rStudio.dataHint' : 'rStudio.fontImportHint')}</p>
                {(kind === 'data' ? data : fonts).map((file) => <div data-r-asset={file.name} key={file.name} className="r-asset space-y-1">
                  <div className="flex items-center justify-between gap-2"><span className="break-all">{file.name}</span>
                    <Button disabled={busy || reading} aria-label={t('rStudio.removeFile', { name: file.name })} onClick={() => {
                      if (kind === 'data') setData(data.filter((f) => f !== file)); else setFonts(fonts.filter((f) => f !== file))
                    }}>{t('rStudio.remove')}</Button>
                  </div>
                  {kind === 'data' && <code className="block break-all text-xs">{readSnippet(file.name)}</code>}
                </div>)}
              </div>)}
              <p className="text-xs text-ink-3">{t('rStudio.sessionFiles')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button data-r-run variant="primary" disabled={busy || reading || !source.trim()} onClick={() => void run()}>{t('rStudio.run')}</Button>
              {busy && <Button data-r-cancel onClick={cancel}>{t('rStudio.cancel')}</Button>}
              <Button disabled={busy || reading} onClick={() => setSource(example)}>{t('rStudio.example')}</Button>
            </div>
            <p data-r-status className="text-sm text-ink-3">{t(`rStudio.${phase}`)}</p>
            {loadedSource && (source !== loadedSource || assetsKey !== loadedAssets) && <p className="text-sm text-ink-2">{t('rStudio.changed')}</p>}
            <LoadFeedback phase={phase} busy={busy} error={error} retry={() => void run()} />
            {error && <pre data-r-error role="alert" className="whitespace-pre-wrap break-words text-sm text-danger">{error}</pre>}
            <fieldset disabled={!active} className="space-y-3 border-t border-border pt-4">
              <legend className="text-sm font-medium">{t('rStudio.style')}</legend>
              {(['title', 'x', 'y'] as const).map((key) => (
                <label key={key} className="block space-y-1 text-sm">
                  <span>{t(`rStudio.${key === 'title' ? 'plotTitle' : key}`)}</span>
                  <TextInput data-r-label={key} key={`${key}:${style[key]}`} defaultValue={style[key] ?? ''} placeholder={t('rStudio.keepOriginal')} onBlur={(e) => {
                    const value = e.target.value
                    if (value !== (style[key] ?? '')) {
                      const textEdits = { ...style.textEdits }
                      for (const object of objects.filter((o) => o.role === key)) {
                        const patch = { ...textEdits[object.id] }; delete patch.text
                        if (Object.keys(patch).length) textEdits[object.id] = patch; else delete textEdits[object.id]
                      }
                      void apply({ ...style, [key]: value, textEdits })
                    }
                  }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
                </label>
              ))}
              <Select ariaLabel={t('rStudio.theme')} disabled={!active} value={style.theme} onChange={(theme) => void apply({ ...style, theme })} options={(['original', 'minimal', 'classic', 'bw'] as const).map((value) => ({ value, label: t(`rStudio.${value}`) }))} />
              <div data-r-legend className="space-y-1 text-sm">
                <span>{t('rStudio.legend')}</span>
                <Select ariaLabel={t('rStudio.legend')} disabled={!active} value={style.legend} onChange={(legend) => void apply({ ...style, legend })} options={LEGEND_POSITIONS.map((value) => ({ value, label: value === 'original' ? t('rStudio.keepStyle') : t(`rStudio.${value}`) }))} />
              </div>
              <div data-r-font className="space-y-1 text-sm">
                <span>{t('rStudio.fontFamily')}</span>
                <Select ariaLabel={t('rStudio.fontFamily')} disabled={!active} value={style.fontFamily} onChange={(fontFamily) => void apply({ ...style, fontFamily })} options={families.map((value) => ({ value, label: value === 'original' ? t('rStudio.keepStyle') : ['sans', 'serif', 'mono', 'wqy-microhei'].includes(value) ? t(`rStudio.${value as 'sans' | 'serif' | 'mono' | 'wqy-microhei'}`) : value }))} />
                <p className="text-xs text-ink-3">{t('rStudio.fontHint')}</p>
              </div>
              {(['fontSize', 'width', 'height'] as const).map((key) => (
                <label key={key} className="flex items-center justify-between gap-4 text-sm">
                  <span>{t(`rStudio.${key}`)}</span>
                  <TextInput data-r-number={key} key={`${key}:${style[key]}`} type="number" className="max-w-32" defaultValue={style[key] ?? ''} placeholder={t('rStudio.keepStyle')} min={key === 'fontSize' ? 6 : 1} max={key === 'fontSize' ? 48 : 20} step="1" onBlur={(e) => {
                    const value = e.target.value === '' && key === 'fontSize' ? null : Number(e.target.value)
                    if (value !== null && (!Number.isFinite(value) || value < (key === 'fontSize' ? 6 : 1) || value > (key === 'fontSize' ? 48 : 20))) {
                      e.target.value = String(style[key] ?? '')
                      return
                    }
                    if (value !== style[key]) void apply({ ...style, [key]: value })
                  }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
                </label>
              ))}
              <div className="flex gap-2">
                <Button data-r-undo disabled={!active || !history.length} onClick={() => void apply(history[history.length - 1], 'undo')}>{t('rStudio.undo')}</Button>
                <Button data-r-redo disabled={!active || !future.length} onClick={() => void apply(future[future.length - 1], 'redo')}>{t('rStudio.redo')}</Button>
                <Button data-r-reset disabled={!active} onClick={() => void apply({ ...DEFAULT_STYLE })}>{t('rStudio.reset')}</Button>
              </div>
            </fieldset>
          </section>
          <section className="r-studio-output min-w-0 space-y-4">
            <ExportWidth width={pngWidth} change={setPngWidth} disabled={busy || reading} />
            <div className="flex flex-wrap gap-2">
              <Button data-r-png disabled={!active || !preview} onClick={() => void exportPdf('png')}>{t('rStudio.png')}</Button>
              <Button data-r-pdf disabled={!active} onClick={() => void exportPdf()}>{t('rStudio.pdf')}</Button>
              <Button data-r-export disabled={!active} onClick={() => download(new Blob([exportR(loadedSource, style, client.current!.fonts)], { type: 'text/plain;charset=utf-8' }), 'figure-styled.R')}>{t('rStudio.exportR')}</Button>
            </div>
            <p className="text-sm text-ink-2">{t('rStudio.dragHint')}</p>
            <div className="flex flex-wrap gap-2">
              <Button data-r-reset-selected disabled={!active || !style.moves[selected]} onClick={() => {
                const moves = { ...style.moves }; delete moves[selected]
                void apply({ ...style, moves })
              }}>{t('rStudio.resetSelected')}</Button>
              <Button data-r-reset-moves disabled={!active || !Object.keys(style.moves).length} onClick={() => void apply({ ...style, moves: {} })}>{t('rStudio.resetMoves')}</Button>
            </div>
            {!!unmatched && <p data-r-unmatched role="status" className="text-sm text-ink-2">{t('rStudio.unmatched', { count: unmatched })}</p>}
            <p className="text-xs text-ink-3">{t('rStudio.pdfFontHint')}</p>
            {(data.length > 0 || fonts.length > 0) && <p className="text-xs text-ink-3">{t('rStudio.companionFiles')}</p>}
            {fontWarnings.length > 0 && <Details data-r-font-warnings className="text-sm text-ink-2"><Summary>{t('rStudio.fontWarnings', { count: fontWarnings.length })}</Summary>
              <ul>{fontWarnings.map((o) => <li key={o.id}>{o.text}: {o.font!.requested} → {o.font!.actual}{o.font!.missing ? ` · ${t('rStudio.missingGlyphs', { chars: o.font!.missing })}` : ''}{!o.font!.checked ? ` · ${t('rStudio.mathFontUnchecked')}` : ''}</li>)}</ul>
            </Details>}
            {objects.length > 0 && <div data-r-object-picker><Select ariaLabel={t('rStudio.selectObject')} placeholder={t('rStudio.selectObject')} value={selected} disabled={!active} onChange={setSelected} options={[
              ...objects.filter((o) => o.kind === 'text' || o.kind === 'legend').map((o) => ({ value: o.id, label: o.kind === 'legend' ? t('rStudio.legend') : o.text || t('rStudio.emptyText') })),
            ]} /></div>}
            <div className="r-studio-preview flex min-h-[350px] items-center justify-center rounded-md border border-border bg-surface p-4">
              {previewUrl ? <div className="r-drag-frame"><img data-r-preview src={previewUrl} alt={t('rStudio.preview')} className="h-auto max-w-full" /><DragOverlay objects={objects} selected={selected} select={setSelected} disabled={!active} move={(id, dx, dy) => {
                const previous = style.moves[id] ?? [0, 0]
                void apply({ ...style, moves: { ...style.moves, [id]: [previous[0] + dx, previous[1] + dy] } })
              }} /></div> : <p className="text-sm text-ink-3">{t('rStudio.empty')}</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
