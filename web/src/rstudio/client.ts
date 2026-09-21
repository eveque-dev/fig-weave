import lock from '../../../packaging/r-browser-runtime.json'

export interface PlotStyle {
  title: string | null
  x: string | null
  y: string | null
  theme: 'original' | 'minimal' | 'classic' | 'bw'
  fontSize: number
  legend: 'right' | 'bottom' | 'none'
  width: number
  height: number
}
export const DEFAULT_STYLE: PlotStyle = {
  title: null, x: null, y: null, theme: 'original', fontSize: 12,
  legend: 'right', width: 7, height: 5,
}

/** A closed set of styling operations, shared by preview and exported R code. */
export function styleExpression(s: PlotStyle, plot = 'p'): string {
  if (![s.width, s.height].every((n) => Number.isFinite(n) && n >= 1 && n <= 20)
    || !Number.isFinite(s.fontSize) || s.fontSize < 6 || s.fontSize > 48)
    throw new Error('Invalid plot dimensions or font size')
  if (!['original', 'minimal', 'classic', 'bw'].includes(s.theme)
    || !['right', 'bottom', 'none'].includes(s.legend)) throw new Error('Invalid plot style')
  const labels = (['title', 'x', 'y'] as const)
    .filter((k) => s[k] !== null).map((k) => `${k} = ${JSON.stringify(s[k])}`)
  return plot
    + (s.theme === 'original' ? '' : ` + ggplot2::theme_${s.theme}()`)
    + (labels.length ? ` + ggplot2::labs(${labels.join(', ')})` : '')
    + ` + ggplot2::theme(text = ggplot2::element_text(size = ${s.fontSize}), legend.position = ${JSON.stringify(s.legend)})`
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
  private runtime: WebR | null = null
  private closed = false
  private stop: (() => void) | null = null

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
    return this.bounded(async () => {
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
      phase('running')
      await this.runtime.evalRVoid(`local({
        env <- new.env(parent = globalenv())
        eval(parse(text = ${JSON.stringify(source)}), envir = env)
        if (!exists("p", envir = env, inherits = FALSE) || !inherits(env$p, "ggplot"))
          stop("Assign the ggplot2 plot to an object named p")
        assign(".fw_original", env$p, envir = globalenv())
      })`)
      return version
    }, 240_000)
  }

  async render(style: PlotStyle): Promise<Blob> {
    return this.bounded(async () => {
      const r = this.runtime!
      await r.evalRVoid(`.fw_plot <- ${styleExpression(style, '.fw_original')}`)
      const shelter = await new r.Shelter()
      let images: ImageBitmap[] = []
      try {
        const result = await shelter.captureR('print(.fw_plot)', {
          captureGraphics: { width: style.width * 96, height: style.height * 96 },
          captureConditions: false,
          withAutoprint: false,
          captureStreams: true,
        })
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
      await r.evalRVoid(`ggplot2::ggsave("/tmp/figweave.pdf", plot = ${styleExpression(style, '.fw_original')}, device = "pdf", width = ${style.width}, height = ${style.height}, units = "in")`)
      const bytes = await r.FS.readFile('/tmp/figweave.pdf')
      return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
    }, 30_000)
  }
}
