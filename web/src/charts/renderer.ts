import type { Data, PlotlyHTMLElement } from 'plotly.js'
import type { Chart, Kind } from './model'
export interface Renderer {
  draw(chart: Chart): Promise<void>
  png(): Promise<string>
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
            const capture = () => {
              if (!drawing) edited(JSON.parse(JSON.stringify({ data: gd.data, layout: gd.layout })))
            }
            gd.on('plotly_relayout', capture)
            gd.on('plotly_restyle', capture)
          }
        } finally { drawing = false }
      },
      png: () => Plotly.toImage(element, { format: 'png', width: 1200, height: 800 }),
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
    async png() { return instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' }) },
    close() { observer.disconnect(); instance.dispose() },
  }
}
