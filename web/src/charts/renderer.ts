import type { Data, PlotlyHTMLElement } from 'plotly.js'
import type { Chart, Kind } from './model'
import { pngSize } from '@/online/exportSize'
export interface Renderer {
  draw(chart: Chart): Promise<void>
  png(width: number): Promise<string>
  close(): void
}
export async function createRenderer(element: HTMLDivElement, kind: Kind, edited: (chart: Chart) => void): Promise<Renderer> {
  if (kind === 'plotly') {
    const Plotly = (await import('plotly.js-dist-min')).default
    let drawing = false
    let bound = false
    const observer = new ResizeObserver(() => { if (bound) void Plotly.Plots.resize(element) })
    observer.observe(element)
    return {
      async draw(chart) {
        drawing = true
        try {
          const data = structuredClone(chart)
          await Plotly.react(element, data.data as Data[], { ...data.layout as object, autosize: true }, { responsive: true, editable: true, displaylogo: false })
          if (!bound) {
            bound = true
            const gd = element as unknown as PlotlyHTMLElement
            const capture = (change: unknown) => {
              // Responsive size changes are rendering, not user edits.
              if (change && !Array.isArray(change) && typeof change === 'object'
                && Object.keys(change).every((key) => ['width', 'height', 'autosize'].includes(key))) return
              if (!drawing) edited(JSON.parse(JSON.stringify({ data: gd.data, layout: gd.layout })))
            }
            gd.on('plotly_relayout', capture)
            gd.on('plotly_restyle', capture)
          }
        } finally { drawing = false }
      },
      async png(width) {
        const layout = (element as unknown as { _fullLayout: { width: number; height: number } })._fullLayout
        drawing = true
        try { return await Plotly.toImage(element, { format: 'png', ...pngSize(width, layout.width, layout.height) }) }
        finally { drawing = false }
      },
      close() { observer.disconnect(); Plotly.purge(element) },
    }
  }
  const echarts = await import('echarts')
  const instance = echarts.init(element, undefined, { renderer: 'canvas' })
  const observer = new ResizeObserver(() => instance.resize())
  observer.observe(element)
  return {
    async draw(chart) {
      // Rich text avoids interpreting source data as HTML in tooltips.
      const tooltip = chart.tooltip
      const safeTooltip = Array.isArray(tooltip)
        ? tooltip.map((item) => ({ ...item, renderMode: 'richText' }))
        : { ...tooltip as object, renderMode: 'richText' }
      instance.setOption({ ...structuredClone(chart), tooltip: safeTooltip, animation: false }, { notMerge: true })
    },
    async png(width) { pngSize(width, instance.getWidth(), instance.getHeight()); return instance.getDataURL({ type: 'png', pixelRatio: width / instance.getWidth(), backgroundColor: '#fff' }) },
    close() { observer.disconnect(); instance.dispose() },
  }
}
