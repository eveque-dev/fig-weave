import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url'
GlobalWorkerOptions.workerSrc = workerUrl

/** Rasterize the exact downloadable PDF; no second font/layout implementation. */
export async function pdfPreview(bytes: Uint8Array): Promise<Blob> {
  const task = getDocument({ data: new Uint8Array(bytes) })
  try {
    const pdf = await task.promise
    if (pdf.numPages !== 1) throw new Error('Expected a single final figure')
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
    await page.render({ canvas, viewport }).promise
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'))
  } finally { await task.destroy() }
}
