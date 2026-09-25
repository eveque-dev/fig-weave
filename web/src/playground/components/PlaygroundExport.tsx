import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Download, LoaderCircle } from '@/components/ui/icons'
import { ICON_SIZE } from '@/components/ui/Icon'
import { finishActiveGesture } from '@/store/gestureCoordinator'
import { useDocumentStore } from '@/store/documentStore'
import type { PlaygroundClient } from '../pyodideClient'
import { pg } from '../pgText'

/** Download the engine's state-neutral high-resolution PNG, never a DOM screenshot. */
export function PlaygroundExport({ client, panelId, busy }: {
  client: PlaygroundClient
  panelId: string
  busy: boolean
}) {
  const [exporting, setExporting] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState<{ url: string; filename: string } | null>(null)
  const readyUrl = useRef<string | null>(null)
  const active = useRef<AbortController | null>(null)
  useEffect(() => {
    active.current = null
    setExporting(false)
    setFailed(false)
    setReady(null)
    return () => { active.current?.abort(); if (readyUrl.current) URL.revokeObjectURL(readyUrl.current) }
  }, [client, panelId])

  const download = async () => {
    if (active.current || busy) return
    finishActiveGesture()
    const panel = useDocumentStore.getState().doc.objects.find((o) => o.id === panelId)
    if (!panel || panel.type !== 'panel') return
    const request = new AbortController()
    active.current = request
    setExporting(true)
    setFailed(false)
    setReady(null)
    if (readyUrl.current) URL.revokeObjectURL(readyUrl.current)
    // Snapshot after finishing the gesture: later edits cannot change this download.
    const patches = structuredClone(panel.overrides)
    const stem = panel.fileId.replace(/\.pdf$/, '')
    try {
      const png = await client.previewPng(stem, patches, 2400, request.signal)
      if (request.signal.aborted) return
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0))
      if (bytes.length < 8 || ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) {
        throw new Error('Invalid PNG response')
      }
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${stem.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_') || 'figure'}.png`
      readyUrl.current = url
      setReady({ url, filename: link.download })
      document.body.append(link)
      link.click()
      link.remove()
      // Retain a real download link if the browser blocks the automatic download.
    } catch {
      if (!request.signal.aborted) setFailed(true)
    } finally {
      if (active.current === request) active.current = null
      if (!request.signal.aborted) setExporting(false)
    }
  }

  return <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
    <Button variant="primary" data-playground-export disabled={busy || exporting} onClick={() => void download()}>
      {exporting ? <LoaderCircle size={ICON_SIZE.sm} aria-hidden /> : <Download size={ICON_SIZE.sm} aria-hidden />}
      {pg(exporting ? 'exportingPng' : 'exportPng')}
    </Button>
    <span className="text-xs text-ink-3">{pg('exportPngNote')}</span>
    {ready && <a data-playground-download href={ready.url} download={ready.filename} className="text-xs text-ink underline">{pg('downloadPngReady')}</a>}
    {failed && <span role="alert" className="text-xs text-danger">{pg('exportPngFailed')}</span>}
  </div>
}
