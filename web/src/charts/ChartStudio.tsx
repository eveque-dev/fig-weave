import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { BackgroundPicker } from '@/components/ui/BackgroundPicker'
import { TextArea, TextInput } from '@/components/ui/Input'
import { Details, Summary } from '@/components/ui/Details'
import { Select } from '@/components/ui/Select'
import { currentLocale } from '@/i18n'
import { PRODUCT_NAME, playgroundHomeHref } from '@/lib/brand'
import { createRenderer, type Renderer } from './renderer'
import { editLabels, exportPython, labelsOf, parseChart, type Chart, type Kind } from './model'
import plotlyExample from './plotly-example.py?raw'
import pyechartsExample from './pyecharts-example.py?raw'
import '../rstudio/studio.css'

const examples = { plotly: plotlyExample, pyecharts: pyechartsExample }
const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
export function ChartStudio() {
  const { t } = useTranslation('dialogs')
  const [kind, setKind] = useState<Kind>('plotly')
  const [source, setSource] = useState(examples.plotly)
  const [chart, setChart] = useState<Chart | null>(null)
  const state = useRef<Chart | null>(null)
  const [history, setHistory] = useState<Chart[]>([])
  const [future, setFuture] = useState<Chart[]>([])
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loadingRuntime' | 'loadingPackages' | 'running' | 'ready'>('idle')
  const [error, setError] = useState('')
  const [options, setOptions] = useState('')
  const [labels, setLabels] = useState({ title: '', x: '', y: '' })
  const canvas = useRef<HTMLDivElement>(null)
  const renderer = useRef<Renderer | null>(null)
  const worker = useRef<Worker | null>(null)
  const generation = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => { generation.current++; clearTimeout(timer.current); worker.current?.terminate(); renderer.current?.close() }, [])
  useEffect(() => { document.title = `${PRODUCT_NAME} · ${t('charts.title')}` }, [t])
  const store = (next: Chart | null) => {
    state.current = next; setChart(next)
    setOptions(next ? JSON.stringify(next, null, 2) : '')
    setLabels(next ? labelsOf(next, kind) : { title: '', x: '', y: '' })
  }
  const cancel = () => {
    generation.current++; clearTimeout(timer.current); worker.current?.terminate(); worker.current = null
    setBusy(false); setPhase(state.current ? 'ready' : 'idle')
  }
  const apply = async (next: Chart, direction: 'edit' | 'undo' | 'redo' = 'edit') => {
    if (!renderer.current || busy || !state.current) return
    const previous = state.current
    setBusy(true); setError('')
    try {
      await renderer.current.draw(next)
      if (direction === 'undo') { setHistory(history.slice(0, -1)); setFuture([...future, previous]) }
      else if (direction === 'redo') { setFuture(future.slice(0, -1)); setHistory([...history, previous]) }
      else { setHistory([...history, previous].slice(-50)); setFuture([]) }
      store(next)
    } catch (e) {
      setError(String(e)); await renderer.current.draw(previous).catch(() => {})
    } finally { setBusy(false) }
  }
  const run = () => {
    cancel()
    const id = generation.current
    if (new TextEncoder().encode(source).length > 256 * 1024) { setError(t('rStudio.tooLarge')); return }
    renderer.current?.close(); renderer.current = null; store(null); setHistory([]); setFuture([])
    setBusy(true); setError(''); setPhase('loadingRuntime')
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }); worker.current = w
    const fail = (message: string) => { if (id === generation.current) { cancel(); setError(message) } }
    const deadline = (ms: number) => { clearTimeout(timer.current); timer.current = setTimeout(() => fail(t('charts.timeout')), ms) }
    deadline(360_000)
    w.onerror = (e) => fail(e.message)
    w.onmessage = async (event) => {
      if (id !== generation.current) return
      if (event.data.phase) {
        setPhase(event.data.phase)
        if (event.data.phase === 'running') deadline(30_000)
        return
      }
      clearTimeout(timer.current); w.terminate(); worker.current = null
      if (event.data.error) { fail(event.data.error); return }
      try {
        const next = parseChart(JSON.stringify(event.data.result), kind)
        const r = await createRenderer(canvas.current!, kind, (edited) => {
          if (id !== generation.current || !state.current) return
          setHistory((h) => [...h, state.current!].slice(-50)); setFuture([]); store(edited)
        })
        if (id !== generation.current) { r.close(); return }
        renderer.current = r
        await r.draw(next)
        if (id !== generation.current) return
        store(next); setBusy(false); setPhase('ready')
      } catch (e) { fail(String(e)) }
    }
    w.postMessage({ source, kind, wheels: new URL('./wheels/', location.href).href })
  }
  return <div className="r-studio min-h-screen bg-bg text-ink">
    <header className="r-studio-header flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
      <a href={playgroundHomeHref(currentLocale())}>{PRODUCT_NAME}</a><h1 className="text-lg">{t('charts.title')}</h1><BackgroundPicker />
    </header>
    <main className="r-studio-main mx-auto max-w-[1400px] space-y-5 p-6">
      <p className="text-sm leading-relaxed text-ink-2">{t('charts.scope')}</p>
      <div className="r-studio-layout grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <section className="r-studio-controls space-y-4">
          <div data-chart-kind><Select ariaLabel={t('charts.library')} value={kind} disabled={busy} options={[{ value: 'plotly', label: 'Plotly' }, { value: 'pyecharts', label: 'pyecharts' }]} onChange={(value) => { cancel(); renderer.current?.close(); renderer.current = null; setKind(value); setSource(examples[value]); store(null); setHistory([]); setFuture([]); setPhase('idle') }} /></div>
          <label className="block space-y-2 text-sm"><span>{t('rStudio.source')}</span><TextArea data-chart-source aria-label={t('rStudio.source')} className="min-h-[300px] font-mono text-sm" value={source} disabled={busy} onChange={(e) => setSource(e.target.value)} /></label>
          <label className="block text-sm">{t('charts.upload')}<input data-chart-upload type="file" accept=".py" disabled={busy} className="mt-2 block w-full" onChange={async (e) => { const f = e.target.files?.[0]; if (f && f.size <= 256 * 1024) setSource(await f.text()); else if (f) setError(t('rStudio.tooLarge')) }} /></label>
          <div className="flex gap-2"><Button data-chart-run variant="primary" disabled={busy || !source.trim()} onClick={run}>{t('rStudio.run')}</Button>{busy && <Button data-chart-cancel onClick={cancel}>{t('rStudio.cancel')}</Button>}</div>
          <p data-chart-status className="text-sm text-ink-3">{t(`rStudio.${phase}`)}</p>
          {error && <pre data-chart-error role="alert" className="whitespace-pre-wrap break-words text-sm text-danger">{error}</pre>}
          <fieldset disabled={!chart || busy} className="space-y-3 border-t border-border pt-4">
            <legend>{t('rStudio.style')}</legend>
            {(['title', 'x', 'y'] as const).map((key) => <label className="block space-y-1 text-sm" key={key}><span>{t(`rStudio.${key === 'title' ? 'plotTitle' : key}`)}</span><TextInput data-chart-label={key} value={labels[key]} onChange={(e) => setLabels({ ...labels, [key]: e.target.value })} /></label>)}
            <Button data-chart-apply disabled={!chart || busy} onClick={() => { if (chart) void apply(editLabels(chart, kind, labels)) }}>{t('charts.apply')}</Button>
            <div className="flex gap-2"><Button data-chart-undo disabled={busy || !history.length} onClick={() => void apply(history.at(-1)!, 'undo')}>{t('rStudio.undo')}</Button><Button data-chart-redo disabled={busy || !future.length} onClick={() => void apply(future.at(-1)!, 'redo')}>{t('rStudio.redo')}</Button></div>
          </fieldset>
        </section>
        <section className="r-studio-output min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button data-chart-png disabled={!chart || busy} onClick={async () => { try { const url = await renderer.current!.png(); download(await (await fetch(url)).blob(), 'figure.png') } catch (e) { setError(String(e)) } }}>{t('rStudio.png')}</Button>
            <Button data-chart-python disabled={!chart || busy} onClick={() => download(new Blob([exportPython(chart!, kind)], { type: 'text/plain;charset=utf-8' }), 'figure-edited.py')}>{t('charts.exportPython')}</Button>
            <Button data-chart-json disabled={!chart || busy} onClick={() => download(new Blob([JSON.stringify(chart, null, 2)], { type: 'application/json' }), 'figure.json')}>{t('charts.exportJson')}</Button>
          </div>
          <div data-chart-preview ref={canvas} className="min-w-0 rounded-md border border-border bg-surface" style={{ height: 520 }} />
          {!chart && <p className="text-sm text-ink-3">{t('rStudio.empty')}</p>}
          <p className="text-sm text-ink-2">{t('charts.editHint')}</p>
          <Details><Summary className="cursor-pointer text-sm">{t('charts.options')}</Summary><TextArea data-chart-options aria-label={t('charts.options')} className="mt-3 min-h-[300px] font-mono text-sm" disabled={!chart || busy} value={options} onChange={(e) => setOptions(e.target.value)} /><Button disabled={!chart || busy} onClick={() => { try { void apply(parseChart(options, kind)) } catch (e) { setError(String(e)) } }}>{t('charts.apply')}</Button></Details>
        </section>
      </div>
    </main>
  </div>
}
