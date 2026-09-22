/// <reference lib="webworker" />
import runtime from '../../../packaging/playground-runtime.json'
import wheels from '../../../packaging/chart-wheels.json'
import { sha256 } from '@noble/hashes/sha2.js'

self.onmessage = async (event: MessageEvent<{ source: string; kind: 'plotly' | 'pyecharts'; wheels: string }>) => {
  const post = (value: object) => self.postMessage(value)
  try {
    const { source, kind } = event.data
    post({ phase: 'loadingRuntime' })
    const { loadPyodide } = await import(/* @vite-ignore */ `${runtime.cdn_base}pyodide.mjs`)
    const py = await loadPyodide({ indexURL: runtime.cdn_base, jsglobals: Object.create(null) })
    post({ phase: 'loadingPackages' })
    const imports: string[] = JSON.parse(py.runPython(`
import ast, json
_tree = ast.parse(${JSON.stringify(source)})
_imports = []
for _node in ast.walk(_tree):
    if isinstance(_node, ast.Import):
        _imports.extend(item.name for item in _node.names)
    elif isinstance(_node, ast.ImportFrom):
        _imports.extend((_node.module or "") + "." + item.name for item in _node.names)
json.dumps(_imports)
`))
    const packages = kind === 'plotly' ? ['narwhals', 'packaging'] : ['jinja2', 'simplejson', 'wcwidth']
    if (imports.some((name) => /^(numpy|pandas)(\.|$)|^plotly\.express(\.|$)/.test(name))) packages.push('numpy')
    if (imports.some((name) => /^pandas(\.|$)|^plotly\.express(\.|$)/.test(name))) packages.push('pandas')
    await py.loadPackage(packages)
    for (const name of kind === 'plotly' ? ['plotly'] as const : ['prettytable', 'pyecharts'] as const) {
      const wheel = wheels[name]
      const filename = 'browser_filename' in wheel ? wheel.browser_filename : wheel.filename
      const expectedHash = 'browser_sha256' in wheel ? wheel.browser_sha256 : wheel.sha256
      const response = await fetch(new URL(filename, event.data.wheels))
      if (!response.ok) throw new Error(`Package download: ${response.status}`)
      const data = new Uint8Array(await response.arrayBuffer())
      const hash = Array.from(sha256(data), (b) => b.toString(16).padStart(2, '0')).join('')
      if (hash !== expectedHash) throw new Error(`Package checksum mismatch: ${name}`)
      py.unpackArchive(data, 'zip', { extractDir: '/chart-packages' })
    }
    py.runPython('import sys\nsys.path.insert(0, "/chart-packages")')
    post({ phase: 'running' })
    const result = py.runPython(`
import json
_chart_env = {"__name__": "__main__"}
if ${JSON.stringify(kind)} == "plotly":
    from plotly.basedatatypes import BaseFigure
    BaseFigure.show = lambda self, *args, **kwargs: None
else:
    from pyecharts.charts.base import Base
    Base.render = lambda self, *args, **kwargs: None
exec(compile(${JSON.stringify(source)}, "figure.py", "exec"), _chart_env)
if ${JSON.stringify(kind)} == "plotly":
    _chart = _chart_env.get("fig")
    if not isinstance(_chart, BaseFigure):
        raise ValueError("Assign your Plotly figure to fig")
    _chart_json = _chart.to_json()
else:
    _chart = _chart_env.get("chart")
    if not isinstance(_chart, Base):
        raise ValueError("Assign your pyecharts chart to chart")
    _chart_json = _chart.dump_options_with_quotes()
_chart_json
`)
    if (typeof result !== 'string' || result.length > 8_000_000) throw new Error('Chart exceeds 8 MB')
    post({ result: JSON.parse(result) })
  } catch (error) { post({ error: String(error) }) }
}
