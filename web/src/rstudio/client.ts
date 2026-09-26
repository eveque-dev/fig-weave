import dragSource from './drag.R?raw'
import lock from '../../../packaging/r-browser-runtime.json'

export const LEGEND_POSITIONS = ['original', 'right', 'left', 'top', 'bottom', 'bottomLeft', 'bottomRight', 'topLeft', 'topRight', 'none'] as const
export const FONT_FAMILIES = ['original', 'sans', 'serif', 'mono'] as const

export interface PlotStyle {
  moves: Record<string, [number, number]>
  title: string | null
  x: string | null
  y: string | null
  theme: 'original' | 'minimal' | 'classic' | 'bw'
  fontSize: number | null
  fontFamily: typeof FONT_FAMILIES[number]
  legend: typeof LEGEND_POSITIONS[number]
  width: number
  height: number
}
export const DEFAULT_STYLE: PlotStyle = {
  moves: {}, title: null, x: null, y: null, theme: 'original', fontSize: null,
  fontFamily: 'original', legend: 'original', width: 7, height: 5,
}

/** A closed set of styling operations, shared by preview and exported R code. */
export function styleExpression(s: PlotStyle, plot = 'p'): string {
  if (![s.width, s.height].every((n) => Number.isFinite(n) && n >= 1 && n <= 20)
    || (s.fontSize !== null && (!Number.isFinite(s.fontSize) || s.fontSize < 6 || s.fontSize > 48)))
    throw new Error('Invalid plot dimensions or font size')
  if (!['original', 'minimal', 'classic', 'bw'].includes(s.theme)
    || !LEGEND_POSITIONS.includes(s.legend) || !FONT_FAMILIES.includes(s.fontFamily)) throw new Error('Invalid plot style')
  const labels = (['title', 'x', 'y'] as const)
    .filter((k) => s[k] !== null).map((k) => `${k} = ${JSON.stringify(s[k])}`)
  const text = [
    ...(s.fontSize === null ? [] : [`size = ${s.fontSize}`]),
    ...(s.fontFamily === 'original' ? [] : [`family = ${JSON.stringify(s.fontFamily)}`]),
  ]
  const theme = text.length ? [`text = ggplot2::element_text(${text.join(', ')})`] : []
  const corners: Record<string, [number, number]> = {
    bottomLeft: [.03, .03], bottomRight: [.97, .03], topLeft: [.03, .97], topRight: [.97, .97],
  }
  if (corners[s.legend]) {
    const [x, y] = corners[s.legend]
    theme.push('legend.position = "inside"', `legend.position.inside = c(${x}, ${y})`,
      `legend.justification.inside = c(${x < .5 ? 0 : 1}, ${y < .5 ? 0 : 1})`)
  } else if (s.legend !== 'original') theme.push(`legend.position = ${JSON.stringify(s.legend)}`)
  return plot
    + (s.theme === 'original' ? '' : ` + ggplot2::theme_${s.theme}()`)
    + (labels.length ? ` + ggplot2::labs(${labels.join(', ')})` : '')
    + (theme.length ? ` + ggplot2::theme(${theme.join(', ')})` : '')
}

export interface RObject { id: string; kind: 'text' | 'legend' | 'point' | 'curve'; coords: number[]; breaks: number[] }
export function movesExpression(moves: PlotStyle['moves']): string {
  return 'list(' + Object.entries(moves).map(([key, xy]) => {
    if (!/^(?:\d+|legend):\d+$/.test(key) || xy.length !== 2 || !xy.every((v) => Number.isFinite(v) && Math.abs(v) <= 2)) throw new Error('Invalid visual offset')
    return `${JSON.stringify(key)} = c(${xy.join(',')})`
  }).join(',') + ')'
}
export function exportR(source: string, style: PlotStyle): string {
  // Replay on the active device, just like preview. Recording on a temporary PDF
  // here switches font metrics and interferes with webR's canvas capture device.
  // The PDF download uses figweave_scene separately to guarantee one final page.
  return `${source}\n\n${dragSource}\nfigweave_plot <- ${styleExpression(style)}\n# For file output, open a device at width = ${style.width}, height = ${style.height} inches.\nfigweave_draw(figweave_plot, ${movesExpression(style.moves)}, ${style.width}, ${style.height})\nfigweave_result <- grid::grid.grab()\n`
}
interface Shelter {
  captureR(code: string, opts: object): Promise<{ images: ImageBitmap[]; output: { type: string; data: string }[] }>
  purge(): Promise<void>
}
interface WebR {
  init(): Promise<void>
  close(): void
  installPackages(packages: string[]): Promise<void>
  evalRVoid(code: string): Promise<void>
  evalRString(code: string): Promise<string>
  FS: { readFile(path: string): Promise<Uint8Array> }
  Shelter: new () => Promise<Shelter>
}

