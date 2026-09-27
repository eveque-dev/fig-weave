import dragSource from './drag.R?raw'
import fontSource from './fonts.R?raw'
import { validateAssets, type RAsset } from './assets'
import { fontCoverage } from './fontCoverage'
import { coerceTypography } from '@/lib/typography'
import lock from '../../../packaging/r-browser-runtime.json'

export const LEGEND_POSITIONS = ['original', 'right', 'left', 'top', 'bottom', 'bottomLeft', 'bottomRight', 'topLeft', 'topRight', 'none'] as const
export const FONT_FAMILIES = ['original', 'sans', 'serif', 'mono', 'wqy-microhei'] as const

export interface PlotStyle {
  moves: Record<string, [number, number]>
  textEdits: Record<string, TextEdit>
  title: string | null
  x: string | null
  y: string | null
  theme: 'original' | 'minimal' | 'classic' | 'bw'
  fontSize: number | null
  fontFamily: string
  legend: typeof LEGEND_POSITIONS[number]
  width: number
  height: number
}
export const DEFAULT_STYLE: PlotStyle = {
  moves: {}, textEdits: {}, title: null, x: null, y: null, theme: 'original', fontSize: null,
  fontFamily: 'original', legend: 'original', width: 7, height: 5,
}

/** A closed set of styling operations, shared by preview and exported R code. */
export function styleExpression(s: PlotStyle, plot = 'p', families: readonly string[] = FONT_FAMILIES): string {
  if (![s.width, s.height].every((n) => Number.isFinite(n) && n >= 1 && n <= 20)
    || (s.fontSize !== null && (!Number.isFinite(s.fontSize) || s.fontSize < 6 || s.fontSize > 48)))
    throw new Error('Invalid plot dimensions or font size')
  if (!['original', 'minimal', 'classic', 'bw'].includes(s.theme)
    || !LEGEND_POSITIONS.includes(s.legend) || !families.includes(s.fontFamily)) throw new Error('Invalid plot style')
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

export interface TextEdit { text?: string; sizePt?: number; fontFamily?: string; color?: string }
export interface RObject {
  id: string; role?: 'title' | 'x' | 'y' | ''; kind: 'text' | 'legend' | 'point' | 'curve'; coords: number[]; breaks: number[]
  text?: string; editable?: boolean; typography?: Required<Omit<TextEdit, 'text'>>
  font?: { requested: string; actual: string; missing: string; checked: boolean }
}
const validId = (key: string) => key.length <= 2048 && /^[a-zA-Z0-9_:%./-]+$/.test(key)
export function movesExpression(moves: PlotStyle['moves']): string {
  return 'list(' + Object.entries(moves).map(([key, xy]) => {
    if (!validId(key) || xy.length !== 2 || !xy.every((v) => Number.isFinite(v) && Math.abs(v) <= 2)) throw new Error('Invalid visual offset')
    return `${JSON.stringify(key)} = c(${xy.join(',')})`
  }).join(',') + ')'
}
export function textExpression(edits: PlotStyle['textEdits'], families: readonly string[] = FONT_FAMILIES): string {
  for (const [id, edit] of Object.entries(edits)) {
    if (!validId(id)) throw new Error('Invalid text identity')
    for (const [key, value] of Object.entries(edit)) {
      if (key === 'text') {
        if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid text')
      } else if (!['sizePt', 'fontFamily', 'color'].includes(key)
        || !coerceTypography(key as 'sizePt' | 'fontFamily' | 'color', value, { min: 6, max: 72, options: families.filter((f) => f !== 'original') }).ok) throw new Error('Invalid typography')
    }
  }
  return `jsonlite::fromJSON(${JSON.stringify(JSON.stringify(edits))}, simplifyVector = FALSE)`
}
export interface FontEnvironment {
  imported: { name: string; family: string }[]
  coverage: Record<string, [number, number][][]>
}
const fontSetup = (fonts: FontEnvironment) => `${fontSource}\nfigweave_font_files(jsonlite::fromJSON(${JSON.stringify(JSON.stringify(fonts.imported))}, simplifyVector = FALSE))\n.fw_font_coverage <- jsonlite::fromJSON(${JSON.stringify(JSON.stringify(fonts.coverage))}, simplifyVector = FALSE)\n`
export function exportR(source: string, style: PlotStyle, fonts: FontEnvironment): string {
  const families = [...FONT_FAMILIES, ...fonts.imported.map((f) => f.family)]
  return `# Keep imported data and font files beside this script; run from that folder.\n${fontSetup(fonts)}\n${source}\n\n${dragSource}\nfigweave_plot <- ${styleExpression(style, 'p', families)}\nfigweave_result <- figweave_scene(figweave_plot, ${movesExpression(style.moves)}, ${style.width}, ${style.height}, FALSE, ${textExpression(style.textEdits, families)})\nfigweave_write_pdf(figweave_result, "figure-styled.pdf", ${style.width}, ${style.height})\n`
}
interface WebR {
  init(): Promise<void>
  close(): void
  installPackages(packages: string[]): Promise<void>
  evalRVoid(code: string): Promise<void>
  evalRString(code: string): Promise<string>
  FS: { readFile(path: string): Promise<Uint8Array>; writeFile(path: string, bytes: Uint8Array): Promise<void> }
}

/** Each source gets its own R worker. Closing also invalidates all pending work. */
export class RPlotClient {
  objects: RObject[] = []
  fonts: FontEnvironment = { imported: [], coverage: {} }
  private pdfBytes: Uint8Array | null = null
  private renderedStyle = ''
  get families(): string[] { return [...FONT_FAMILIES, ...this.fonts.imported.map((f) => f.family)] }
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

  async load(source: string, phase: (key: 'loadingRuntime' | 'loadingPackages' | 'running') => void, data: RAsset[] = [], fonts: RAsset[] = []) {
    validateAssets(data, 'data'); validateAssets(fonts, 'font')
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
      await this.runtime.installPackages(['ggplot2', 'showtext', 'jsonlite'])
      const version = await this.runtime.evalRString('as.character(utils::packageVersion("ggplot2"))')
      if (version !== lock.ggplot2_version) throw new Error(`ggplot2 version mismatch: ${version}`)
      const r = this.runtime
      await r.evalRVoid('dir.create("/workspace", showWarnings = FALSE); setwd("/workspace")')
      for (const file of [...data, ...fonts]) await r.FS.writeFile(`/workspace/${file.name}`, new Uint8Array(file.bytes))
      this.fonts.imported = fonts.map((file) => ({ name: file.name, family: file.family! }))
      await r.evalRVoid(fontSource)
      const files = JSON.parse(await r.evalRString(`as.character(jsonlite::toJSON(figweave_font_files(jsonlite::fromJSON(${JSON.stringify(JSON.stringify(this.fonts.imported))}, simplifyVector = FALSE)), auto_unbox = TRUE))`)) as Record<string, string[]>
      const cache = new Map<string, [number, number][]>()
      for (const [family, paths] of Object.entries(files)) {
        this.fonts.coverage[family] = []
        for (const path of paths) {
          if (!cache.has(path)) cache.set(path, fontCoverage(await r.FS.readFile(path)))
          this.fonts.coverage[family].push(cache.get(path)!)
        }
      }
      await r.evalRVoid(`.fw_font_coverage <- jsonlite::fromJSON(${JSON.stringify(JSON.stringify(this.fonts.coverage))}, simplifyVector = FALSE)`)
      await r.evalRVoid(dragSource)
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
      await r.evalRVoid(`.fw_plot <- ${styleExpression(style, '.fw_original', this.families)}
        .fw_scene <- figweave_scene(.fw_plot, ${movesExpression(style.moves)}, ${style.width}, ${style.height}, TRUE, ${textExpression(style.textEdits, this.families)})
        figweave_write_pdf(.fw_scene, "/tmp/figweave.pdf", ${style.width}, ${style.height})`)
      const objects = JSON.parse(await r.evalRString('.fw_geometry')) as RObject[]
      const bytes = await r.FS.readFile('/tmp/figweave.pdf')
      const { pdfPreview } = await import('./pdfPreview')
      const preview = await pdfPreview(bytes)
      if (this.closed) throw new Error('R session closed')
      this.objects = objects; this.pdfBytes = bytes; this.renderedStyle = JSON.stringify(style)
      return preview
    }, 30_000)
  }

  async pdf(style: PlotStyle): Promise<Blob> {
    if (this.closed || !this.pdfBytes || this.renderedStyle !== JSON.stringify(style)) throw new Error('Render this style before exporting')
    return new Blob([new Uint8Array(this.pdfBytes)], { type: 'application/pdf' })
  }
}
