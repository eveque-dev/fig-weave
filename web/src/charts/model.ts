export type Kind = 'plotly' | 'pyecharts'
export type Chart = Record<string, unknown>
export function parseChart(raw: string, kind: Kind): Chart {
  if (raw.length > 8_000_000) throw new Error('Chart exceeds 8 MB')
  const value = JSON.parse(raw, (key, v: unknown) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid option key')
    if (typeof v === 'string' && (v.includes('--x_x--') || /^\s*function\s*\(/.test(v)))
      throw new Error('JavaScript callbacks / JsCode are not supported; use plain data options')
    return v
  })
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Array.isArray(kind === 'plotly' ? value.data : value.series)) throw new Error('Invalid chart options')
  return value
}
export function editLabels(chart: Chart, kind: Kind, labels: { title: string; x: string; y: string }): Chart {
  const next = structuredClone(chart)
  if (kind === 'plotly') {
    const layout = (next.layout ?? {}) as Chart
    for (const [key, text] of [['title', labels.title], ['xaxis', labels.x], ['yaxis', labels.y]]) {
      const original = (layout[key] ?? {}) as Chart
      layout[key] = key === 'title' ? { ...original, text } : { ...original, title: { ...((original.title ?? {}) as Chart), text } }
    }
    next.layout = layout
  } else {
    for (const [key, text] of [['title', labels.title], ['xAxis', labels.x], ['yAxis', labels.y]]) {
      const original = next[key]
      const entry = Array.isArray(original) ? original[0] : (original ?? {})
      const updated = { ...entry, [key === 'title' ? 'text' : 'name']: text }
      next[key] = Array.isArray(original) ? [updated, ...original.slice(1)] : updated
    }
  }
  return next
}
export function labelsOf(chart: Chart, kind: Kind) {
  if (kind === 'plotly') {
    const l = (chart.layout ?? {}) as Record<string, any>
    return { title: typeof l.title === 'string' ? l.title : l.title?.text ?? '', x: l.xaxis?.title?.text ?? '', y: l.yaxis?.title?.text ?? '' }
  }
  const first = (key: string): Record<string, any> => Array.isArray(chart[key]) ? chart[key][0] : chart[key] ?? {}
  return { title: first('title').text ?? '', x: first('xAxis').name ?? '', y: first('yAxis').name ?? '' }
}
export function exportPython(chart: Chart, kind: Kind): string {
  const data = JSON.stringify(JSON.stringify(chart))
  return kind === 'plotly'
    ? `import plotly.io as pio\nfig = pio.from_json(${data})\nfig.show()\n`
    : `import json\nfrom pyecharts.charts import Bar\nchart = Bar()\nchart.options = json.loads(${data})\nchart.render("figure.html")\n`
}