/** Each source gets its own R worker. Closing also invalidates all pending work. */
export class RPlotClient {
  objects: RObject[] = []
  private runtime: WebR | null = null
  private closed = false
  private stop: (() => void) | null = null

  get isClosed() { return this.closed }

  close() {
    this.closed = true
    this.runtime?.close()
    this.runtime = null
    this.stop?.()
  }

  private async bounded<T>(work: () => Promise<T>, ms: number): Promise<T> {
    if (this.closed) throw new Error('R session closed')
    let timer: ReturnType<typeof setTimeout> | undefined
    const stopped = new Promise<never>((_, reject) => {
      this.stop = () => reject(new Error('R session cancelled or timed out'))
      timer = setTimeout(() => this.close(), ms)
    })
    try { return await Promise.race([work(), stopped]) }
    finally { clearTimeout(timer); this.stop = null }
  }

  async load(source: string, phase: (key: 'loadingRuntime' | 'loadingPackages' | 'running') => void) {
    if (new TextEncoder().encode(source).length > 256 * 1024) throw new Error('R source exceeds 256 KiB')
    const version = await this.bounded(async () => {
      phase('loadingRuntime')
      const mod = await import(/* @vite-ignore */ `${lock.base_url}webr.mjs`) as {
        WebR: new (options: object) => WebR
        ChannelType: { PostMessage: number }
      }
      if (this.closed) throw new Error('R session closed')
      this.runtime = new mod.WebR({ baseUrl: lock.base_url, repoUrl: new URL('../packages/', import.meta.url).href, channelType: mod.ChannelType.PostMessage })
      await this.runtime.init()
      phase('loadingPackages')
      await this.runtime.installPackages(['ggplot2'])
      const version = await this.runtime.evalRString('as.character(utils::packageVersion("ggplot2"))')
      if (version !== lock.ggplot2_version) throw new Error(`ggplot2 version mismatch: ${version}`)
      await this.runtime.evalRVoid(dragSource)
      return version
    }, 240_000)
    phase('running')
    await this.bounded(async () => {
      await this.runtime!.evalRVoid(`local({
        env <- new.env(parent = globalenv())
        eval(parse(text = ${JSON.stringify(source)}), envir = env)
        if (!exists("p", envir = env, inherits = FALSE) || !inherits(env$p, "ggplot"))
          stop("Assign the ggplot2 plot to an object named p")
        assign(".fw_original", env$p, envir = globalenv())
      })`)
    }, 30_000)
    return version
  }

  async render(style: PlotStyle): Promise<Blob> {
    return this.bounded(async () => {
      const r = this.runtime!
      await r.evalRVoid(`.fw_plot <- ${styleExpression(style, '.fw_original')}`)
      const shelter = await new r.Shelter()
      let images: ImageBitmap[] = []
      try {
        const result = await shelter.captureR(`figweave_draw(.fw_plot, ${movesExpression(style.moves)}, ${style.width}, ${style.height}, TRUE)`, {
          captureGraphics: { width: style.width * 72, height: style.height * 72 },
          captureConditions: false,
          withAutoprint: false,
          captureStreams: true,
        })
        const geometry = await r.evalRString('.fw_geometry')
        this.objects = geometry ? geometry.split('\n').map((row) => {
          const [id, kind, coords, breaks] = row.split('\t')
          return { id, kind: kind as RObject['kind'], coords: coords.split(/[;,]/).map(Number), breaks: breaks ? breaks.split(',').map(Number) : [] }
        }) : []
        images = result.images
        if (!images.length) throw new Error(result.output.map((x) => x.data).join('\n') || 'No plot produced')
        const image = images[images.length - 1]
        const canvas = document.createElement('canvas')
        canvas.width = image.width; canvas.height = image.height
        canvas.getContext('2d')!.drawImage(image, 0, 0)
        return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'))
      } finally { images.forEach((img) => img.close()); await shelter.purge() }
    }, 30_000)
  }

  async pdf(style: PlotStyle): Promise<Blob> {
    return this.bounded(async () => {
      const r = this.runtime!
      await r.evalRVoid(`ggplot2::ggsave("/tmp/figweave.pdf", plot = figweave_scene(${styleExpression(style, '.fw_original')}, ${movesExpression(style.moves)}, ${style.width}, ${style.height}), device = "pdf", width = ${style.width}, height = ${style.height}, units = "in")`)
      const bytes = await r.FS.readFile('/tmp/figweave.pdf')
      return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
    }, 30_000)
  }
}
